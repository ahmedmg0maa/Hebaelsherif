-- 038: close legacy direct-review writes and complete CRM/review lifecycle safeguards.
-- Compatibility: existing approved reviews remain public; all new customer reviews flow through
-- submit_verified_review. Rollback: restore the dropped legacy policy only if the RPC is unavailable.

-- Contact messages are linked to an existing customer internally by normalized email. This never
-- exposes a profile to the message submitter; it is only a CRM convenience for permitted staff.
create or replace function public.link_contact_message_customer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select id into new.customer_id
  from public.profiles
  where lower(email) = lower(new.email)
  limit 1;
  return new;
end;
$$;

drop trigger if exists link_contact_message_customer on public.contact_messages;
create trigger link_contact_message_customer
before insert or update of email on public.contact_messages
for each row execute function public.link_contact_message_customer();

update public.contact_messages message
set customer_id = profile.id
from public.profiles profile
where message.customer_id is null and lower(message.email) = lower(profile.email);

create index if not exists contact_messages_customer_created_idx on public.contact_messages(customer_id, created_at desc);
create index if not exists contact_messages_assignee_created_idx on public.contact_messages(assigned_to, created_at desc);
create index if not exists contact_message_notes_message_created_idx on public.contact_message_notes(message_id, created_at desc);
create index if not exists email_outbox_status_created_idx on public.email_outbox(status, created_at desc);

-- Legacy `reviews: authed insert` bypassed the verified-purchase RPC. No browser role receives
-- direct write access now; privileged moderation is carried out by server actions.
drop policy if exists "reviews: authed insert" on public.reviews;
drop policy if exists "reviews: authenticated verified insert" on public.reviews;
drop policy if exists "reviews: admin write" on public.reviews;

alter table public.reviews
  add column if not exists status text not null default 'pending' check (status in ('pending','approved','rejected','archived')),
  add column if not exists display_name_consent boolean not null default false,
  add column if not exists owner_response text,
  add column if not exists owner_response_published boolean not null default false;

update public.reviews
set status = case when is_approved then 'approved' else 'pending' end
where status = 'pending';

create index if not exists reviews_status_created_idx on public.reviews(status, created_at desc);

drop policy if exists "reviews: public read approved" on public.reviews;
create policy "reviews: approved public or owner" on public.reviews for select
using (
  (status = 'approved' and is_approved)
  or user_id = auth.uid()
  or public.has_permission('reviews.manage')
);

drop function if exists public.submit_verified_review(uuid, int, text);
create function public.submit_verified_review(
  p_product_id uuid,
  p_rating int,
  p_comment text,
  p_display_name_consent boolean default false
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_id uuid;
  v_display_name text;
begin
  if v_user is null or p_rating not between 1 and 5 or length(btrim(p_comment)) < 5 then
    raise exception using errcode = '22023', message = 'invalid_review';
  end if;

  select order_id into v_order
  from public.entitlement_grants
  where user_id = v_user and product_id = p_product_id and revoked_at is null
  order by granted_at desc
  limit 1;
  if v_order is null then
    raise exception using errcode = '42501', message = 'purchase_required';
  end if;

  if p_display_name_consent then
    select full_name into v_display_name from public.profiles where id = v_user;
  end if;

  insert into public.reviews(
    user_id, product_id, order_id, rating, comment, display_name, display_name_consent,
    verified_purchase, is_approved, is_featured, status, moderation_reason, moderated_by,
    moderated_at, owner_response, owner_response_published
  ) values (
    v_user, p_product_id, v_order, p_rating, btrim(p_comment), v_display_name, p_display_name_consent,
    true, false, false, 'pending', null, null, null, null, false
  )
  on conflict(user_id, product_id) where user_id is not null and product_id is not null
  do update set
    rating = excluded.rating,
    comment = excluded.comment,
    order_id = excluded.order_id,
    display_name = excluded.display_name,
    display_name_consent = excluded.display_name_consent,
    verified_purchase = true,
    is_approved = false,
    is_featured = false,
    status = 'pending',
    moderation_reason = null,
    moderated_by = null,
    moderated_at = null,
    owner_response = null,
    owner_response_published = false
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_verified_review(uuid, int, text, boolean) from public, anon;
grant execute on function public.submit_verified_review(uuid, int, text, boolean) to authenticated;
