-- V5 compatibility layer for the Supabase migration cutover.
-- These tables/columns keep older admin/dashboard modules operational while the UI is progressively refactored to native Supabase queries.

alter table public.profiles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.bookings add column if not exists service_title text;
alter table public.bookings add column if not exists meeting_url text;
alter table public.bookings add column if not exists cancellation_reason text;
alter table public.bookings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists product_id text;
alter table public.orders add column if not exists product_type text;
alter table public.orders add column if not exists product_title text;
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_proof_url text;
alter table public.orders add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.books add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.articles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.reviews add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.contact_messages add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.newsletter_subscribers add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.payment_proofs add column if not exists proof_url text;
alter table public.payment_proofs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists role text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists entity_type text;
alter table public.notifications add column if not exists entity_id text;
alter table public.notifications add column if not exists priority text not null default 'normal';
alter table public.notifications add column if not exists read boolean not null default false;
alter table public.notifications add column if not exists status text not null default 'unread';
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists read_by uuid references auth.users(id) on delete set null;
alter table public.notifications add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.audit_logs add column if not exists admin_id text;
alter table public.audit_logs add column if not exists admin_email text;
alter table public.audit_logs add column if not exists target_type text;
alter table public.audit_logs add column if not exists target_id text;
alter table public.audit_logs add column if not exists before jsonb;
alter table public.audit_logs add column if not exists after jsonb;
alter table public.audit_logs add column if not exists message text;
alter table public.audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.content_access add column if not exists product_id text;
alter table public.content_access add column if not exists product_type text;
alter table public.content_access add column if not exists order_id text;
alter table public.content_access add column if not exists granted_by text;
alter table public.content_access add column if not exists granted_at timestamptz;
alter table public.content_access add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.analytics_events add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_notifications_updated_at') then
    create trigger trg_notifications_updated_at before update on public.notifications for each row execute function public.set_updated_at();
  end if;
end $$;

create table if not exists public.courses (
  id text primary key default gen_random_uuid()::text,
  slug text unique,
  title_ar text,
  subtitle_ar text,
  description_ar text not null default '',
  price_egp numeric(10,2) not null default 0,
  cover_url text,
  status text not null default 'draft',
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.course_lessons (
  id text primary key default gen_random_uuid()::text,
  course_id text references public.courses(id) on delete cascade,
  title text,
  description text,
  stage_title text,
  duration int not null default 0,
  sort_order int not null default 0,
  "order" int not null default 0,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.protected_content (
  id text primary key,
  product_id text,
  product_type text,
  content_url text,
  resource_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reading_progress (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  book_id text,
  chapter text,
  progress_percent numeric(5,2) not null default 0,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.course_progress (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  course_id text,
  lesson_id text,
  progress_percent numeric(5,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leads (
  id text primary key default gen_random_uuid()::text,
  name text,
  email text,
  phone text,
  status text not null default 'new',
  source text,
  admin_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_tasks (
  id text primary key default gen_random_uuid()::text,
  title text,
  description text,
  status text not null default 'open',
  priority text not null default 'normal',
  assigned_to text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_templates (
  id text primary key default gen_random_uuid()::text,
  title text,
  subject text,
  body text,
  type text,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_attempts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete set null,
  order_id text,
  booking_id text,
  amount numeric(10,2) not null default 0,
  currency text not null default 'EGP',
  method text,
  reference text,
  proof_url text,
  status text not null default 'submitted',
  confirmed_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  event_name text,
  page_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bookings_timeline (
  id text primary key default gen_random_uuid()::text,
  booking_id text,
  action text,
  title text,
  by text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders_timeline (
  id text primary key default gen_random_uuid()::text,
  order_id text,
  action text,
  title text,
  by text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_timeline (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete set null,
  action text,
  title text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customer_notes (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete set null,
  admin_id text,
  note text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.timeline (
  id text primary key default gen_random_uuid()::text,
  action text,
  title text,
  by text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists courses_status_idx on public.courses(status, sort_order);
create index if not exists course_lessons_course_idx on public.course_lessons(course_id, sort_order);
create index if not exists reading_progress_user_idx on public.reading_progress(user_id, book_id);
create index if not exists course_progress_user_idx on public.course_progress(user_id, course_id);
create index if not exists orders_product_idx on public.orders(product_type, product_id);
create index if not exists content_access_product_idx on public.content_access(product_type, product_id);

alter table public.courses enable row level security;
alter table public.course_lessons enable row level security;
alter table public.protected_content enable row level security;
alter table public.reading_progress enable row level security;
alter table public.course_progress enable row level security;
alter table public.leads enable row level security;
alter table public.admin_tasks enable row level security;
alter table public.notification_templates enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.events enable row level security;
alter table public.bookings_timeline enable row level security;
alter table public.orders_timeline enable row level security;
alter table public.activity_timeline enable row level security;
alter table public.customer_notes enable row level security;
alter table public.timeline enable row level security;

create policy "courses_public_or_admin" on public.courses for select using (status in ('published','coming_soon') or public.is_admin());
create policy "courses_admin_write" on public.courses for all using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "course_lessons_public_or_access" on public.course_lessons for select using (status = 'published' or public.is_admin() or exists (select 1 from public.content_access ca where ca.user_id = auth.uid() and ca.product_type = 'course' and ca.product_id = course_id and ca.status = 'active'));
create policy "course_lessons_admin_write" on public.course_lessons for all using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "protected_content_admin_or_access" on public.protected_content for select using (public.is_admin() or exists (select 1 from public.content_access ca where ca.user_id = auth.uid() and ca.product_type = protected_content.product_type and ca.product_id = protected_content.product_id and ca.status = 'active'));
create policy "protected_content_admin_write" on public.protected_content for all using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "reading_progress_own_or_admin" on public.reading_progress for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "course_progress_own_or_admin" on public.course_progress for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "leads_admin_only" on public.leads for all using (public.is_admin(array['owner','super_admin','admin','support']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','support']::public.app_role[]));
create policy "admin_tasks_admin_only" on public.admin_tasks for all using (public.is_admin(array['owner','super_admin','admin','support']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','support']::public.app_role[]));
create policy "notification_templates_admin_only" on public.notification_templates for all using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "payment_attempts_own_or_admin" on public.payment_attempts for select using (user_id = auth.uid() or public.is_admin(array['owner','super_admin','admin','finance','support']::public.app_role[]));
create policy "payment_attempts_admin_write" on public.payment_attempts for all using (public.is_admin(array['owner','super_admin','admin','finance','support']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','finance','support']::public.app_role[]));
create policy "events_insert_public" on public.events for insert with check (true);
create policy "events_admin_read" on public.events for select using (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));
create policy "bookings_timeline_related" on public.bookings_timeline for select using (public.is_admin() or exists (select 1 from public.bookings b where b.id::text = bookings_timeline.booking_id and b.user_id = auth.uid()));
create policy "bookings_timeline_admin_write" on public.bookings_timeline for all using (public.is_admin()) with check (public.is_admin());
create policy "orders_timeline_related" on public.orders_timeline for select using (public.is_admin() or exists (select 1 from public.orders o where o.id::text = orders_timeline.order_id and o.user_id = auth.uid()));
create policy "orders_timeline_admin_write" on public.orders_timeline for all using (public.is_admin()) with check (public.is_admin());
create policy "activity_timeline_own_or_admin" on public.activity_timeline for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "customer_notes_admin_only" on public.customer_notes for all using (public.is_admin(array['owner','super_admin','admin','support']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','support']::public.app_role[]));
create policy "timeline_admin_only" on public.timeline for all using (public.is_admin()) with check (public.is_admin());
