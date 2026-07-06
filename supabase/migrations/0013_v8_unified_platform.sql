-- V8 unified platform hardening: commerce, CMS, reports, and secured learning access.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_ar text not null,
  description_ar text default '',
  product_type text not null check (product_type in ('book','course','workshop','session','bundle','vip_program','free_resource')),
  status text not null default 'draft' check (status in ('draft','review','published','coming_soon','hidden','archived')),
  price_egp numeric(12,2) not null default 0,
  cover_url text,
  source_table text,
  source_id uuid,
  access_mode text not null default 'manual_payment' check (access_mode in ('free','manual_payment','paid_access','admin_grant')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_bundles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  child_product_id uuid references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  unique(product_id, child_product_id)
);

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  status text not null default 'open' check (status in ('open','submitted','completed','cancelled','expired')),
  coupon_code text,
  subtotal_egp numeric(12,2) not null default 0,
  discount_egp numeric(12,2) not null default 0,
  total_egp numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  section_key text not null,
  title_ar text,
  subtitle_ar text,
  body_ar text,
  cta_label_ar text,
  cta_href text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(page_key, section_key)
);

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label_ar text not null,
  href text not null,
  area text not null default 'public' check (area in ('public','dashboard','admin','footer')),
  is_visible boolean not null default true,
  requires_feature text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id uuid,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  completed_lessons integer not null default 0,
  total_lessons integer not null default 0,
  last_lesson_id text,
  snapshot_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique(user_id, course_id, snapshot_date)
);

create table if not exists public.offer_targets (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers(id) on delete cascade,
  target_type text not null check (target_type in ('book','course','workshop','session','bundle','all')),
  target_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists products_type_status_idx on public.products(product_type, status, sort_order);
create index if not exists checkout_sessions_user_idx on public.checkout_sessions(user_id, created_at desc);
create index if not exists page_sections_page_idx on public.page_sections(page_key, is_visible, sort_order);
create index if not exists navigation_items_area_idx on public.navigation_items(area, is_visible, sort_order);
create index if not exists learning_snapshots_user_idx on public.learning_snapshots(user_id, snapshot_date desc);

alter table public.products enable row level security;
alter table public.product_bundles enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.page_sections enable row level security;
alter table public.navigation_items enable row level security;
alter table public.learning_snapshots enable row level security;
alter table public.offer_targets enable row level security;

-- Safe public reads only for published public surfaces.
drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products" on public.products for select using (status = 'published');

drop policy if exists "Public can read visible page sections" on public.page_sections;
create policy "Public can read visible page sections" on public.page_sections for select using (is_visible = true);

drop policy if exists "Public can read visible navigation" on public.navigation_items;
create policy "Public can read visible navigation" on public.navigation_items for select using (is_visible = true);

-- Users can read and manage only their own checkout sessions.
drop policy if exists "Users manage own checkout sessions" on public.checkout_sessions;
create policy "Users manage own checkout sessions" on public.checkout_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users read own learning snapshots" on public.learning_snapshots;
create policy "Users read own learning snapshots" on public.learning_snapshots for select using (auth.uid() = user_id);

-- Admin service-role/RPCs bypass via service role. Admin UI should use server-side clients and existing role checks.

insert into public.page_sections (page_key, section_key, title_ar, subtitle_ar, is_visible, sort_order, metadata)
values
  ('home', 'hero', 'النمو العاطفي يبدأ بوضوحك مع نفسك', 'مساحة راقية للتعلم والحجز والكتب والورش.', true, 10, '{"version":"v8"}'::jsonb),
  ('courses', 'waitlist', 'الكورسات تُفتح فقط عندما تكون جاهزة', 'لا توجد منتجات تعليمية وهمية في الإنتاج.', true, 20, '{"feature":"courses_enabled"}'::jsonb),
  ('admin', 'operating_system', 'Admin OS', 'تشغيل كامل للمنتجات والدفع والعملاء والتقارير.', true, 30, '{"version":"v8"}'::jsonb)
on conflict (page_key, section_key) do update set
  title_ar = excluded.title_ar,
  subtitle_ar = excluded.subtitle_ar,
  is_visible = excluded.is_visible,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();
