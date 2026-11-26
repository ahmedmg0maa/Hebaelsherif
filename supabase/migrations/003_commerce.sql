-- 003: products, orders, payments, access, coupons, offers
create table public.products (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('book','course','workshop','session','bundle','vip','free_resource')),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text not null default '',
  price numeric(10,2) not null default 0,
  compare_at_price numeric(10,2),
  currency text not null default 'EGP',
  cover_url text,
  is_published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  is_active boolean not null default true
);

create table public.product_bundles (
  id uuid primary key default gen_random_uuid(),
  bundle_product_id uuid not null references public.products(id) on delete cascade,
  child_product_id uuid not null references public.products(id) on delete cascade,
  unique (bundle_product_id, child_product_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent','fixed')),
  value numeric(10,2) not null,
  max_uses int,
  max_uses_per_user int not null default 1,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('flash_sale','coupon_campaign','bundle','limited_seats','countdown','seasonal')),
  title text not null,
  description text not null default '',
  discount_kind text check (discount_kind in ('percent','fixed')),
  discount_value numeric(10,2),
  badge_text text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  usage_limit int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.offer_targets (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  product_type text,
  category text
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','awaiting_review','paid','expired','cancelled','refunded')),
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'EGP',
  coupon_id uuid references public.coupons(id),
  offer_id uuid references public.offers(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null,
  total numeric(10,2) not null
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  method text not null check (method in ('instapay','wallet','bank_transfer')),
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);
create index payments_status_idx on public.payments (status, created_at desc);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.content_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  source text not null default 'purchase' check (source in ('purchase','grant','free','bundle')),
  order_id uuid references public.orders(id),
  granted_by uuid references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  order_id uuid not null references public.orders(id),
  created_at timestamptz not null default now()
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  coupon_id uuid references public.coupons(id),
  status text not null default 'open' check (status in ('open','converted','abandoned')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- RLS
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_bundles enable row level security;
alter table public.coupons enable row level security;
alter table public.offers enable row level security;
alter table public.offer_targets enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.content_access enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.checkout_sessions enable row level security;

create policy "products: public read published" on public.products for select
  using (is_published or public.is_admin());
create policy "products: admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy "variants: public read active" on public.product_variants for select
  using (is_active or public.is_admin());
create policy "variants: admin write" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());

create policy "bundles: public read" on public.product_bundles for select using (true);
create policy "bundles: admin write" on public.product_bundles for all using (public.is_admin()) with check (public.is_admin());

-- coupons internals never public; validation happens server-side
create policy "coupons: admin only" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

create policy "offers: public read active" on public.offers for select
  using ((is_active and starts_at <= now() and (ends_at is null or ends_at > now())) or public.is_admin());
create policy "offers: admin write" on public.offers for all using (public.is_admin()) with check (public.is_admin());
create policy "offer_targets: public read" on public.offer_targets for select using (true);
create policy "offer_targets: admin write" on public.offer_targets for all using (public.is_admin()) with check (public.is_admin());

create policy "orders: own read" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "orders: own create pending" on public.orders for insert
  with check (user_id = auth.uid() and status = 'pending_payment');
create policy "orders: admin update" on public.orders for update using (public.is_admin());

create policy "order_items: own read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "order_items: own insert" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'pending_payment'));
create policy "order_items: admin write" on public.order_items for all using (public.is_admin()) with check (public.is_admin());

create policy "payments: own read" on public.payments for select using (user_id = auth.uid() or public.is_admin());
create policy "payments: own create pending" on public.payments for insert
  with check (user_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "payments: admin update" on public.payments for update using (public.is_admin());

create policy "payment_proofs: own read" on public.payment_proofs for select
  using (uploaded_by = auth.uid() or public.is_admin());
create policy "payment_proofs: own insert" on public.payment_proofs for insert
  with check (uploaded_by = auth.uid()
    and exists (select 1 from public.payments p where p.id = payment_id and p.user_id = auth.uid()));

create policy "content_access: own read" on public.content_access for select
  using (user_id = auth.uid() or public.is_admin());
create policy "content_access: admin write" on public.content_access for all using (public.is_admin()) with check (public.is_admin());

create policy "redemptions: own read" on public.coupon_redemptions for select
  using (user_id = auth.uid() or public.is_admin());
create policy "redemptions: admin write" on public.coupon_redemptions for all using (public.is_admin()) with check (public.is_admin());

create policy "checkout_sessions: own" on public.checkout_sessions for all
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
