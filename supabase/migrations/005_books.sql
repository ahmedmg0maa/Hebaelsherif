-- 005: books, files, access, download logs, versions
create table public.books (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  author text not null default 'هبة الشريف',
  pages_count int,
  cover_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger books_updated before update on public.books for each row execute function public.set_updated_at();

create table public.book_versions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  version text not null,
  changelog text not null default '',
  created_at timestamptz not null default now(),
  unique (book_id, version)
);

create table public.book_files (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  version_id uuid references public.book_versions(id) on delete set null,
  format text not null default 'pdf' check (format in ('pdf','epub')),
  storage_path text not null,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table public.book_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  order_id uuid references public.orders(id),
  granted_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create table public.book_download_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  book_file_id uuid not null references public.book_files(id) on delete cascade,
  ip inet,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.books enable row level security;
alter table public.book_versions enable row level security;
alter table public.book_files enable row level security;
alter table public.book_access enable row level security;
alter table public.book_download_logs enable row level security;

create policy "books: public read published" on public.books for select using (is_published or public.is_admin());
create policy "books: admin write" on public.books for all using (public.is_admin()) with check (public.is_admin());

create policy "book_versions: owner-of-access read" on public.book_versions for select
  using (public.is_admin() or exists (select 1 from public.book_access a where a.book_id = book_versions.book_id and a.user_id = auth.uid()));
create policy "book_versions: admin write" on public.book_versions for all using (public.is_admin()) with check (public.is_admin());

create policy "book_files: access read" on public.book_files for select
  using (public.is_admin() or exists (select 1 from public.book_access a where a.book_id = book_files.book_id and a.user_id = auth.uid()));
create policy "book_files: admin write" on public.book_files for all using (public.is_admin()) with check (public.is_admin());

create policy "book_access: own read" on public.book_access for select using (user_id = auth.uid() or public.is_admin());
create policy "book_access: admin write" on public.book_access for all using (public.is_admin()) with check (public.is_admin());

create policy "book_download_logs: own insert" on public.book_download_logs for insert with check (user_id = auth.uid());
create policy "book_download_logs: admin read" on public.book_download_logs for select using (public.is_admin());
