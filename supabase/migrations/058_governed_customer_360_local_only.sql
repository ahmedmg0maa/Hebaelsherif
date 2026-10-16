-- 058: permission-scoped Customer 360 reads and atomic note/tag lifecycle.
-- LOCAL ONLY. Apply after 057 on authorized Staging.

alter table public.user_notes
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

create index if not exists user_notes_customer_active_idx
  on public.user_notes(user_id, created_at desc)
  where archived_at is null;

drop policy if exists "user_notes: permitted" on public.user_notes;
drop policy if exists "user_notes: permitted read" on public.user_notes;
create policy "user_notes: permitted read" on public.user_notes for select
  using (public.has_permission('users.view'));
revoke insert, update, delete on table public.user_notes from anon, authenticated;

drop policy if exists "user_tags: permitted" on public.user_tags;
drop policy if exists "user_tags: permitted read" on public.user_tags;
create policy "user_tags: permitted read" on public.user_tags for select
  using (public.has_permission('users.view'));
revoke insert, update, delete on table public.user_tags from anon, authenticated;

create or replace function public.search_admin_users(p_actor_id uuid, p_query text default '')
returns table(id uuid, full_name text, email text, phone text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_result_count integer := 0;
begin
  if p_actor_id is null or not public.has_permission('users.view', p_actor_id) then
    raise exception using errcode = '42501', message = 'users_view_permission_required';
  end if;
  if char_length(v_query) > 100 or v_query ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'customer_search_invalid';
  end if;

  return query
  select p.id, p.full_name, p.email, p.phone, p.created_at
    from public.profiles p
   where v_query = ''
      or p.full_name ilike '%' || v_query || '%'
      or p.email ilike '%' || v_query || '%'
   order by p.created_at desc
   limit case when v_query = '' then 200 else 50 end;
  get diagnostics v_result_count = row_count;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'customer.directory_viewed', 'customer_directory', null,
    jsonb_build_object('searched', v_query <> '', 'queryLength', char_length(v_query), 'resultCount', v_result_count));
end $$;

create or replace function public.get_admin_customer_360(p_actor_id uuid, p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_result jsonb;
begin
  if p_actor_id is null or not public.has_permission('users.view', p_actor_id) then
    raise exception using errcode = '42501', message = 'users_view_permission_required';
  end if;
  select * into v_profile from public.profiles where id = p_customer_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'customer_not_found';
  end if;

  v_result := jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'fullName', v_profile.full_name,
      'email', v_profile.email,
      'phone', v_profile.phone,
      'createdAt', v_profile.created_at
    ),
    'orders', (select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc), '[]'::jsonb)
      from (select o.id, o.status, o.total, o.created_at from public.orders o where o.user_id = p_customer_id order by o.created_at desc limit 100) row_data),
    'payments', (select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc), '[]'::jsonb)
      from (select p.id, p.status, p.amount, p.created_at from public.payments p where p.user_id = p_customer_id order by p.created_at desc limit 100) row_data),
    'bookings', (select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.starts_at desc), '[]'::jsonb)
      from (select b.id, b.status, b.starts_at, s.title as service_title from public.bookings b left join public.services s on s.id = b.service_id where b.user_id = p_customer_id order by b.starts_at desc limit 100) row_data),
    'subscriptions', (select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc), '[]'::jsonb)
      from (select s.id, s.status, s.starts_at, s.ends_at, s.created_at, p.title as plan_title from public.subscriptions s left join public.subscription_plans p on p.id = s.plan_id where s.user_id = p_customer_id order by s.created_at desc limit 100) row_data),
    'notes', (select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc), '[]'::jsonb)
      from (select n.id, n.note, n.created_at, n.archived_at from public.user_notes n where n.user_id = p_customer_id order by n.created_at desc limit 100) row_data),
    'tags', (select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc), '[]'::jsonb)
      from (select t.id, t.tag, t.created_at from public.user_tags t where t.user_id = p_customer_id order by t.created_at desc limit 100) row_data),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc), '[]'::jsonb)
      from (select n.id, n.title, n.kind, n.created_at from public.notifications n where n.user_id = p_customer_id order by n.created_at desc limit 20) row_data),
    'counts', jsonb_build_object(
      'orders', (select count(*) from public.orders where user_id = p_customer_id),
      'payments', (select count(*) from public.payments where user_id = p_customer_id),
      'bookings', (select count(*) from public.bookings where user_id = p_customer_id),
      'subscriptions', (select count(*) from public.subscriptions where user_id = p_customer_id),
      'notes', (select count(*) from public.user_notes where user_id = p_customer_id and archived_at is null)
    )
  );

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'customer.profile_viewed', 'user', p_customer_id::text,
    jsonb_build_object('bounded', true, 'includesPii', true));
  return v_result;
