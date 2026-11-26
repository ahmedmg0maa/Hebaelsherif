-- 055: consent-complete newsletter subscription, throttling and atomic Admin lifecycle.
-- LOCAL ONLY. Apply after 054 on authorized Staging. Existing rows are preserved;
-- rows without consent evidence remain visibly legacy and must never enter a send.

alter table public.newsletter_subscribers
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text,
  add column if not exists source text,
  add column if not exists request_fingerprint text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists newsletter_subscribers_updated on public.newsletter_subscribers;
create trigger newsletter_subscribers_updated before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

create unique index if not exists newsletter_active_consented_email_uidx
  on public.newsletter_subscribers(lower(email))
  where status = 'subscribed' and consent_at is not null;
create index if not exists newsletter_consent_status_idx
  on public.newsletter_subscribers(status, consent_at, created_at desc);

drop policy if exists "newsletter: anyone subscribe" on public.newsletter_subscribers;
drop policy if exists "newsletter: permitted update" on public.newsletter_subscribers;
revoke insert, update, delete on table public.newsletter_subscribers from anon, authenticated;

create table if not exists public.newsletter_submission_limits (
  scope text not null check (scope in ('device', 'email')),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  hits integer not null default 1 check (hits > 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_started_at)
);
alter table public.newsletter_submission_limits enable row level security;
revoke all on table public.newsletter_submission_limits from public, anon, authenticated;

create or replace function public.submit_newsletter_subscription(
  p_email text,
  p_consent boolean,
  p_consent_version text,
  p_source text,
  p_device_fingerprint text,
  p_email_fingerprint text,
  p_unsubscribe_token_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_window timestamptz;
  v_device_hits integer;
  v_email_hits integer;
  v_subscriber_id uuid;
  v_was_subscribed boolean := false;
begin
  if char_length(v_email) not between 5 and 254
     or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_consent is not true
     or p_consent_version <> 'newsletter-consent-v1'
     or p_source not in ('home')
     or p_device_fingerprint !~ '^[0-9a-f]{64}$'
     or p_email_fingerprint !~ '^[0-9a-f]{64}$'
     or p_unsubscribe_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_newsletter_subscription';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  insert into public.newsletter_submission_limits(scope, key_hash, window_started_at)
    values ('device', p_device_fingerprint, v_window)
    on conflict (scope, key_hash, window_started_at)
    do update set hits = public.newsletter_submission_limits.hits + 1, updated_at = now()
    returning hits into v_device_hits;
  insert into public.newsletter_submission_limits(scope, key_hash, window_started_at)
    values ('email', p_email_fingerprint, v_window)
    on conflict (scope, key_hash, window_started_at)
    do update set hits = public.newsletter_submission_limits.hits + 1, updated_at = now()
    returning hits into v_email_hits;
  if v_device_hits > 5 or v_email_hits > 3 then
    return jsonb_build_object('accepted', false, 'reason', 'rate_limited');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));
  select id, status = 'subscribed' and consent_at is not null
    into v_subscriber_id, v_was_subscribed
    from public.newsletter_subscribers
    where lower(email) = v_email
    order by (status = 'subscribed' and consent_at is not null) desc, created_at
    for update limit 1;

  if v_subscriber_id is null then
    insert into public.newsletter_subscribers(
      email, status, consent_at, consent_version, source, request_fingerprint,
      unsubscribe_token_hash, token_created_at, unsubscribed_at
    ) values (
      v_email, 'subscribed', now(), p_consent_version, p_source, p_email_fingerprint,
      p_unsubscribe_token_hash, now(), null
    ) returning id into v_subscriber_id;
  else
    update public.newsletter_subscribers
      set status = 'unsubscribed', unsubscribed_at = coalesce(unsubscribed_at, now())
      where id <> v_subscriber_id and lower(email) = v_email and status = 'subscribed';
    update public.newsletter_subscribers
      set email = v_email, status = 'subscribed', consent_at = now(),
          consent_version = p_consent_version, source = p_source,
          request_fingerprint = p_email_fingerprint,
          unsubscribe_token_hash = p_unsubscribe_token_hash,
          token_created_at = now(), unsubscribed_at = null
      where id = v_subscriber_id;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (null, case when v_was_subscribed then 'newsletter.consent_refreshed' else 'newsletter.subscribed' end,
      'newsletter_subscriber', v_subscriber_id::text,
      jsonb_build_object('source', p_source, 'consentVersion', p_consent_version, 'alreadySubscribed', v_was_subscribed));
  return jsonb_build_object('accepted', true, 'alreadySubscribed', v_was_subscribed);
end $$;

create or replace function public.unsubscribe_newsletter(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  select id into v_id from public.newsletter_subscribers
    where unsubscribe_token_hash = p_token_hash for update;
  if not found then return false; end if;
  update public.newsletter_subscribers set status = 'unsubscribed', unsubscribed_at = now() where id = v_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (null, 'newsletter.unsubscribed_by_token', 'newsletter_subscriber', v_id::text, '{}'::jsonb);
  return true;
end $$;

create or replace function public.manage_newsletter_subscriber(
  p_subscriber_id uuid,
  p_action text,
  p_actor_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.newsletter_subscribers%rowtype;
begin
  if not public.has_permission('newsletter.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'newsletter_manage_permission_required';
  end if;
  if p_action not in ('unsubscribe', 'erase') then
    raise exception using errcode = '22023', message = 'newsletter_action_invalid';
  end if;
  select * into v_row from public.newsletter_subscribers where id = p_subscriber_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'newsletter_subscriber_not_found'; end if;
  if p_action = 'unsubscribe' then
    update public.newsletter_subscribers set status = 'unsubscribed', unsubscribed_at = now() where id = p_subscriber_id;
  else
    delete from public.newsletter_subscribers where id = p_subscriber_id;
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (p_actor_id, 'newsletter.' || p_action, 'newsletter_subscriber', p_subscriber_id::text,
      jsonb_build_object('previousStatus', v_row.status, 'hadConsent', v_row.consent_at is not null, 'source', v_row.source));
  return true;
end $$;

create or replace function public.rotate_newsletter_unsubscribe_token(
  p_subscriber_id uuid,
  p_token_hash text,
  p_actor_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('newsletter.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'newsletter_manage_permission_required';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'newsletter_token_invalid';
  end if;
  update public.newsletter_subscribers
    set unsubscribe_token_hash = p_token_hash, token_created_at = now()
    where id = p_subscriber_id;
  if not found then raise exception using errcode = 'P0002', message = 'newsletter_subscriber_not_found'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (p_actor_id, 'newsletter.unsubscribe_token_rotated', 'newsletter_subscriber', p_subscriber_id::text, '{}'::jsonb);
  return true;
end $$;

revoke all on function public.submit_newsletter_subscription(text, boolean, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_newsletter_subscription(text, boolean, text, text, text, text, text) to service_role;
revoke all on function public.unsubscribe_newsletter(text) from public, anon, authenticated;
grant execute on function public.unsubscribe_newsletter(text) to service_role;
revoke all on function public.manage_newsletter_subscriber(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.manage_newsletter_subscriber(uuid, text, uuid) to service_role;
revoke all on function public.rotate_newsletter_unsubscribe_token(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.rotate_newsletter_unsubscribe_token(uuid, text, uuid) to service_role;

comment on column public.newsletter_subscribers.consent_at is 'Explicit newsletter consent evidence; null legacy rows are not send-eligible.';
comment on function public.submit_newsletter_subscription(text, boolean, text, text, text, text, text) is 'Service-only consent and throttling boundary; audit never stores email or token.';
