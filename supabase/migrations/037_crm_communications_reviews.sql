-- 037: customer 360, collaborative inbox, safe email outbox, unsubscribe and verified reviews.
alter table public.contact_messages add column if not exists assigned_to uuid references auth.users(id) on delete set null,add column if not exists priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),add column if not exists is_spam boolean not null default false,add column if not exists customer_id uuid references auth.users(id) on delete set null;
create table if not exists public.contact_message_notes(id uuid primary key default gen_random_uuid(),message_id uuid not null references public.contact_messages(id) on delete cascade,author_id uuid not null references auth.users(id) on delete restrict,note text not null,created_at timestamptz not null default now());
alter table public.contact_message_notes enable row level security;create policy "message notes: inbox manage" on public.contact_message_notes for all using(public.has_permission('inbox.manage')) with check(public.has_permission('inbox.manage'));

create table if not exists public.email_outbox(id uuid primary key default gen_random_uuid(),to_email text not null,subject text not null,body_text text not null,template_key text,entity_type text,entity_id text,status text not null default 'disabled' check(status in ('disabled','queued','sending','sent','failed','cancelled')),provider text,provider_message_id text,attempts int not null default 0,last_error text,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),sent_at timestamptz);
alter table public.email_outbox enable row level security;create policy "email outbox: inbox read" on public.email_outbox for select using(public.has_permission('inbox.view'));create policy "email outbox: inbox manage" on public.email_outbox for all using(public.has_permission('inbox.manage') or public.has_permission('newsletter.manage')) with check(public.has_permission('inbox.manage') or public.has_permission('newsletter.manage'));
insert into public.site_settings(key,value,is_public) values('email_delivery','{"enabled":false,"provider":null}'::jsonb,false) on conflict(key) do nothing;

alter table public.newsletter_subscribers add column if not exists unsubscribe_token_hash text,add column if not exists token_created_at timestamptz;
update public.newsletter_subscribers set unsubscribe_token_hash=md5(gen_random_uuid()::text||clock_timestamp()::text),token_created_at=now() where unsubscribe_token_hash is null;
create unique index if not exists newsletter_unsubscribe_hash_uidx on public.newsletter_subscribers(unsubscribe_token_hash);

alter table public.reviews add column if not exists order_id uuid references public.orders(id) on delete set null,add column if not exists verified_purchase boolean not null default false,add column if not exists moderation_reason text,add column if not exists moderated_by uuid references auth.users(id) on delete set null,add column if not exists moderated_at timestamptz;
create unique index if not exists reviews_user_product_uidx on public.reviews(user_id,product_id) where user_id is not null and product_id is not null;
create policy "reviews: authenticated verified insert" on public.reviews for insert to authenticated with check(user_id=auth.uid() and not is_approved and not is_featured and exists(select 1 from public.entitlement_grants eg where eg.user_id=auth.uid() and eg.product_id=reviews.product_id and eg.revoked_at is null));
create or replace function public.submit_verified_review(p_product_id uuid,p_rating int,p_comment text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();v_order uuid;v_id uuid;
begin
 if v_user is null or p_rating not between 1 and 5 or length(btrim(p_comment))<5 then raise exception using errcode='22023',message='invalid_review';end if;
 select order_id into v_order from public.entitlement_grants where user_id=v_user and product_id=p_product_id and revoked_at is null order by granted_at desc limit 1;
 if v_order is null then raise exception using errcode='42501',message='purchase_required';end if;
 insert into public.reviews(user_id,product_id,order_id,rating,comment,verified_purchase,is_approved,is_featured) values(v_user,p_product_id,v_order,p_rating,btrim(p_comment),true,false,false)
 on conflict(user_id,product_id) where user_id is not null and product_id is not null do update set rating=excluded.rating,comment=excluded.comment,order_id=excluded.order_id,verified_purchase=true,is_approved=false,is_featured=false,moderation_reason=null returning id into v_id;
 return v_id;
end $$;
revoke all on function public.submit_verified_review(uuid,int,text) from public,anon;grant execute on function public.submit_verified_review(uuid,int,text) to authenticated;
