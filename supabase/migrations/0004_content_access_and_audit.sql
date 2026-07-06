create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  excerpt_ar text,
  body_ar text not null default '',
  cover_url text,
  status public.publish_status not null default 'draft',
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.article_tags (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.article_tag_map (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.article_tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  subtitle_ar text,
  description_ar text not null default '',
  emotional_promise text,
  price_egp numeric(10,2) not null default 0,
  cover_url text,
  sample_url text,
  status public.publish_status not null default 'draft',
  sort_order int not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.book_files (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  file_path text not null,
  file_type text not null default 'pdf',
  access_type text not null default 'purchased' check (access_type in ('preview', 'protected', 'purchased')),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.content_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type public.product_type not null,
  content_id uuid not null,
  source_order_id uuid references public.orders(id) on delete set null,
  status public.content_access_status not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, content_type, content_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  rating int not null check (rating between 1 and 5),
  text text not null,
  context text not null default 'general',
  status text not null default 'pending' check (status in ('pending','approved','rejected','hidden')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  topic text,
  message text not null,
  status text not null default 'new' check (status in ('new','read','replied','important','archived')),
  admin_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  audience text not null default 'user' check (audience in ('admin','user','all')),
  title text not null,
  body text not null,
  type text not null default 'system',
  href text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  event_name text not null,
  page_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger trg_articles_updated_at before update on public.articles for each row execute function public.set_updated_at();
create trigger trg_books_updated_at before update on public.books for each row execute function public.set_updated_at();
create trigger trg_reviews_updated_at before update on public.reviews for each row execute function public.set_updated_at();
create trigger trg_contact_messages_updated_at before update on public.contact_messages for each row execute function public.set_updated_at();
create trigger trg_newsletter_subscribers_updated_at before update on public.newsletter_subscribers for each row execute function public.set_updated_at();
