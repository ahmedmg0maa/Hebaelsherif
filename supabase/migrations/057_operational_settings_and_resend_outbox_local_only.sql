-- 057: atomic operational settings and permissioned Resend outbox delivery.
-- LOCAL ONLY. Apply after 056 on authorized Staging. Provider calls remain in
-- the application; PostgreSQL owns claim/finalize state, permission and audit.

alter table public.email_outbox
  add column if not exists locked_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists email_outbox_updated on public.email_outbox;
create trigger email_outbox_updated before update on public.email_outbox
  for each row execute function public.set_updated_at();

create index if not exists email_outbox_dispatch_idx
  on public.email_outbox(status, next_attempt_at, created_at)
  where status in ('queued', 'sending', 'failed', 'disabled');

drop policy if exists "email outbox: inbox manage" on public.email_outbox;
drop policy if exists "email outbox: permitted read" on public.email_outbox;
create policy "email outbox: permitted read" on public.email_outbox for select
  using (public.has_permission('inbox.view') or public.has_permission('newsletter.manage'));
revoke insert, update, delete on table public.email_outbox from anon, authenticated;

create or replace function public.save_operational_settings(
  p_actor_id uuid,
  p_expiry_hours integer,
  p_booking_policy jsonb,
  p_instapay jsonb,
  p_wallet jsonb,
  p_bank jsonb,
  p_email_enabled boolean
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not public.has_permission('settings.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'settings_manage_permission_required';
  end if;
  if p_expiry_hours is null or p_expiry_hours not between 1 and 168
     or p_booking_policy is null or jsonb_typeof(p_booking_policy) <> 'object'
     or p_booking_policy->>'timezone' <> 'Africa/Cairo'
     or coalesce((p_booking_policy->>'slot_interval_minutes')::integer, -1) not between 5 and 120
     or coalesce((p_booking_policy->>'buffer_before_minutes')::integer, -1) not between 0 and 180
     or coalesce((p_booking_policy->>'buffer_after_minutes')::integer, -1) not between 0 and 180
     or coalesce((p_booking_policy->>'minimum_notice_minutes')::integer, -1) not between 0 and 10080
     or coalesce((p_booking_policy->>'booking_horizon_days')::integer, -1) not between 1 and 30
     or coalesce((p_booking_policy->>'max_bookings_per_day')::integer, -1) not between 1 and 100
     or coalesce((p_booking_policy->>'customer_cancel_notice_hours')::integer, -1) not between 0 and 720 then
    raise exception using errcode = '22023', message = 'operational_booking_policy_invalid';
  end if;
  if p_instapay is not null and (
    jsonb_typeof(p_instapay) <> 'object'
    or char_length(btrim(coalesce(p_instapay->>'handle', ''))) not between 3 and 120
    or char_length(btrim(coalesce(p_instapay->>'name', ''))) not between 2 and 120
  ) then raise exception using errcode = '22023', message = 'operational_instapay_invalid'; end if;
  if p_wallet is not null and (
    jsonb_typeof(p_wallet) <> 'object'
    or replace(replace(coalesce(p_wallet->>'number', ''), ' ', ''), '-', '') !~ '^\+?[0-9]{8,18}$'
    or char_length(btrim(coalesce(p_wallet->>'provider', ''))) not between 2 and 80
  ) then raise exception using errcode = '22023', message = 'operational_wallet_invalid'; end if;
  if p_bank is not null and (
    jsonb_typeof(p_bank) <> 'object'
    or upper(replace(coalesce(p_bank->>'iban', ''), ' ', '')) !~ '^[A-Z]{2}[A-Z0-9]{13,32}$'
    or char_length(btrim(coalesce(p_bank->>'bank', ''))) not between 2 and 120
    or char_length(btrim(coalesce(p_bank->>'name', ''))) not between 2 and 120
  ) then raise exception using errcode = '22023', message = 'operational_bank_invalid'; end if;

  insert into public.site_settings(key, value, is_public, updated_by) values
    ('order_expiry_hours', jsonb_build_object('hours', p_expiry_hours), true, p_actor_id),
    ('booking_policy', p_booking_policy, true, p_actor_id),
    ('email_delivery', jsonb_build_object('enabled', coalesce(p_email_enabled, false), 'provider', case when p_email_enabled then 'resend' else null end), false, p_actor_id)
  on conflict (key) do update set value = excluded.value, is_public = excluded.is_public, updated_by = excluded.updated_by;

  if p_instapay is null then delete from public.site_settings where key = 'payment_instapay';
  else insert into public.site_settings(key,value,is_public,updated_by) values('payment_instapay',p_instapay,true,p_actor_id)
    on conflict(key) do update set value=excluded.value,is_public=true,updated_by=excluded.updated_by; end if;
  if p_wallet is null then delete from public.site_settings where key = 'payment_wallet';
  else insert into public.site_settings(key,value,is_public,updated_by) values('payment_wallet',p_wallet,true,p_actor_id)
    on conflict(key) do update set value=excluded.value,is_public=true,updated_by=excluded.updated_by; end if;
  if p_bank is null then delete from public.site_settings where key = 'payment_bank';
  else insert into public.site_settings(key,value,is_public,updated_by) values('payment_bank',p_bank,true,p_actor_id)
    on conflict(key) do update set value=excluded.value,is_public=true,updated_by=excluded.updated_by; end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'settings.operational_updated', 'site_settings', 'operational', jsonb_build_object(
    'methods', jsonb_build_object('instapay', p_instapay is not null, 'wallet', p_wallet is not null, 'bank', p_bank is not null),
    'emailEnabled', coalesce(p_email_enabled, false), 'expiryHours', p_expiry_hours
  ));
  return true;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'operational_booking_policy_invalid';
end $$;

revoke all on function public.save_operational_settings(uuid, integer, jsonb, jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.save_operational_settings(uuid, integer, jsonb, jsonb, jsonb, jsonb, boolean) to service_role;

create or replace function public.manage_contact_message(
  p_message_id uuid,
  p_actor_id uuid,
  p_status text,
  p_priority text,
  p_assigned_to uuid,
  p_note text,
  p_spam boolean,
  p_reply text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message public.contact_messages%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
  v_delivery jsonb;
  v_delivery_status text := 'not_requested';
  v_final_status text := p_status;
  v_outbox_id uuid;
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
  if p_assigned_to is not null and not exists (select 1 from public.admin_roles where user_id = p_assigned_to) then
    raise exception using errcode = '23503', message = 'invalid_inbox_assignee';
  end if;

  select * into v_message from public.contact_messages where id = p_message_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'contact_message_not_found'; end if;
  if v_reply is not null and p_status = 'replied' and v_message.status <> 'replied' then
    v_final_status := 'read';
  end if;

  if v_note is not null then
    insert into public.contact_message_notes(message_id, author_id, note) values(p_message_id, p_actor_id, v_note);
  end if;
  if v_reply is not null then
    select value into v_delivery from public.site_settings where key = 'email_delivery';
    v_delivery_status := case when v_delivery->>'enabled' = 'true' and v_delivery->>'provider' = 'resend' then 'queued' else 'disabled' end;
    insert into public.email_outbox(to_email,subject,body_text,entity_type,entity_id,status,provider,created_by,next_attempt_at)
    values(v_message.email,'رد: ' || coalesce(nullif(v_message.subject, ''), 'رسالتك'),v_reply,'contact_message',p_message_id::text,v_delivery_status,'resend',p_actor_id,case when v_delivery_status='queued' then now() else null end)
    returning id into v_outbox_id;
  end if;

  update public.contact_messages set status=v_final_status,priority=p_priority,assigned_to=p_assigned_to,is_spam=coalesce(p_spam,false) where id=p_message_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
  values(p_actor_id,'inbox.message_managed','contact_message',p_message_id::text,jsonb_build_object('status',v_final_status,'priority',p_priority,'assigned',p_assigned_to is not null,'spam',coalesce(p_spam,false),'noteAdded',v_note is not null,'replyDelivery',v_delivery_status));
  return jsonb_build_object('updated',true,'status',v_final_status,'replyDelivery',v_delivery_status,'outboxId',v_outbox_id);
end $$;

revoke all on function public.manage_contact_message(uuid, uuid, text, text, uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.manage_contact_message(uuid, uuid, text, text, uuid, text, boolean, text) to service_role;

create or replace function public.claim_email_outbox(p_outbox_id uuid, p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.email_outbox%rowtype;
  v_delivery jsonb;
begin
  if p_actor_id is null or not public.has_permission('inbox.manage', p_actor_id)
     or not public.has_permission('notifications.send', p_actor_id) then
    raise exception using errcode = '42501', message = 'email_send_permission_required';
  end if;
  select * into v_row from public.email_outbox where id = p_outbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'email_outbox_not_found'; end if;
  select value into v_delivery from public.site_settings where key = 'email_delivery';
  if v_delivery->>'enabled' <> 'true' or v_delivery->>'provider' <> 'resend' then
    raise exception using errcode = '55000', message = 'email_delivery_disabled';
  end if;
  if v_row.attempts >= 5 then raise exception using errcode = '54000', message = 'email_attempt_limit_reached'; end if;
  if v_row.status = 'failed' and v_row.next_attempt_at is not null and v_row.next_attempt_at > now() then
    raise exception using errcode = '55000', message = 'email_retry_not_due';
  end if;
  if v_row.status = 'sending' and (v_row.locked_at is null or v_row.locked_at > now() - interval '5 minutes') then
    raise exception using errcode = '55000', message = 'email_already_claimed';
  end if;
  if v_row.status not in ('queued','failed','disabled','sending') then
    raise exception using errcode = '55000', message = 'email_not_dispatchable';
  end if;

  update public.email_outbox set status='sending',attempts=attempts+1,locked_at=now(),next_attempt_at=null,last_error=null where id=p_outbox_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
  values(p_actor_id,'email.delivery_claimed','email_outbox',p_outbox_id::text,jsonb_build_object('attempt',v_row.attempts+1));
  return jsonb_build_object('id',v_row.id,'to',v_row.to_email,'subject',v_row.subject,'text',v_row.body_text,'attempt',v_row.attempts+1);
end $$;

create or replace function public.finalize_email_outbox(
  p_outbox_id uuid,
  p_actor_id uuid,
  p_outcome text,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_next_attempt_at timestamptz default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.email_outbox%rowtype;
begin
  if p_actor_id is null or not public.has_permission('inbox.manage', p_actor_id)
     or not public.has_permission('notifications.send', p_actor_id) then
    raise exception using errcode = '42501', message = 'email_send_permission_required';
  end if;
  if p_outcome not in ('sent','failed')
     or (p_provider_message_id is not null and (char_length(p_provider_message_id) > 128 or p_provider_message_id !~ '^[A-Za-z0-9_-]+$'))
     or (p_error_code is not null and (char_length(p_error_code) > 80 or p_error_code !~ '^[a-z0-9_]+$'))
     or (p_next_attempt_at is not null and (p_next_attempt_at <= now() or p_next_attempt_at > now() + interval '24 hours')) then
    raise exception using errcode = '22023', message = 'email_finalize_invalid';
  end if;
  select * into v_row from public.email_outbox where id=p_outbox_id for update;
  if not found or v_row.status <> 'sending' then raise exception using errcode = '55000', message = 'email_claim_required'; end if;
  if p_outcome='sent' and p_provider_message_id is null then raise exception using errcode='22023',message='provider_message_id_required'; end if;
  if p_outcome='failed' and p_error_code is null then raise exception using errcode='22023',message='email_error_code_required'; end if;

  update public.email_outbox set status=p_outcome,provider='resend',provider_message_id=case when p_outcome='sent' then p_provider_message_id else provider_message_id end,last_error=case when p_outcome='failed' then p_error_code else null end,sent_at=case when p_outcome='sent' then now() else sent_at end,locked_at=null,next_attempt_at=case when p_outcome='failed' then p_next_attempt_at else null end where id=p_outbox_id;
  if p_outcome = 'sent' and v_row.entity_type = 'contact_message' then
    update public.contact_messages
       set status = 'replied'
     where id::text = v_row.entity_id;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
  values(p_actor_id,case when p_outcome='sent' then 'email.delivery_sent' else 'email.delivery_failed' end,'email_outbox',p_outbox_id::text,jsonb_build_object('attempt',v_row.attempts,'errorCode',case when p_outcome='failed' then p_error_code else null end,'retryScheduled',p_next_attempt_at is not null));
  if p_outcome='failed' then
    insert into public.system_events(level,source,message,meta)
    values(case when p_next_attempt_at is null then 'error' else 'warn' end,'resend','تعذّر تسليم رسالة من صندوق الصادر.',jsonb_build_object('outboxId',p_outbox_id,'errorCode',p_error_code,'retryScheduled',p_next_attempt_at is not null));
  end if;
  return true;
end $$;

revoke all on function public.claim_email_outbox(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_email_outbox(uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_email_outbox(uuid, uuid) to service_role;
grant execute on function public.finalize_email_outbox(uuid, uuid, text, text, text, timestamptz) to service_role;

comment on function public.save_operational_settings(uuid,integer,jsonb,jsonb,jsonb,jsonb,boolean) is 'Service-only atomic settings mutation with permission recheck and minimized audit.';
comment on function public.claim_email_outbox(uuid,uuid) is 'Service-only permission-checked outbox lease. Recipient/body are returned only to the delivery adapter and never audit.';
comment on function public.finalize_email_outbox(uuid,uuid,text,text,text,timestamptz) is 'Service-only atomic delivery outcome/audit with allowlisted error codes and no recipient/body metadata.';

-- Rollback-by-forward-fix: never delete outbox/audit history. Disable
-- email_delivery, then replace affected functions in a later migration.
