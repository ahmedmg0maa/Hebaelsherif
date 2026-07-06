-- V7 Platform Foundation: feature flags, course LMS, workshops, offers, commerce extras.
-- Follows the incident-safe rules: no non-immutable generated columns, enum
-- comparisons via ::text inside views, advisory locks for capacity-sensitive writes.

-- ---------------------------------------------------------------------------
-- 1. Feature flags (public read; admin write). Public UI reads the 'features'
--    key through site_settings RLS (is_public = true).
-- ---------------------------------------------------------------------------

insert into public.site_settings (key, value, is_public)
values (
  'features',
  '{"courses_enabled":false,"workshops_enabled":false,"books_enabled":true,"booking_enabled":true,"maintenance_mode":false}',
  true
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Course LMS structure (courses/course_lessons compat tables exist in 0008;
--    ids there are text, so LMS tables reference text course/lesson ids).
-- ---------------------------------------------------------------------------

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft','published','hidden')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.course_lessons add column if not exists module_id uuid references public.course_modules(id) on delete set null;
alter table public.course_lessons add column if not exists video_url text;
alter table public.course_lessons add column if not exists is_free_preview boolean not null default false;

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.course_lessons(id) on delete cascade,
  title text not null,
  file_url text not null,
  kind text not null default 'file' check (kind in ('file','link','audio','worksheet')),
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active','revoked','expired','completed')),
  source text not null default 'purchase' check (source in ('purchase','grant','bundle','free')),
  order_id uuid references public.orders(id) on delete set null,
  enrolled_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  lesson_id text not null references public.course_lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  seconds_watched int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, lesson_id)
);

create table if not exists public.course_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  lesson_id text references public.course_lessons(id) on delete set null,
  note text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  certificate_number text not null unique,
  issued_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, course_id)
);

create index if not exists course_modules_course_idx on public.course_modules(course_id, sort_order);
create index if not exists lesson_resources_lesson_idx on public.lesson_resources(lesson_id, sort_order);
create index if not exists course_enrollments_user_idx on public.course_enrollments(user_id, status);
create index if not exists course_enrollments_course_idx on public.course_enrollments(course_id, status);
create index if not exists lesson_progress_user_course_idx on public.lesson_progress(user_id, course_id);

-- ---------------------------------------------------------------------------
-- 3. Workshops
-- ---------------------------------------------------------------------------

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  subtitle_ar text,
  description_ar text not null default '',
  kind text not null default 'live' check (kind in ('live','recorded','hybrid','webinar','group')),
  price_egp numeric(10,2) not null default 0,
  currency text not null default 'EGP',
  capacity int check (capacity is null or capacity > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'Africa/Cairo',
  cover_url text,
  status public.publish_status not null default 'draft',
  registration_open boolean not null default true,
  sort_order int not null default 0,
  seo_title text,
  seo_description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (starts_at is null or ends_at is null or starts_at < ends_at)
);

-- Live/replay links live in a separate table so workshop rows can stay
-- public-readable without leaking paid access links (RLS is row-level).
create table if not exists public.workshop_access_links (
  workshop_id uuid primary key references public.workshops(id) on delete cascade,
  live_url text,
  replay_url text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  status text not null default 'pending' check (status in ('pending','payment_submitted','confirmed','waitlisted','cancelled','rejected','attended')),
  payment_status text not null default 'pending' check (payment_status in ('not_required','pending','submitted','confirmed','failed','refunded')),
  payment_method public.payment_method,
  amount numeric(10,2) not null default 0,
  coupon_id uuid references public.coupons(id),
  order_id uuid references public.orders(id) on delete set null,
  notes text,
  admin_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workshop_id, user_id)
);

create table if not exists public.workshop_attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.workshop_registrations(id) on delete cascade,
  attended boolean not null default false,
  attended_at timestamptz,
  marked_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (registration_id)
);

