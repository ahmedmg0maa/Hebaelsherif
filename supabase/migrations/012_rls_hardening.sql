-- 012: RLS hardening from the V1.5.0 security review

-- payments: a customer must not be able to insert a payment whose amount
-- differs from the order total (the admin queue displays payments.amount).
drop policy "payments: own create pending" on public.payments;
create policy "payments: own create pending" on public.payments for insert
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
        and o.total = amount
    )
  );

-- orders: customer inserts must be consistent (total = subtotal - discount, both non-negative).
drop policy "orders: own create pending" on public.orders;
create policy "orders: own create pending" on public.orders for insert
  with check (
    user_id = auth.uid()
    and status = 'pending_payment'
    and subtotal >= 0
    and discount >= 0
    and total = greatest(0, subtotal - discount)
  );

-- notifications: mark-read must not let a user rewrite notification content.
-- Enforced with a trigger (RLS cannot restrict columns).
create or replace function public.guard_notification_update()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    if new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.kind is distinct from old.kind
       or new.link is distinct from old.link
       or new.user_id is distinct from old.user_id then
      raise exception 'only read_at may be changed';
    end if;
  end if;
  return new;
end $$;
create trigger notifications_guard_update before update on public.notifications
  for each row execute function public.guard_notification_update();

-- analytics_events: cap payload size so anon inserts can't be abused for storage flooding.
alter table public.analytics_events
  add constraint analytics_props_size check (pg_column_size(props) < 4096);
alter table public.contact_messages
  add constraint contact_message_size check (char_length(message) <= 5000);
