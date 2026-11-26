-- 059: atomic, permission-scoped and idempotent Admin notifications.
-- LOCAL ONLY. Apply after 058 on authorized Staging.

alter table public.notifications
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists admin_request_id uuid;

create unique index if not exists notifications_admin_request_uidx
  on public.notifications(admin_request_id)
  where admin_request_id is not null;

drop policy if exists "notifications: admin insert" on public.notifications;
drop policy if exists "notifications: permitted insert" on public.notifications;
revoke insert, delete on table public.notifications from anon, authenticated;

create or replace function public.send_admin_notification(
  p_actor_id uuid,
  p_customer_id uuid,
  p_title text,
  p_body text,
  p_request_id uuid,
  p_kind text default 'info',
  p_link text default '/dashboard/notifications'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_kind text := lower(btrim(coalesce(p_kind, '')));
  v_link text := btrim(coalesce(p_link, ''));
  v_existing public.notifications%rowtype;
  v_notification_id uuid;
begin
  if p_actor_id is null or not public.has_permission('notifications.send', p_actor_id) then
    raise exception using errcode = '42501', message = 'notifications_send_permission_required';
  end if;
  if p_customer_id is null or not exists (select 1 from public.profiles where id = p_customer_id) then
    raise exception using errcode = 'P0002', message = 'notification_customer_not_found';
  end if;
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'notification_request_id_required';
  end if;
  if char_length(v_title) not between 3 and 120 or v_title ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'notification_title_invalid';
  end if;
  if char_length(v_body) > 1000 or regexp_replace(v_body, E'[\\r\\n\\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'notification_body_invalid';
  end if;
  if v_kind not in ('info', 'success', 'warning', 'error') then
    raise exception using errcode = '22023', message = 'notification_kind_invalid';
  end if;
  if v_link not in (
    '/dashboard/notifications', '/dashboard/orders', '/dashboard/payments',
    '/dashboard/bookings', '/dashboard/courses', '/dashboard/books', '/dashboard/workshops'
  ) then
    raise exception using errcode = '22023', message = 'notification_link_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_existing
    from public.notifications
   where admin_request_id = p_request_id;
  if found then
    if v_existing.created_by = p_actor_id
       and v_existing.user_id = p_customer_id
       and v_existing.title = v_title
       and v_existing.body = v_body
       and v_existing.kind = v_kind
       and v_existing.link is not distinct from v_link then
      return v_existing.id;
    end if;
    raise exception using errcode = '23505', message = 'notification_request_collision';
  end if;

  insert into public.notifications(user_id, title, body, kind, link, created_by, admin_request_id)
  values (p_customer_id, v_title, v_body, v_kind, v_link, p_actor_id, p_request_id)
  returning id into v_notification_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'notification.sent',
    'notification',
    v_notification_id::text,
    jsonb_build_object(
      'kind', v_kind,
      'titleLength', char_length(v_title),
      'bodyLength', char_length(v_body),
      'hasBody', v_body <> '',
      'destination', v_link
    )
  );

  return v_notification_id;
end $$;

revoke all on function public.send_admin_notification(uuid, uuid, text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.send_admin_notification(uuid, uuid, text, text, uuid, text, text) to service_role;

comment on column public.notifications.created_by is 'Admin actor for manual notifications; null for system-generated notifications.';
comment on column public.notifications.admin_request_id is 'Opaque idempotency identity for one Admin send attempt; never a business or customer identifier.';
comment on function public.send_admin_notification(uuid,uuid,text,text,uuid,text,text) is
  'Service-only atomic Admin notification with notifications.send recheck, strict destination/content validation, idempotency and content-free audit metadata.';

-- Rollback-by-forward-fix: keep delivered notifications and audit history. A
-- later migration may replace this RPC or narrow its destination allowlist.
