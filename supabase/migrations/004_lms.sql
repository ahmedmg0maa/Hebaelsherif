-- 004: LMS — courses, curriculum, enrollment, progress, notes, reviews, certificates
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  level text not null default 'all' check (level in ('beginner','intermediate','advanced','all')),
  duration_minutes int not null default 0,
  cover_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger courses_updated before update on public.courses for each row execute function public.set_updated_at();

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort int not null default 0
);

create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  description text not null default '',
  video_path text,
  duration_seconds int not null default 0,
  sort int not null default 0,
  is_preview boolean not null default false
);

create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  title text not null,
  file_path text not null,
  kind text not null default 'pdf' check (kind in ('pdf','zip','link','audio')),
  size_bytes bigint
);

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null default 'purchase',
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  percent numeric(5,2) not null default 0,
  last_lesson_id uuid references public.course_lessons(id),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  seconds_watched int not null default 0,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

create table public.course_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger course_notes_updated before update on public.course_notes for each row execute function public.set_updated_at();

create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  serial text not null unique,
  file_path text,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- helper: does current user have an enrollment for the course owning a lesson?
create or replace function public.is_enrolled(course uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.course_enrollments where course_id = course and user_id = uid);
$$;

-- RLS
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_progress enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.course_notes enable row level security;
alter table public.course_reviews enable row level security;
alter table public.certificates enable row level security;

create policy "courses: public read published" on public.courses for select using (is_published or public.is_admin());
create policy "courses: admin write" on public.courses for all using (public.is_admin()) with check (public.is_admin());

create policy "modules: read via course" on public.course_modules for select
  using (exists (select 1 from public.courses c where c.id = course_id and (c.is_published or public.is_admin())));
create policy "modules: admin write" on public.course_modules for all using (public.is_admin()) with check (public.is_admin());

-- lesson metadata visible for published courses (curriculum preview);
-- video playback requires enrollment and goes through server-side signed URLs.
create policy "lessons: read via module" on public.course_lessons for select
  using (exists (
    select 1 from public.course_modules m join public.courses c on c.id = m.course_id
    where m.id = module_id and (c.is_published or public.is_admin())));
create policy "lessons: admin write" on public.course_lessons for all using (public.is_admin()) with check (public.is_admin());

create policy "lesson_resources: enrolled read" on public.lesson_resources for select
  using (public.is_admin() or exists (
    select 1 from public.course_lessons l join public.course_modules m on m.id = l.module_id
    where l.id = lesson_id and public.is_enrolled(m.course_id)));
create policy "lesson_resources: admin write" on public.lesson_resources for all using (public.is_admin()) with check (public.is_admin());

create policy "enrollments: own read" on public.course_enrollments for select using (user_id = auth.uid() or public.is_admin());
create policy "enrollments: admin write" on public.course_enrollments for all using (public.is_admin()) with check (public.is_admin());

create policy "course_progress: own" on public.course_progress for all
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid());
create policy "lesson_progress: own" on public.lesson_progress for all
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid());
create policy "course_notes: own" on public.course_notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "course_reviews: public read approved" on public.course_reviews for select
  using (is_approved or user_id = auth.uid() or public.is_admin());
create policy "course_reviews: enrolled insert" on public.course_reviews for insert
  with check (user_id = auth.uid() and public.is_enrolled(course_id));
create policy "course_reviews: own update" on public.course_reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid() and is_approved = false);
create policy "course_reviews: admin all" on public.course_reviews for all using (public.is_admin()) with check (public.is_admin());

create policy "certificates: own read" on public.certificates for select using (user_id = auth.uid() or public.is_admin());
create policy "certificates: admin write" on public.certificates for all using (public.is_admin()) with check (public.is_admin());
