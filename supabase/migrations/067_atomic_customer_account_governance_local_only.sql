-- 067: atomic customer profile and notification-read governance.
-- LOCAL ONLY. Apply after 066 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

drop policy if exists "profiles: own update" on public.profiles;
drop policy if exists "profiles: admin update" on public.profiles;
drop policy if exists "profiles: permitted update" on public.profiles;
drop policy if exists "notifications: own mark-read" on public.notifications;

revoke update on table public.profiles from anon, authenticated;
revoke update on table public.notifications from anon, authenticated;

create or replace function public.update_customer_profile(
  p_actor_id uuid,
  p_full_name text,
  p_phone text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_full_name text := regexp_replace(btrim(coalesce(p_full_name, '')), '[[:space:]]+', ' ', 'g');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_name_changed boolean;
  v_phone_changed boolean;
begin
  if p_actor_id is null
     or char_length(v_full_name) not between 2 and 120
     or v_full_name ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'customer_profile_name_invalid';
  end if;
  if v_phone is not null
     and (
       char_length(v_phone) not between 7 and 30
       or v_phone ~ '[[:cntrl:]]'
       or v_phone !~ '^\+?[0-9][0-9 ()-]{5,28}[0-9]$'
     ) then
    raise exception using errcode = '22023', message = 'customer_profile_phone_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('customer-profile:' || p_actor_id::text, 0));
  select * into v_profile
    from public.profiles
   where id = p_actor_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'customer_profile_not_found';
  end if;

  v_name_changed := v_profile.full_name is distinct from v_full_name;
  v_phone_changed := v_profile.phone is distinct from v_phone;
  if not v_name_changed and not v_phone_changed then
    return jsonb_build_object('outcome', 'unchanged', 'updatedAt', v_profile.updated_at);
  end if;

  update public.profiles
     set full_name = v_full_name,
         phone = v_phone
   where id = p_actor_id
   returning * into v_profile;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'customer.profile_updated',
    'profile',
    p_actor_id::text,
    jsonb_build_object(
      'fullNameChanged', v_name_changed,
      'phoneChanged', v_phone_changed
    )
  );

  return jsonb_build_object('outcome', 'updated', 'updatedAt', v_profile.updated_at);
end $$;

create or replace function public.mark_customer_notifications_read(
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_marked_at timestamptz := clock_timestamp();
  v_count integer := 0;
begin
  if p_actor_id is null or not exists(select 1 from public.profiles where id = p_actor_id) then
    raise exception using errcode = 'P0002', message = 'customer_profile_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('customer-notifications-read:' || p_actor_id::text, 0));
  update public.notifications
     set read_at = v_marked_at
   where user_id = p_actor_id
     and read_at is null;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    return jsonb_build_object('outcome', 'unchanged', 'count', 0);
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'customer.notifications_marked_read',
    'notification_batch',
    p_actor_id::text,
    jsonb_build_object('count', v_count)
  );

  return jsonb_build_object('outcome', 'updated', 'count', v_count, 'readAt', v_marked_at);
end $$;

revoke all on function public.update_customer_profile(uuid,text,text) from public, anon, authenticated;
revoke all on function public.mark_customer_notifications_read(uuid) from public, anon, authenticated;
grant execute on function public.update_customer_profile(uuid,text,text) to service_role;
grant execute on function public.mark_customer_notifications_read(uuid) to service_role;

comment on function public.update_customer_profile(uuid,text,text) is
  'Service-only customer profile update with explicit actor binding, strict field allowlist, serialization and metadata-only audit.';
comment on function public.mark_customer_notifications_read(uuid) is
  'Service-only idempotent mark-all-read operation with explicit actor binding and atomic count-only audit.';

-- Rollback-by-forward-fix: preserve profile values, notification read state and
-- audit history. Replace these functions later; do not restore browser-direct
-- UPDATE privileges.
