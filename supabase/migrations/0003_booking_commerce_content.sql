create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  description_ar text,
  duration_minutes int not null check (duration_minutes in (60, 90)),
  price_egp numeric(10,2) not null check (price_egp >= 0),
  status public.publish_status not null default 'published',
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6),
  is_available boolean not null default true,
  start_time time not null,
  end_time time not null,
  slot_interval_minutes int not null default 30,
  buffer_minutes int not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (start_time < end_time)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  is_blocked boolean not null default true,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.coupon_type not null,
  value numeric(10,2) not null check (value >= 0),
  scope text not null default 'all' check (scope in ('sessions', 'books', 'courses', 'all')),
  min_amount numeric(10,2) not null default 0,
  usage_limit int,
  usage_count int not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  service_id uuid references public.services(id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_minutes int not null check (duration_minutes in (60, 90)),
  timezone text not null default 'Africa/Cairo',
  status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  payment_method public.payment_method,
  original_amount numeric(10,2) not null,
  discount_amount numeric(10,2) not null default 0,
  final_amount numeric(10,2) not null,
  coupon_id uuid references public.coupons(id),
  notes text,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (start_time < end_time),
  check (start_at < end_at)
);

-- slot_range must be trigger-maintained: tstzrange(timestamptz, timestamptz) is not
-- immutable, so a generated column fails on Supabase (V6 incident #1).
alter table public.bookings add column slot_range tstzrange not null;

create or replace function public.set_booking_slot_range()
returns trigger
language plpgsql
as $$
begin
  new.slot_range := tstzrange(new.start_at, new.end_at + interval '30 minutes', '[)');
  return new;
end;
$$;

create trigger trg_bookings_slot_range
before insert or update of start_at, end_at on public.bookings
for each row execute function public.set_booking_slot_range();

create index bookings_date_status_idx on public.bookings (date, status);
create index bookings_user_idx on public.bookings (user_id, created_at desc);
alter table public.bookings add constraint bookings_no_overlap exclude using gist (slot_range with &&) where (status in ('pending', 'awaiting_payment', 'payment_submitted', 'confirmed', 'reschedule_requested'));

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  old_status public.booking_status,
  new_status public.booking_status,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  payment_method public.payment_method,
  original_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  final_amount numeric(10,2) not null default 0,
  coupon_id uuid references public.coupons(id),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_type public.product_type not null,
  product_id uuid not null,
  title_snapshot text not null,
  price_snapshot numeric(10,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  method public.payment_method not null,
  reference text,
  screenshot_path text,
  note text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (booking_id is not null or order_id is not null)
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  amount_discounted numeric(10,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger trg_services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger trg_availability_rules_updated_at before update on public.availability_rules for each row execute function public.set_updated_at();
create trigger trg_availability_exceptions_updated_at before update on public.availability_exceptions for each row execute function public.set_updated_at();
create trigger trg_coupons_updated_at before update on public.coupons for each row execute function public.set_updated_at();
create trigger trg_bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