create table if not exists public.workshop_resources (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  title text not null,
  file_url text not null,
  kind text not null default 'file' check (kind in ('file','link','recording','worksheet')),
  is_replay boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workshops_status_idx on public.workshops(status, starts_at);
create index if not exists workshop_registrations_workshop_idx on public.workshop_registrations(workshop_id, status);
create index if not exists workshop_registrations_user_idx on public.workshop_registrations(user_id, created_at desc);

-- Capacity-safe registration: advisory lock per workshop prevents overselling
-- seats under concurrent requests (same pattern as create_booking_with_lock).
create or replace function public.register_workshop_with_lock(p_workshop_id uuid, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user uuid := auth.uid();
  ws public.workshops%rowtype;
  taken int;
  reg_id uuid;
  reg_status text := 'pending';
begin
  if auth_user is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into ws from public.workshops where id = p_workshop_id;
  if not found or ws.status::text <> 'published' then
    raise exception 'WORKSHOP_NOT_AVAILABLE';
  end if;
  if not ws.registration_open then
    raise exception 'REGISTRATION_CLOSED';
  end if;
  if ws.starts_at is not null and ws.starts_at <= now() and ws.kind in ('live','webinar','group') then
    raise exception 'WORKSHOP_ALREADY_STARTED';
  end if;

  perform pg_advisory_xact_lock(hashtext('workshop:' || p_workshop_id::text));

  if ws.capacity is not null then
    select count(*) into taken
    from public.workshop_registrations
    where workshop_id = p_workshop_id
      and status in ('pending','payment_submitted','confirmed','attended');
    if taken >= ws.capacity then
      reg_status := 'waitlisted';
    end if;
  end if;

  if ws.price_egp = 0 then
    reg_status := case when reg_status = 'waitlisted' then 'waitlisted' else 'confirmed' end;
  end if;

  insert into public.workshop_registrations (
    workshop_id, user_id, customer_name, customer_email, customer_phone,
    status, payment_status, payment_method, amount, notes
  ) values (
    p_workshop_id,
    auth_user,
    coalesce(payload->>'name', ''),
    coalesce(payload->>'email', ''),
    nullif(payload->>'phone', ''),
    reg_status,
    case when ws.price_egp = 0 then 'not_required' else 'pending' end,
    nullif(payload->>'paymentMethod', '')::public.payment_method,
    ws.price_egp,
    nullif(payload->>'notes', '')
  ) returning id into reg_id;

  insert into public.notifications (user_id, audience, type, title, body, href)
  values (
    auth_user, 'user', 'workshop_registered',
    'تم استلام تسجيلك في الورشة',
    case when reg_status = 'waitlisted'
      then 'الورشة مكتملة حاليًا وتمت إضافتك إلى قائمة الانتظار.'
      else 'سنراجع تسجيلك ونرسل لك تأكيد الحضور قريبًا.'
    end,
    '/dashboard'
  );

  return jsonb_build_object('registrationId', reg_id, 'status', reg_status);
exception
  when unique_violation then
    raise exception 'ALREADY_REGISTERED';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Offers / countdown campaigns (display + discount orchestration layer;
--    coupons remain the redemption engine and stay non-public).
-- ---------------------------------------------------------------------------

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  description_ar text,
  discount_type text not null default 'percentage' check (discount_type in ('percentage','fixed','none')),
  discount_value numeric(10,2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  countdown_enabled boolean not null default false,
  target_type text not null default 'all' check (target_type in ('all','book','course','workshop','session','bundle')),
  target_ids text[] not null default '{}',
  coupon_id uuid references public.coupons(id) on delete set null,
  public_coupon_code text,
  usage_limit int,
  per_user_limit int,
  minimum_amount numeric(10,2) not null default 0,
  badge_text_ar text,
  cta_label_ar text,
  cta_href text,
  status text not null default 'draft' check (status in ('draft','scheduled','active','expired','archived')),
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create index if not exists offers_status_window_idx on public.offers(status, starts_at, ends_at);

alter table public.coupons add column if not exists per_user_limit int;

-- ---------------------------------------------------------------------------
-- 5. Commerce extras
-- ---------------------------------------------------------------------------

create table if not exists public.book_download_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  file_id uuid references public.book_files(id) on delete set null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  amount numeric(10,2) not null default 0,
  reason text,
  status text not null default 'requested' check (status in ('requested','approved','rejected','processed')),
  processed_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists book_download_logs_book_idx on public.book_download_logs(book_id, created_at desc);
create index if not exists refunds_status_idx on public.refunds(status, created_at desc);

-- ---------------------------------------------------------------------------
-- 6. updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'course_modules','lesson_resources','course_enrollments','lesson_progress',
    'course_notes','workshops','workshop_registrations','workshop_resources',
    'offers','refunds'
  ] loop
    if not exists (select 1 from pg_trigger where tgname = 'trg_' || t || '_updated_at') then
      execute format(
        'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        t, t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------

alter table public.course_modules enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.course_notes enable row level security;
alter table public.certificates enable row level security;
alter table public.workshops enable row level security;
alter table public.workshop_access_links enable row level security;
alter table public.workshop_registrations enable row level security;
alter table public.workshop_attendance enable row level security;
alter table public.workshop_resources enable row level security;
alter table public.offers enable row level security;
alter table public.book_download_logs enable row level security;
alter table public.refunds enable row level security;

-- Course LMS
create policy "course_modules_public_or_admin" on public.course_modules for select
  using (status = 'published' or public.is_admin(array['owner','super_admin','admin','content_manager','course_manager']::public.app_role[]));
create policy "course_modules_admin_write" on public.course_modules for all
  using (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager']::public.app_role[]));

create policy "lesson_resources_enrolled_or_admin" on public.lesson_resources for select
  using (
    public.is_admin(array['owner','super_admin','admin','content_manager','course_manager']::public.app_role[])
    or exists (
      select 1
      from public.course_lessons cl
      join public.course_enrollments ce on ce.course_id = cl.course_id
      where cl.id = lesson_resources.lesson_id
        and ce.user_id = auth.uid()
        and ce.status = 'active'
        and (ce.expires_at is null or ce.expires_at > now())
    )
  );
create policy "lesson_resources_admin_write" on public.lesson_resources for all
  using (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager']::public.app_role[]));

create policy "course_enrollments_own_or_admin" on public.course_enrollments for select
  using (user_id = auth.uid() or public.is_admin());
create policy "course_enrollments_admin_write" on public.course_enrollments for all
  using (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager','finance']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager','finance']::public.app_role[]));

create policy "lesson_progress_own" on public.lesson_progress for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "course_notes_own" on public.course_notes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "certificates_own_or_admin" on public.certificates for select
  using (user_id = auth.uid() or public.is_admin());
create policy "certificates_admin_write" on public.certificates for all
  using (public.is_admin(array['owner','super_admin','admin','course_manager']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','course_manager']::public.app_role[]));

-- Workshops
create policy "workshops_public_or_admin" on public.workshops for select
  using (status::text in ('published','coming_soon') or public.is_admin());
create policy "workshops_admin_write" on public.workshops for all
  using (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager','operations']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager','operations']::public.app_role[]));

create policy "workshop_links_confirmed_or_admin" on public.workshop_access_links for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.workshop_registrations wr
      where wr.workshop_id = workshop_access_links.workshop_id
        and wr.user_id = auth.uid()
        and wr.status in ('confirmed','attended')
    )
  );
create policy "workshop_links_admin_write" on public.workshop_access_links for all
  using (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager','operations']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager','operations']::public.app_role[]));

