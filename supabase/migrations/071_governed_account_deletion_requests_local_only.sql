-- 071: governed customer account-deletion request and Admin review lifecycle.
-- LOCAL ONLY. Apply after 070 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in (
    'pending', 'in_review', 'awaiting_customer', 'approved_for_execution',
    'declined', 'cancelled', 'completed'
  )),
  review_note text check (review_note is null or (
    char_length(review_note) between 3 and 1000
    and review_note !~ '[[:cntrl:]]'
  )),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  execution_reference text check (execution_reference is null or (
    char_length(execution_reference) between 3 and 128
    and execution_reference ~ '^[A-Za-z0-9._:/-]+$'
  )),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists account_deletion_requests_updated on public.account_deletion_requests;
create trigger account_deletion_requests_updated
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();

create unique index if not exists account_deletion_requests_one_active_user
  on public.account_deletion_requests(user_id)
  where user_id is not null and status in (
    'pending', 'in_review', 'awaiting_customer', 'approved_for_execution'
  );
create index if not exists account_deletion_requests_queue_idx
  on public.account_deletion_requests(status, requested_at);

alter table public.account_deletion_requests enable row level security;
revoke all on table public.account_deletion_requests from anon, authenticated;

create or replace function public.get_customer_account_deletion_request(
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.account_deletion_requests%rowtype;
begin
  if p_actor_id is null or not exists(select 1 from public.profiles where id = p_actor_id) then
    raise exception using errcode = 'P0002', message = 'customer_profile_not_found';
  end if;
  select * into v_request
    from public.account_deletion_requests
   where user_id = p_actor_id
   order by requested_at desc
   limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_request.id,
    'status', v_request.status,
    'requestedAt', v_request.requested_at,
    'updatedAt', v_request.updated_at,
    'reviewedAt', v_request.reviewed_at,
    'reviewNote', v_request.review_note
  );
end $$;

