-- 008: CMS — pages, sections, navigation, articles, media, settings, flags, reviews, inbox, newsletter
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  seo_title text,
  seo_description text,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger pages_updated before update on public.pages for each row execute function public.set_updated_at();

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  kind text not null,
  sort int not null default 0,
  is_visible boolean not null default true,
  content jsonb not null default '{}'
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu text not null check (menu in ('header','footer_platform','footer_about','footer_legal')),
  label text not null,
  href text not null,
  sort int not null default 0,
  is_visible boolean not null default true,
  parent_id uuid references public.navigation_items(id) on delete cascade
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  cover_url text,
  author_id uuid references auth.users(id),
  is_published boolean not null default false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger articles_updated before update on public.articles for each row execute function public.set_updated_at();

create table public.article_tags (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  tag text not null,
  unique (article_id, tag)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  alt text not null default '',
  kind text not null default 'image',
  size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}',
  is_public boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated before update on public.site_settings for each row execute function public.set_updated_at();

create table public.feature_flags (
  key text primary key,
  is_enabled boolean not null default false,
  description text not null default '',
  updated_at timestamptz not null default now()
);
create trigger feature_flags_updated before update on public.feature_flags for each row execute function public.set_updated_at();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete cascade,
  display_name text,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  is_approved boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null default '',
  message text not null,
  status text not null default 'new' check (status in ('new','read','replied','archived')),
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- RLS
alter table public.pages enable row level security;
alter table public.page_sections enable row level security;
alter table public.navigation_items enable row level security;
alter table public.articles enable row level security;
alter table public.article_tags enable row level security;
alter table public.media_assets enable row level security;
alter table public.site_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.reviews enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "pages: public read published" on public.pages for select using (is_published or public.is_admin());
create policy "pages: admin write" on public.pages for all using (public.is_admin()) with check (public.is_admin());
create policy "page_sections: public read visible" on public.page_sections for select
  using (public.is_admin() or (is_visible and exists (select 1 from public.pages p where p.id = page_id and p.is_published)));
create policy "page_sections: admin write" on public.page_sections for all using (public.is_admin()) with check (public.is_admin());

create policy "navigation: public read visible" on public.navigation_items for select using (is_visible or public.is_admin());
create policy "navigation: admin write" on public.navigation_items for all using (public.is_admin()) with check (public.is_admin());

create policy "articles: public read published" on public.articles for select using (is_published or public.is_admin());
create policy "articles: admin write" on public.articles for all using (public.is_admin()) with check (public.is_admin());
create policy "article_tags: public read" on public.article_tags for select using (true);
create policy "article_tags: admin write" on public.article_tags for all using (public.is_admin()) with check (public.is_admin());

create policy "media: public read" on public.media_assets for select using (true);
create policy "media: admin write" on public.media_assets for all using (public.is_admin()) with check (public.is_admin());

create policy "settings: public read public keys" on public.site_settings for select
  using (is_public or public.is_admin());
create policy "settings: admin write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

create policy "flags: public read" on public.feature_flags for select using (true);
create policy "flags: admin write" on public.feature_flags for all using (public.is_admin()) with check (public.is_admin());

create policy "reviews: public read approved" on public.reviews for select
  using (is_approved or user_id = auth.uid() or public.is_admin());
create policy "reviews: authed insert" on public.reviews for insert
  with check (auth.uid() is not null and user_id = auth.uid() and is_approved = false and is_featured = false);
create policy "reviews: admin write" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

create policy "contact: anyone insert" on public.contact_messages for insert with check (true);
create policy "contact: admin read/write" on public.contact_messages for select using (public.is_admin());
create policy "contact: admin update" on public.contact_messages for update using (public.is_admin());

create policy "newsletter: anyone subscribe" on public.newsletter_subscribers for insert with check (status = 'subscribed');
create policy "newsletter: admin read" on public.newsletter_subscribers for select using (public.is_admin());
create policy "newsletter: admin update" on public.newsletter_subscribers for update using (public.is_admin());