create policy "workshop_regs_own_or_admin" on public.workshop_registrations for select
  using (user_id = auth.uid() or public.is_admin());
create policy "workshop_regs_insert_own" on public.workshop_registrations for insert
  with check (user_id = auth.uid());
create policy "workshop_regs_admin_write" on public.workshop_registrations for update
  using (public.is_admin(array['owner','super_admin','admin','operations','support','finance']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','operations','support','finance']::public.app_role[]));

create policy "workshop_attendance_admin" on public.workshop_attendance for all
  using (public.is_admin(array['owner','super_admin','admin','operations','support']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','operations','support']::public.app_role[]));
create policy "workshop_attendance_own_read" on public.workshop_attendance for select
  using (exists (
    select 1 from public.workshop_registrations wr
    where wr.id = workshop_attendance.registration_id and wr.user_id = auth.uid()
  ));

create policy "workshop_resources_confirmed_or_admin" on public.workshop_resources for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.workshop_registrations wr
      where wr.workshop_id = workshop_resources.workshop_id
        and wr.user_id = auth.uid()
        and wr.status in ('confirmed','attended')
    )
  );
create policy "workshop_resources_admin_write" on public.workshop_resources for all
  using (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager','operations']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','content_manager','course_manager','operations']::public.app_role[]));

-- Offers: active offers are public marketing content; drafts are admin-only.
create policy "offers_public_active" on public.offers for select
  using (
    (status = 'active' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
    or public.is_admin()
  );
create policy "offers_admin_write" on public.offers for all
  using (public.is_admin(array['owner','super_admin','admin','finance','content_manager','operations']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','finance','content_manager','operations']::public.app_role[]));

-- Commerce extras
create policy "book_download_logs_admin_read" on public.book_download_logs for select
  using (public.is_admin(array['owner','super_admin','admin','content_manager','finance']::public.app_role[]));
create policy "book_download_logs_insert_own" on public.book_download_logs for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "refunds_own_or_admin" on public.refunds for select
  using (user_id = auth.uid() or public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]));
create policy "refunds_admin_write" on public.refunds for all
  using (public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]))
  with check (public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]));