end $$;

create or replace function public.manage_customer_note(
  p_actor_id uuid,
  p_customer_id uuid,
  p_action text,
  p_note_id uuid default null,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := btrim(coalesce(p_note, ''));
  v_id uuid;
begin
  if p_actor_id is null or not public.has_permission('users.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'users_manage_permission_required';
  end if;
  if not exists (select 1 from public.profiles where id = p_customer_id) then
    raise exception using errcode = 'P0002', message = 'customer_not_found';
  end if;

  if p_action = 'add' then
    if char_length(v_note) not between 2 and 2000 then
      raise exception using errcode = '22023', message = 'customer_note_invalid';
    end if;
    insert into public.user_notes(user_id, author_id, note)
    values (p_customer_id, p_actor_id, v_note)
    returning id into v_id;
  elsif p_action in ('archive', 'restore') then
    if p_note_id is null then raise exception using errcode = '22023', message = 'customer_note_id_required'; end if;
    select id into v_id from public.user_notes where id = p_note_id and user_id = p_customer_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'customer_note_not_found'; end if;
    if p_action = 'archive' then
      update public.user_notes set archived_at = coalesce(archived_at, now()), archived_by = case when archived_at is null then p_actor_id else archived_by end where id = v_id;
    else
      update public.user_notes set archived_at = null, archived_by = null where id = v_id;
    end if;
  else
    raise exception using errcode = '22023', message = 'customer_note_action_invalid';
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'customer.note_' || p_action, 'user_note', v_id::text,
    jsonb_build_object('customerId', p_customer_id, 'noteLength', case when p_action = 'add' then char_length(v_note) else null end));
  return v_id;
end $$;

create or replace function public.manage_customer_tag(
  p_actor_id uuid,
  p_customer_id uuid,
  p_action text,
  p_tag_id uuid default null,
  p_tag text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tag text := lower(regexp_replace(btrim(coalesce(p_tag, '')), '[[:space:]]+', ' ', 'g'));
  v_id uuid;
begin
  if p_actor_id is null or not public.has_permission('users.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'users_manage_permission_required';
  end if;
  if not exists (select 1 from public.profiles where id = p_customer_id) then
    raise exception using errcode = 'P0002', message = 'customer_not_found';
  end if;

  if p_action = 'add' then
    if char_length(v_tag) not between 2 and 40 or v_tag ~ '[[:cntrl:]]' then
      raise exception using errcode = '22023', message = 'customer_tag_invalid';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text || ':' || v_tag, 0));
    select id into v_id from public.user_tags where user_id = p_customer_id and lower(tag) = v_tag order by created_at limit 1;
    if v_id is null then
      insert into public.user_tags(user_id, tag) values (p_customer_id, v_tag) returning id into v_id;
    end if;
  elsif p_action = 'remove' then
    if p_tag_id is null then raise exception using errcode = '22023', message = 'customer_tag_id_required'; end if;
    delete from public.user_tags where id = p_tag_id and user_id = p_customer_id returning id into v_id;
    if v_id is null then raise exception using errcode = 'P0002', message = 'customer_tag_not_found'; end if;
  else
    raise exception using errcode = '22023', message = 'customer_tag_action_invalid';
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'customer.tag_' || p_action, 'user_tag', v_id::text,
    jsonb_build_object('customerId', p_customer_id, 'tagLength', case when p_action = 'add' then char_length(v_tag) else null end));
  return v_id;
end $$;

revoke all on function public.search_admin_users(uuid, text) from public, anon, authenticated;
revoke all on function public.get_admin_customer_360(uuid, uuid) from public, anon, authenticated;
revoke all on function public.manage_customer_note(uuid, uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.manage_customer_tag(uuid, uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.search_admin_users(uuid, text) to service_role;
grant execute on function public.get_admin_customer_360(uuid, uuid) to service_role;
grant execute on function public.manage_customer_note(uuid, uuid, text, uuid, text) to service_role;
grant execute on function public.manage_customer_tag(uuid, uuid, text, uuid, text) to service_role;

comment on function public.search_admin_users(uuid,text) is 'Bounded, service-only customer directory with users.view recheck and privacy-safe access audit.';
comment on function public.get_admin_customer_360(uuid,uuid) is 'Bounded Customer 360 payload with users.view recheck and PII-access audit.';
comment on function public.manage_customer_note(uuid,uuid,text,uuid,text) is 'Atomic add/archive/restore note lifecycle with users.manage and content-free audit metadata.';
comment on function public.manage_customer_tag(uuid,uuid,text,uuid,text) is 'Atomic add/remove tag lifecycle with users.manage and content-free audit metadata.';

-- Rollback-by-forward-fix: preserve note/audit history; replace functions or
-- policies in a later migration instead of deleting customer records.
