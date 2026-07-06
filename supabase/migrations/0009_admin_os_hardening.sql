-- V6 Admin Operating System hardening: permissions, reports, settings and operational auditability.

create table if not exists public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  section text not null,
  can_view boolean not null default true,
  can_create boolean not null default false,
  can_update boolean not null default false,
  can_delete boolean not null default false,
  can_export boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(role, section)
);

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role public.app_role,
  action text not null,
  section text,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label_ar text not null,
  instructions_ar text,
  phone text,
  account_name text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  invoice_number text unique,
  subtotal numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'EGP',
  status text not null default 'issued',
  issued_at timestamptz not null default timezone('utc', now()),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_key text not null,
  date_from date,
  date_to date,
  metrics jsonb not null default '{}'::jsonb,
  generated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  source text not null default 'app',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_permissions enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.payment_methods enable row level security;
alter table public.invoices enable row level security;
alter table public.report_snapshots enable row level security;
alter table public.system_events enable row level security;

create policy "admin_permissions_owner_read" on public.admin_permissions for select using (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));
create policy "admin_permissions_owner_write" on public.admin_permissions for all using (public.is_admin(array['owner','super_admin']::public.app_role[])) with check (public.is_admin(array['owner','super_admin']::public.app_role[]));

create policy "admin_activity_admin_read" on public.admin_activity_logs for select using (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));
create policy "admin_activity_admin_insert" on public.admin_activity_logs for insert with check (public.is_admin());

create policy "payment_methods_public_active" on public.payment_methods for select using (is_active = true or public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]));
create policy "payment_methods_admin_write" on public.payment_methods for all using (public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]));

create policy "invoices_own_or_finance" on public.invoices for select using (user_id = auth.uid() or public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]));
create policy "invoices_finance_write" on public.invoices for all using (public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]));

create policy "report_snapshots_admin_read" on public.report_snapshots for select using (public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]));
create policy "report_snapshots_admin_write" on public.report_snapshots for all using (public.is_admin(array['owner','super_admin','admin']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));

create policy "system_events_admin_read" on public.system_events for select using (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));
create policy "system_events_service_insert" on public.system_events for insert with check (public.is_admin());

insert into public.payment_methods (code, label_ar, instructions_ar, phone, account_name, sort_order)
values
  ('instapay', 'InstaPay', 'حوّلي المبلغ ثم ارفعي صورة التحويل داخل لوحة حسابك.', '01037141322', 'Heba ElSherif', 1),
  ('vodafone_cash', 'Vodafone Cash', 'حوّلي المبلغ ثم ارفعي صورة التحويل داخل لوحة حسابك.', '01037141322', 'Heba ElSherif', 2),
  ('bank_transfer', 'تحويل بنكي', 'استخدمي بيانات التحويل المعروضة في صفحة الدفع ثم ارفعي الإثبات.', null, 'Heba ElSherif', 3)
on conflict (code) do update set
  label_ar = excluded.label_ar,
  instructions_ar = excluded.instructions_ar,
  phone = excluded.phone,
  account_name = excluded.account_name,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

insert into public.admin_permissions (role, section, can_view, can_create, can_update, can_delete, can_export)
values
  ('owner', 'all', true, true, true, true, true),
  ('super_admin', 'all', true, true, true, true, true),
  ('admin', 'operations', true, true, true, false, true),
  ('support', 'bookings', true, true, true, false, false),
  ('support', 'messages', true, true, true, false, false),
  ('finance', 'payments', true, true, true, false, true),
  ('finance', 'reports', true, false, false, false, true),
  ('content_manager', 'content', true, true, true, false, false),
  ('viewer', 'overview', true, false, false, false, false)
on conflict (role, section) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_update = excluded.can_update,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  updated_at = timezone('utc', now());

create or replace view public.admin_revenue_report as
select
  date_trunc('month', coalesce(o.created_at, b.created_at))::date as month,
  count(distinct o.id) as orders_count,
  count(distinct b.id) as bookings_count,
  coalesce(sum(case when o.payment_status in ('confirmed','paid','submitted') or o.status in ('paid','access_granted') then o.final_amount else 0 end), 0) as orders_revenue,
  coalesce(sum(case when b.payment_status in ('confirmed','submitted') or b.status in ('confirmed','completed') then b.final_amount else 0 end), 0) as bookings_revenue
from public.orders o
full outer join public.bookings b on false
group by 1;

create or replace view public.admin_booking_report as
select
  status,
  payment_status,
  count(*) as total,
  coalesce(sum(final_amount), 0) as amount,
  min(created_at) as first_created_at,
  max(created_at) as last_created_at
from public.bookings
group by status, payment_status;

create or replace function public.log_admin_activity(
  p_action text,
  p_section text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_before jsonb default null,
  p_after jsonb default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.admin_activity_logs(actor_id, action, section, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), p_action, p_section, p_entity_type, p_entity_id, p_before, p_after)
  returning id into v_id;
  return v_id;
end;
$$;
