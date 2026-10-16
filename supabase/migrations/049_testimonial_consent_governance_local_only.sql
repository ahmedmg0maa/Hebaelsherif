-- 049: consent-complete, purchase-linked testimonial publication and atomic moderation.
-- LOCAL ONLY. Apply after 048 on an authorized Staging project. Existing approved
-- reviews are not assumed to have publication consent and therefore stay private
-- until the customer resubmits through the governed flow.

alter table public.reviews
  add column if not exists publication_consent_at timestamptz,
  add column if not exists source_type text not null default 'purchase',
  add column if not exists source_reference_id uuid,
  add column if not exists verified_at timestamptz;

alter table public.reviews
  drop constraint if exists reviews_source_type_check;
alter table public.reviews
  add constraint reviews_source_type_check
  check (source_type in ('purchase', 'booking'));

alter table public.reviews
  drop constraint if exists reviews_display_name_length_check;
alter table public.reviews
  add constraint reviews_display_name_length_check
  check (display_name is null or char_length(display_name) between 1 and 120);

update public.reviews
set source_type = 'purchase',
    source_reference_id = order_id,
    verified_at = coalesce(verified_at, created_at)
where verified_purchase and order_id is not null;

create index if not exists reviews_public_governed_idx
  on public.reviews (is_featured desc, created_at desc)
  where status = 'approved'
    and is_approved
    and verified_purchase
    and publication_consent_at is not null;

-- Public visibility now requires verification and explicit publication consent.
-- Owners and the submitting customer keep their existing review access.
drop policy if exists "reviews: approved public or owner" on public.reviews;
create policy "reviews: governed public or owner" on public.reviews for select
using (
  (
    status = 'approved'
    and is_approved
    and verified_purchase
    and publication_consent_at is not null
  )
  or user_id = auth.uid()
  or public.has_permission('reviews.manage')
);

