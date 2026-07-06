-- Heba ElSherif Platform V5: Supabase foundation
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create type public.app_role as enum ('user', 'owner', 'super_admin', 'admin', 'support', 'content_manager', 'finance', 'viewer');
create type public.publish_status as enum ('draft', 'review', 'published', 'coming_soon', 'hidden', 'archived');
create type public.booking_status as enum ('pending', 'awaiting_payment', 'payment_submitted', 'confirmed', 'reschedule_requested', 'cancelled', 'completed', 'no_show');
create type public.payment_status as enum ('not_required', 'pending', 'submitted', 'confirmed', 'failed', 'refunded');
create type public.payment_method as enum ('instapay', 'vodafone_cash', 'bank_transfer', 'manual');
create type public.order_status as enum ('pending', 'awaiting_payment', 'payment_submitted', 'paid', 'access_granted', 'rejected', 'failed', 'refunded', 'cancelled');
create type public.product_type as enum ('book', 'course', 'bundle');
create type public.coupon_type as enum ('percentage', 'fixed');
create type public.content_access_status as enum ('active', 'revoked', 'expired');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
