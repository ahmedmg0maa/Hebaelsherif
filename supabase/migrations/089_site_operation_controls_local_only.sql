-- LOCAL ONLY. New intake switches; existing orders, delivery, refunds and
-- cancellations remain available. Never use these flags to revoke entitlements.
begin;
insert into public.feature_flags(key,is_enabled,description) values
 ('site_open',true,'فتح الواجهة العامة واستقبال معاملات جديدة'),
 ('checkout_open',true,'استقبال طلبات شراء جديدة'),
 ('booking_open',true,'استقبال حجوزات ومهلات حجز جديدة'),
 ('contact_open',true,'استقبال رسائل تواصل جديدة'),
 ('newsletter_open',true,'استقبال اشتراكات جديدة في النشرة')
on conflict(key) do nothing;

create or replace function public.enforce_site_intake_control()
returns trigger language plpgsql security definer set search_path=public as $$
declare flag_key text:=TG_ARGV[0]; opened boolean;
begin
  if TG_TABLE_NAME='newsletter_subscribers' and TG_OP='UPDATE' then
    if new.status<>'subscribed' then return new;end if;
  end if;
  if flag_key in ('checkout_open','booking_open') then
    select is_enabled into opened from public.feature_flags where key='site_open' for share;
    if opened is distinct from true then raise exception using errcode='55000',message='site_intake_closed';end if;
  end if;
  select is_enabled into opened from public.feature_flags where key=flag_key for share;
  if opened is distinct from true then raise exception using errcode='55000',message='site_intake_closed';end if;
  return new;
end $$;
create trigger order_intake_control before insert on public.orders for each row execute function public.enforce_site_intake_control('checkout_open');
create trigger hold_intake_control before insert on public.booking_holds for each row execute function public.enforce_site_intake_control('booking_open');
create trigger booking_intake_control before insert on public.bookings for each row execute function public.enforce_site_intake_control('booking_open');
create trigger contact_intake_control before insert on public.contact_messages for each row execute function public.enforce_site_intake_control('contact_open');
create trigger newsletter_intake_control before insert or update of status,consent_at on public.newsletter_subscribers for each row execute function public.enforce_site_intake_control('newsletter_open');
revoke all on function public.enforce_site_intake_control() from public,anon,authenticated;

-- Resolve navigation from the same effective database permissions used by actions.
create or replace function public.get_effective_admin_permissions()
returns text[] language sql stable security definer set search_path=public as $$
  select coalesce(array_agg(p.permission order by p.permission),array[]::text[]) from unnest(array[
    'admin.access','roles.manage','users.view','users.manage','payments.view','payments.approve','payments.reject','orders.view','orders.update','orders.refund',
    'bookings.view','bookings.manage','availability.manage','packages.manage','catalog.view','catalog.manage','catalog.publish','catalog.delete',
    'content.view','content.manage','content.publish','content.delete','learning.manage','media.view','media.manage','media.delete',
    'settings.view','settings.manage','feature_flags.manage','inbox.view','inbox.manage','newsletter.manage','reviews.manage','press.manage','resources.manage','assessments.manage',
    'reports.view','reports.export','reports.snapshot','marketing.manage','audit.view','system.view','notifications.send','admin.search'
  ]) p(permission) where auth.uid() is not null and public.has_permission('admin.access',auth.uid()) and public.has_permission(p.permission,auth.uid());
$$;
revoke all on function public.get_effective_admin_permissions() from public,anon;
grant execute on function public.get_effective_admin_permissions() to authenticated;
commit;
