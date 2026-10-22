-- 048: governed public contact intake and atomic Admin inbox handling.
-- LOCAL ONLY. Apply after 047 on an authorized Staging project; never apply
-- directly to Production. Rollback is a forward fix that disables the public
-- contact form while preserving accepted messages and audit evidence.

alter table public.contact_messages
  add column if not exists purpose text not null default 'general',
  add column if not exists privacy_consent_at timestamptz,
  add column if not exists request_fingerprint text;

alter table public.contact_messages
  drop constraint if exists contact_messages_purpose_check;
alter table public.contact_messages
  add constraint contact_messages_purpose_check
  check (purpose in ('general', 'payment', 'technical', 'refund', 'booking', 'suggestion'));

create index if not exists contact_messages_purpose_created_idx
  on public.contact_messages (purpose, created_at desc);

-- Public clients can no longer bypass validation, rate limiting or audit by
-- inserting directly. Only the service-only function below admits messages.
drop policy if exists "contact: anyone insert" on public.contact_messages;
revoke insert on table public.contact_messages from anon, authenticated;

create table if not exists public.contact_submission_limits (
  scope text not null check (scope in ('device', 'email')),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  hits integer not null default 1 check (hits > 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_started_at)
);

alter table public.contact_submission_limits enable row level security;
revoke all on table public.contact_submission_limits from public, anon, authenticated;

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_phone text,
  p_purpose text,
  p_message text,
  p_device_fingerprint text,
  p_email_fingerprint text,
  p_privacy_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_message text := btrim(coalesce(p_message, ''));
  v_device_window timestamptz;
  v_email_window timestamptz;
  v_device_hits integer;
  v_email_hits integer;
  v_retry_after integer;
  v_subject text;
  v_message_id uuid;
begin
  if char_length(v_name) not between 2 and 120
     or char_length(v_email) not between 5 and 254
     or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or (v_phone is not null and char_length(v_phone) > 40)
     or p_purpose not in ('general', 'payment', 'technical', 'refund', 'booking', 'suggestion')
     or char_length(v_message) not between 10 and 5000
     or p_device_fingerprint !~ '^[0-9a-f]{64}$'
     or p_email_fingerprint !~ '^[0-9a-f]{64}$'
     or p_privacy_consent is not true then
    raise exception using errcode = '22023', message = 'invalid_contact_submission';
  end if;

  v_device_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / 600) * 600);
  v_email_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / 3600) * 3600);

  insert into public.contact_submission_limits (scope, key_hash, window_started_at, hits)
  values ('device', p_device_fingerprint, v_device_window, 1)
  on conflict (scope, key_hash, window_started_at)
  do update set hits = public.contact_submission_limits.hits + 1, updated_at = now()
  returning hits into v_device_hits;

  insert into public.contact_submission_limits (scope, key_hash, window_started_at, hits)
  values ('email', p_email_fingerprint, v_email_window, 1)
  on conflict (scope, key_hash, window_started_at)
  do update set hits = public.contact_submission_limits.hits + 1, updated_at = now()
  returning hits into v_email_hits;

  if v_device_hits > 5 or v_email_hits > 3 then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (
        case when v_email_hits > 3 then v_email_window + interval '1 hour'
             else v_device_window + interval '10 minutes' end
        - clock_timestamp()
      )))::integer
    );
    delete from public.contact_submission_limits where updated_at < now() - interval '2 days';
    return jsonb_build_object('accepted', false, 'reason', 'rate_limited', 'retryAfterSec', v_retry_after);
  end if;

  v_subject := case p_purpose
    when 'payment' then 'مشكلة في الدفع'
    when 'technical' then 'مشكلة تقنية'
    when 'refund' then 'طلب استرداد'
    when 'booking' then 'استفسار عن حجز'
    when 'suggestion' then 'اقتراح'
    else 'استفسار عام'
  end;

  insert into public.contact_messages (
    name, email, phone, subject, purpose, message, privacy_consent_at, request_fingerprint
  ) values (
    v_name, v_email, v_phone, v_subject, p_purpose, v_message, now(), p_device_fingerprint
  ) returning id into v_message_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (
    null,
    'contact_message.received',
    'contact_message',
    v_message_id::text,
    jsonb_build_object('purpose', p_purpose, 'source', 'public_contact_form')
  );

  delete from public.contact_submission_limits where updated_at < now() - interval '2 days';
  return jsonb_build_object('accepted', true, 'id', v_message_id);
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text, text, text, boolean) to service_role;

create or replace function public.manage_contact_message(
  p_message_id uuid,
  p_actor_id uuid,
  p_status text,
  p_priority text,
  p_assigned_to uuid,
  p_note text,
  p_spam boolean,
  p_reply text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.contact_messages%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
  v_delivery jsonb;
  v_delivery_status text := 'not_requested';
  v_final_status text := p_status;
begin
  if not public.has_permission('inbox.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'inbox_permission_required';
  end if;
  if p_status not in ('new', 'read', 'replied', 'archived')
     or p_priority not in ('low', 'normal', 'high', 'urgent')
     or (v_note is not null and char_length(v_note) > 2000)
     or (v_reply is not null and char_length(v_reply) > 10000) then
    raise exception using errcode = '22023', message = 'invalid_inbox_update';
  end if;
  if p_assigned_to is not null and not exists (
    select 1 from public.admin_roles where user_id = p_assigned_to
  ) then
    raise exception using errcode = '23503', message = 'invalid_inbox_assignee';
  end if;

  select * into v_message
  from public.contact_messages
  where id = p_message_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'contact_message_not_found';
  end if;

  if v_note is not null then
    insert into public.contact_message_notes (message_id, author_id, note)
    values (p_message_id, p_actor_id, v_note);
  end if;

  if v_reply is not null then
    select value into v_delivery from public.site_settings where key = 'email_delivery';
    v_delivery_status := case when coalesce((v_delivery->>'enabled')::boolean, false) then 'queued' else 'disabled' end;
    insert into public.email_outbox (
      to_email, subject, body_text, entity_type, entity_id, status, provider, created_by
    ) values (
      v_message.email,
      'رد: ' || coalesce(nullif(v_message.subject, ''), 'رسالتك'),
      v_reply,
      'contact_message',
      p_message_id::text,
      v_delivery_status,
      v_delivery->>'provider',
      p_actor_id
    );
    v_final_status := 'replied';
  end if;

  update public.contact_messages
  set status = v_final_status,
      priority = p_priority,
      assigned_to = p_assigned_to,
      is_spam = coalesce(p_spam, false)
  where id = p_message_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'inbox.message_managed',
    'contact_message',
    p_message_id::text,
    jsonb_build_object(
      'status', v_final_status,
      'priority', p_priority,
      'assigned', p_assigned_to is not null,
      'spam', coalesce(p_spam, false),
      'noteAdded', v_note is not null,
      'replyDelivery', v_delivery_status
    )
  );

  return jsonb_build_object('updated', true, 'status', v_final_status, 'replyDelivery', v_delivery_status);
end;
$$;

revoke all on function public.manage_contact_message(uuid, uuid, text, text, uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.manage_contact_message(uuid, uuid, text, text, uuid, text, boolean, text) to service_role;

comment on function public.submit_contact_message(text, text, text, text, text, text, text, boolean)
is 'Service-only contact intake with validation, durable dual-scope throttling and PII-minimized audit.';
comment on function public.manage_contact_message(uuid, uuid, text, text, uuid, text, boolean, text)
is 'Atomic permission-checked inbox update, note/outbox creation and PII-minimized audit.';