create or replace function public.request_customer_account_deletion(
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.account_deletion_requests%rowtype;
  v_recent_count integer;
begin
  if p_actor_id is null or not exists(select 1 from public.profiles where id = p_actor_id) then
    raise exception using errcode = 'P0002', message = 'customer_profile_not_found';
  end if;
  if exists(select 1 from public.admin_roles where user_id = p_actor_id) then
    raise exception using errcode = '42501', message = 'admin_role_transfer_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('account-deletion:' || p_actor_id::text, 0));
  select * into v_request
    from public.account_deletion_requests
   where user_id = p_actor_id
     and status in ('pending', 'in_review', 'awaiting_customer', 'approved_for_execution')
   order by requested_at desc
   limit 1
   for update;
  if found then
    return jsonb_build_object('outcome', 'existing', 'id', v_request.id, 'status', v_request.status);
  end if;

  select count(*)::integer into v_recent_count
    from public.account_deletion_requests
   where user_id = p_actor_id
     and requested_at >= now() - interval '30 days';
  if v_recent_count >= 3 then
    raise exception using errcode = '54000', message = 'account_deletion_request_rate_limited';
  end if;

  insert into public.account_deletion_requests(user_id, subject_hash)
  values (p_actor_id, encode(digest(p_actor_id::text, 'sha256'), 'hex'))
  returning * into v_request;

  insert into public.notifications(user_id, title, body, kind, link)
  values (
    p_actor_id,
    'تم تسجيل طلب حذف الحساب',
    'سنراجع الطلب والتحقق من أي التزامات حفظ لازمة. لم يُحذف حسابك بعد ويمكنك إلغاء الطلب من الإعدادات ما دام التنفيذ لم يكتمل.',
    'account',
    '/dashboard/settings'
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'customer.account_deletion_requested',
    'account_deletion_request',
    v_request.id::text,
    jsonb_build_object('status', 'pending')
  );
  return jsonb_build_object('outcome', 'created', 'id', v_request.id, 'status', v_request.status);
end $$;

create or replace function public.cancel_customer_account_deletion(
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.account_deletion_requests%rowtype;
begin
  if p_actor_id is null then
    raise exception using errcode = '42501', message = 'customer_identity_required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('account-deletion:' || p_actor_id::text, 0));
  select * into v_request
    from public.account_deletion_requests
   where user_id = p_actor_id
     and status in ('pending', 'in_review', 'awaiting_customer', 'approved_for_execution')
   order by requested_at desc
   limit 1
   for update;
  if not found then
    return jsonb_build_object('outcome', 'unchanged', 'status', 'none');
  end if;

  update public.account_deletion_requests
     set status = 'cancelled', reviewed_at = null, reviewed_by = null, review_note = null
   where id = v_request.id;
  insert into public.notifications(user_id, title, body, kind, link)
  values (p_actor_id, 'أُلغي طلب حذف الحساب', 'يبقى حسابك نشطًا ولم تُحذف بياناتك.', 'account', '/dashboard/settings');
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'customer.account_deletion_cancelled',
    'account_deletion_request',
    v_request.id::text,
    jsonb_build_object('previousStatus', v_request.status)
  );
  return jsonb_build_object('outcome', 'cancelled', 'id', v_request.id, 'status', 'cancelled');
end $$;

create or replace function public.list_admin_account_deletion_requests(
  p_actor_id uuid
) returns table(
  id uuid,
  customer_id uuid,
  full_name text,
  email text,
  status text,
  requested_at timestamptz,
  updated_at timestamptz,
  reviewed_at timestamptz,
  note_present boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer := 0;
begin
  if p_actor_id is null or not public.has_permission('users.view', p_actor_id) then
    raise exception using errcode = '42501', message = 'users_view_permission_required';
  end if;
  return query
    select request.id, request.user_id, coalesce(profile.full_name, ''), coalesce(profile.email, ''),
           request.status, request.requested_at, request.updated_at, request.reviewed_at,
           request.review_note is not null
      from public.account_deletion_requests request
      left join public.profiles profile on profile.id = request.user_id
     where request.status in ('pending', 'in_review', 'awaiting_customer', 'approved_for_execution')
     order by request.requested_at asc
     limit 200;
  get diagnostics v_count = row_count;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'admin.account_deletion_queue_viewed',
    'account_deletion_request',
    null,
    jsonb_build_object('count', v_count, 'limit', 200)
  );
end $$;

create or replace function public.review_customer_account_deletion(
  p_actor_id uuid,
  p_request_id uuid,
  p_status text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.account_deletion_requests%rowtype;
  v_note text := nullif(regexp_replace(btrim(coalesce(p_note, '')), '[[:space:]]+', ' ', 'g'), '');
  v_title text;
  v_body text;
begin
  if p_actor_id is null or not public.has_permission('users.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'users_manage_permission_required';
  end if;
  if p_request_id is null
     or p_status not in ('in_review', 'awaiting_customer', 'approved_for_execution', 'declined')
     or (v_note is not null and (char_length(v_note) not between 3 and 1000 or v_note ~ '[[:cntrl:]]'))
     or (p_status in ('awaiting_customer', 'declined') and v_note is null) then
    raise exception using errcode = '22023', message = 'account_deletion_review_invalid';
  end if;

  select * into v_request
    from public.account_deletion_requests
   where id = p_request_id
   for update;
  if not found then raise exception using errcode = 'P0002', message = 'account_deletion_request_not_found'; end if;
  if v_request.user_id is null then
    raise exception using errcode = '55000', message = 'account_identity_already_removed';
  end if;
  if v_request.status not in ('pending', 'in_review', 'awaiting_customer', 'approved_for_execution') then
    raise exception using errcode = '55000', message = 'account_deletion_request_closed';
  end if;
  if p_status = 'approved_for_execution'
     and exists(select 1 from public.admin_roles where user_id = v_request.user_id) then
    raise exception using errcode = '42501', message = 'admin_role_transfer_required';
  end if;
  if v_request.status = p_status and v_request.review_note is not distinct from v_note then
    return jsonb_build_object('outcome', 'unchanged', 'id', v_request.id, 'status', v_request.status);
  end if;

  update public.account_deletion_requests
     set status = p_status,
         review_note = v_note,
         reviewed_at = now(),
         reviewed_by = p_actor_id
   where id = v_request.id;

  v_title := case p_status
    when 'in_review' then 'بدأت مراجعة طلب حذف الحساب'
    when 'awaiting_customer' then 'طلب حذف الحساب يحتاج متابعة'
    when 'approved_for_execution' then 'اعتُمد طلب حذف الحساب للتنفيذ'
    else 'أُغلق طلب حذف الحساب دون تنفيذ'
  end;
  v_body := case p_status
    when 'in_review' then 'طلبك قيد المراجعة. لم يُحذف الحساب بعد.'
    when 'approved_for_execution' then 'اكتملت المراجعة وأصبح الطلب بانتظار تنفيذ حذف الهوية والبيانات المؤهلة. لم يُحذف الحساب بعد.'
    else coalesce(v_note, 'راجعي الإعدادات أو تواصلي مع الدعم للمزيد من التفاصيل.')
  end;
  insert into public.notifications(user_id, title, body, kind, link)
  values (v_request.user_id, v_title, v_body, 'account', '/dashboard/settings');
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'admin.account_deletion_reviewed',
    'account_deletion_request',
    v_request.id::text,
    jsonb_build_object(
      'fromStatus', v_request.status,
      'toStatus', p_status,
      'notePresent', v_note is not null,
      'noteLength', coalesce(char_length(v_note), 0)
    )
  );
  return jsonb_build_object('outcome', 'updated', 'id', v_request.id, 'status', p_status);
end $$;

create or replace function public.complete_customer_account_deletion(
  p_actor_id uuid,
  p_request_id uuid,
  p_execution_reference text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.account_deletion_requests%rowtype;
  v_reference text := btrim(coalesce(p_execution_reference, ''));
begin
  if p_actor_id is null or not public.has_permission('users.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'users_manage_permission_required';
  end if;
  if p_request_id is null
     or char_length(v_reference) not between 3 and 128
     or v_reference !~ '^[A-Za-z0-9._:/-]+$' then
    raise exception using errcode = '22023', message = 'account_deletion_execution_reference_invalid';
  end if;
  select * into v_request
    from public.account_deletion_requests
   where id = p_request_id
   for update;
  if not found then raise exception using errcode = 'P0002', message = 'account_deletion_request_not_found'; end if;
  if v_request.status = 'completed' then
    return jsonb_build_object('outcome', 'unchanged', 'id', v_request.id, 'status', 'completed');
  end if;
  if v_request.status <> 'approved_for_execution' then
    raise exception using errcode = '55000', message = 'account_deletion_approval_required';
  end if;
  -- The auth.users FK becomes NULL only after the separately controlled Auth
  -- deletion has actually happened. This prevents a fake completion control.
  if v_request.user_id is not null then
    raise exception using errcode = '55000', message = 'account_identity_still_exists';
  end if;

  update public.account_deletion_requests
     set status = 'completed',
         execution_reference = v_reference,
         completed_at = now(),
         reviewed_at = now(),
         reviewed_by = p_actor_id
   where id = v_request.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'admin.account_deletion_completed',
    'account_deletion_request',
    v_request.id::text,
    jsonb_build_object('executionReferencePresent', true)
  );
  return jsonb_build_object('outcome', 'completed', 'id', v_request.id, 'status', 'completed');
end $$;

revoke all on function public.get_customer_account_deletion_request(uuid) from public, anon, authenticated;
revoke all on function public.request_customer_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.cancel_customer_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.list_admin_account_deletion_requests(uuid) from public, anon, authenticated;
revoke all on function public.review_customer_account_deletion(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.complete_customer_account_deletion(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.get_customer_account_deletion_request(uuid) to service_role;
grant execute on function public.request_customer_account_deletion(uuid) to service_role;
grant execute on function public.cancel_customer_account_deletion(uuid) to service_role;
grant execute on function public.list_admin_account_deletion_requests(uuid) to service_role;
grant execute on function public.review_customer_account_deletion(uuid,uuid,text,text) to service_role;
grant execute on function public.complete_customer_account_deletion(uuid,uuid,text) to service_role;

comment on table public.account_deletion_requests is
  'Operational privacy-request lifecycle. Approval is not deletion; completion requires proof the Auth identity FK is already gone.';

-- Rollback-by-forward-fix: keep requests and audit evidence. Disable the UI and
-- replace functions later; never delete privacy-request history as rollback.
