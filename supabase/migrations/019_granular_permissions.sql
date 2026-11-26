-- 019: granular, server-verifiable admin permissions
alter table public.admin_roles drop constraint if exists admin_roles_role_check;
alter table public.admin_roles add constraint admin_roles_role_check
  check (role in ('owner','admin','operations','finance','content','marketing','support','editor'));

create or replace function public.has_permission(permission_name text, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles r
    where r.user_id = uid
      and (
        r.role = 'owner'
        or exists (
          select 1 from public.admin_permissions p
          where p.role = r.role and p.permission = permission_name
        )
      )
  );
$$;

revoke all on function public.has_permission(text, uuid) from public;
grant execute on function public.has_permission(text, uuid) to authenticated, service_role;

insert into public.admin_permissions (role, permission)
select role, permission from (values
  ('admin','admin.access'), ('admin','users.view'), ('admin','users.manage'),
  ('admin','payments.view'), ('admin','payments.approve'), ('admin','payments.reject'),
  ('admin','orders.view'), ('admin','orders.update'), ('admin','orders.refund'),
  ('admin','bookings.view'), ('admin','bookings.manage'), ('admin','availability.manage'), ('admin','packages.manage'),
  ('admin','catalog.view'), ('admin','catalog.manage'), ('admin','catalog.publish'), ('admin','catalog.delete'),
  ('admin','content.view'), ('admin','content.manage'), ('admin','content.publish'), ('admin','content.delete'), ('admin','learning.manage'),
  ('admin','media.view'), ('admin','media.manage'), ('admin','media.delete'),
  ('admin','settings.view'), ('admin','settings.manage'), ('admin','feature_flags.manage'),
  ('admin','inbox.view'), ('admin','inbox.manage'), ('admin','newsletter.manage'), ('admin','reviews.manage'),
  ('admin','reports.view'), ('admin','reports.export'), ('admin','reports.snapshot'),
  ('admin','marketing.manage'), ('admin','audit.view'), ('admin','system.view'), ('admin','notifications.send'), ('admin','admin.search'),

  ('operations','admin.access'), ('operations','users.view'), ('operations','orders.view'),
  ('operations','bookings.view'), ('operations','bookings.manage'), ('operations','availability.manage'), ('operations','packages.manage'),
  ('operations','inbox.view'), ('operations','inbox.manage'), ('operations','notifications.send'), ('operations','reports.view'), ('operations','admin.search'),

  ('finance','admin.access'), ('finance','users.view'), ('finance','payments.view'), ('finance','payments.approve'), ('finance','payments.reject'),
  ('finance','orders.view'), ('finance','orders.update'), ('finance','orders.refund'), ('finance','bookings.view'), ('finance','packages.manage'),
  ('finance','reports.view'), ('finance','reports.export'), ('finance','reports.snapshot'), ('finance','marketing.manage'), ('finance','audit.view'), ('finance','admin.search'),

  ('content','admin.access'), ('content','catalog.view'), ('content','catalog.manage'), ('content','catalog.publish'), ('content','catalog.delete'),
  ('content','content.view'), ('content','content.manage'), ('content','content.publish'), ('content','content.delete'), ('content','learning.manage'),
  ('content','media.view'), ('content','media.manage'), ('content','media.delete'), ('content','reviews.manage'), ('content','reports.view'), ('content','admin.search'),

  ('marketing','admin.access'), ('marketing','users.view'), ('marketing','catalog.view'), ('marketing','content.view'), ('marketing','content.manage'),
  ('marketing','content.publish'), ('marketing','media.view'), ('marketing','media.manage'), ('marketing','inbox.view'), ('marketing','newsletter.manage'),
  ('marketing','reviews.manage'), ('marketing','reports.view'), ('marketing','reports.export'), ('marketing','marketing.manage'), ('marketing','admin.search'),

  ('support','admin.access'), ('support','users.view'), ('support','payments.view'), ('support','orders.view'), ('support','bookings.view'),
  ('support','inbox.view'), ('support','inbox.manage'), ('support','reviews.manage'), ('support','notifications.send'), ('support','reports.view'), ('support','admin.search'),

  ('editor','admin.access'), ('editor','catalog.view'), ('editor','content.view'), ('editor','content.manage'),
  ('editor','learning.manage'), ('editor','media.view'), ('editor','media.manage'), ('editor','admin.search')
) as seed(role, permission)
on conflict (role, permission) do nothing;

create index if not exists admin_permissions_role_permission_idx
  on public.admin_permissions(role, permission);

comment on function public.has_permission(text, uuid) is
  'Checks effective admin permission. Owner is an explicit wildcard; all other roles require seeded mappings.';
