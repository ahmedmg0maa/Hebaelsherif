-- 079: atomic advanced-setting revision and feature-flag governance.
-- LOCAL ONLY. Apply after 078 on authorized recovery-controlled Staging.

revoke insert,update,delete on table public.site_settings from anon,authenticated;
revoke insert,update,delete on table public.feature_flags from anon,authenticated;

create table if not exists public.site_setting_revisions(
  id uuid primary key default gen_random_uuid(),setting_key text not null,
  snapshot jsonb not null,is_public boolean not null,created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists site_setting_revisions_key_created_idx on public.site_setting_revisions(setting_key,created_at desc);
alter table public.site_setting_revisions enable row level security;
revoke all on table public.site_setting_revisions from public,anon,authenticated;

create or replace function public.manage_advanced_setting(p_actor_id uuid,p_key text,p_value jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_setting public.site_settings%rowtype;v_size integer;
begin
  if p_actor_id is null or not public.has_permission('settings.manage',p_actor_id)then raise exception using errcode='42501',message='settings_management_required';end if;
  if p_key is null or p_key!~'^[a-z0-9][a-z0-9_]{1,79}$'
     or p_key in('home_copy','owner_profile','start_here_experience','order_expiry_hours','booking_policy','payment_instapay','payment_wallet','payment_bank','email_delivery')
     or p_key~*'(secret|token|password|api[_]?key|service[_]?role|private[_]?key)' then raise exception using errcode='22023',message='advanced_setting_key_invalid';end if;
  if p_value is null then raise exception using errcode='22023',message='advanced_setting_value_required';end if;
  v_size:=octet_length(p_value::text);
  if v_size>32768 or p_value::text~*'"[^"]*(secret|token|password|api[_-]?key|service[_-]?role|private[_-]?key)[^"]*"[[:space:]]*:' then raise exception using errcode='22023',message='advanced_setting_value_invalid';end if;
  select * into v_setting from public.site_settings where key=p_key for update;
  if not found then raise exception using errcode='P0002',message='advanced_setting_not_found';end if;
  insert into public.site_setting_revisions(setting_key,snapshot,is_public,created_by)values(v_setting.key,v_setting.value,v_setting.is_public,p_actor_id);
  update public.site_settings set value=p_value,updated_by=p_actor_id where key=v_setting.key;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)values(p_actor_id,'setting.updated','site_setting',v_setting.key,jsonb_build_object('isPublic',v_setting.is_public,'valueBytes',v_size));
  return jsonb_build_object('key',v_setting.key,'updated',true);
end $$;
revoke all on function public.manage_advanced_setting(uuid,text,jsonb)from public,anon,authenticated;
grant execute on function public.manage_advanced_setting(uuid,text,jsonb)to service_role;

create or replace function public.manage_feature_flag(p_actor_id uuid,p_key text,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_flag public.feature_flags%rowtype;
begin
  if p_actor_id is null or not public.has_permission('feature_flags.manage',p_actor_id)then raise exception using errcode='42501',message='feature_flag_management_required';end if;
  if p_key is null or p_enabled is null then raise exception using errcode='22023',message='feature_flag_payload_invalid';end if;
  select * into v_flag from public.feature_flags where key=p_key for update;
  if not found then raise exception using errcode='P0002',message='feature_flag_not_found';end if;
  update public.feature_flags set is_enabled=p_enabled where key=v_flag.key;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)values(p_actor_id,case when p_enabled then'flag.enabled'else'flag.disabled'end,'feature_flag',v_flag.key,jsonb_build_object('fromEnabled',v_flag.is_enabled,'toEnabled',p_enabled));
  return jsonb_build_object('key',v_flag.key,'enabled',p_enabled);
end $$;
revoke all on function public.manage_feature_flag(uuid,text,boolean)from public,anon,authenticated;
grant execute on function public.manage_feature_flag(uuid,text,boolean)to service_role;

-- Rollback-by-forward-fix; retain setting revision and audit history.