drop function if exists public.submit_verified_review(uuid, int, text, boolean);
create function public.submit_verified_review(
  p_product_id uuid,
  p_rating int,
  p_comment text,
  p_display_name_consent boolean,
  p_publication_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_id uuid;
  v_full_name text;
  v_display_name text;
begin
  if v_user is null
     or p_rating not between 1 and 5
     or char_length(btrim(coalesce(p_comment, ''))) not between 10 and 2000
     or p_publication_consent is not true then
    raise exception using errcode = '22023', message = 'invalid_review';
  end if;

  select eg.order_id into v_order
  from public.entitlement_grants eg
  join public.orders o on o.id = eg.order_id
  where eg.user_id = v_user
    and eg.product_id = p_product_id
    and eg.revoked_at is null
    and o.status = 'paid'
  order by eg.granted_at desc
  limit 1;
  if v_order is null then
    raise exception using errcode = '42501', message = 'purchase_required';
  end if;

  if p_display_name_consent then
    select btrim(full_name) into v_full_name from public.profiles where id = v_user;
    v_display_name := nullif(split_part(coalesce(v_full_name, ''), ' ', 1), '');
  end if;

  insert into public.reviews(
    user_id, product_id, order_id, rating, comment, display_name, display_name_consent,
    publication_consent_at, source_type, source_reference_id, verified_at,
    verified_purchase, is_approved, is_featured, status, moderation_reason, moderated_by,
    moderated_at, owner_response, owner_response_published
  ) values (
    v_user, p_product_id, v_order, p_rating, btrim(p_comment), v_display_name, p_display_name_consent,
    now(), 'purchase', v_order, now(),
    true, false, false, 'pending', null, null, null, null, false
  )
  on conflict(user_id, product_id) where user_id is not null and product_id is not null
  do update set
    order_id = excluded.order_id,
    rating = excluded.rating,
    comment = excluded.comment,
    display_name = excluded.display_name,
    display_name_consent = excluded.display_name_consent,
    publication_consent_at = excluded.publication_consent_at,
    source_type = excluded.source_type,
    source_reference_id = excluded.source_reference_id,
    verified_at = excluded.verified_at,
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

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (
    v_user,
    'review.submitted',
    'review',
    v_id::text,
    jsonb_build_object(
      'source', 'purchase',
      'displayNameConsented', p_display_name_consent,
      'publicationConsented', true
    )
  );
  return v_id;
end;
$$;

revoke all on function public.submit_verified_review(uuid, int, text, boolean, boolean) from public, anon;
grant execute on function public.submit_verified_review(uuid, int, text, boolean, boolean) to authenticated;

create or replace function public.manage_review(
  p_review_id uuid,
  p_actor_id uuid,
  p_action text,
  p_reason text default null,
  p_owner_response text default null,
  p_publish_response boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.reviews%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_response text := nullif(btrim(coalesce(p_owner_response, '')), '');
begin
  if not public.has_permission('reviews.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'reviews_permission_required';
  end if;
  if p_action not in ('approve', 'reject', 'archive', 'restore', 'feature', 'unfeature', 'respond')
     or (v_reason is not null and char_length(v_reason) > 500)
     or (v_response is not null and char_length(v_response) > 2000)
     or (p_action = 'reject' and coalesce(char_length(v_reason), 0) < 3) then
    raise exception using errcode = '22023', message = 'invalid_review_moderation';
  end if;

  select * into v_review from public.reviews where id = p_review_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'review_not_found';
  end if;

  if p_action in ('approve', 'feature') and (
    not v_review.verified_purchase or v_review.verified_at is null or v_review.publication_consent_at is null
  ) then
    raise exception using errcode = '22023', message = 'review_publication_evidence_required';
  end if;
  if p_action in ('feature', 'unfeature', 'respond') and v_review.status <> 'approved' then
    raise exception using errcode = '22023', message = 'approved_review_required';
  end if;

  update public.reviews
  set status = case p_action
        when 'approve' then 'approved'
        when 'reject' then 'rejected'
        when 'archive' then 'archived'
        when 'restore' then 'pending'
        else status
      end,
      is_approved = case p_action
        when 'approve' then true
        when 'reject' then false
        when 'archive' then false
        when 'restore' then false
        else is_approved
      end,
      is_featured = case p_action
        when 'approve' then false
        when 'reject' then false
        when 'archive' then false
        when 'restore' then false
        when 'feature' then true
        when 'unfeature' then false
        else is_featured
      end,
      moderation_reason = case
        when p_action = 'reject' then v_reason
        when p_action in ('approve', 'restore') then null
        else moderation_reason
      end,
      moderated_by = p_actor_id,
      moderated_at = now(),
      owner_response = case when p_action in ('approve', 'reject', 'respond') then v_response else owner_response end,
      owner_response_published = case
        when p_action in ('approve', 'respond') then v_response is not null and p_publish_response
        when p_action = 'reject' then false
        else owner_response_published
      end
  where id = p_review_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'review.' || p_action,
    'review',
    p_review_id::text,
    jsonb_build_object(
      'source', v_review.source_type,
      'verified', v_review.verified_purchase and v_review.verified_at is not null,
      'publicationConsented', v_review.publication_consent_at is not null,
      'hasReason', v_reason is not null,
      'responsePublished', v_response is not null and p_publish_response
    )
  );

  return jsonb_build_object('updated', true, 'action', p_action);
end;
$$;

revoke all on function public.manage_review(uuid, uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.manage_review(uuid, uuid, text, text, text, boolean) to service_role;

comment on function public.submit_verified_review(uuid, int, text, boolean, boolean)
is 'Customer review submission with paid-entitlement verification and explicit publication/display-name consent.';
comment on function public.manage_review(uuid, uuid, text, text, text, boolean)
is 'Atomic review moderation, feature/response control and privacy-minimized audit with server-side permission checks.';
