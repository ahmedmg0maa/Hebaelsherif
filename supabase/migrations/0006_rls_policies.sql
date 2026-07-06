alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.site_settings enable row level security;
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.coupons enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.articles enable row level security;
alter table public.article_tags enable row level security;
alter table public.article_tag_map enable row level security;
alter table public.books enable row level security;
alter table public.book_files enable row level security;
alter table public.content_access enable row level security;
alter table public.reviews enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.notifications enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles for update using (id = auth.uid() or public.is_admin(array['owner','super_admin','admin']::public.app_role[])) with check (id = auth.uid() or public.is_admin(array['owner','super_admin','admin']::public.app_role[]));
create policy "profiles_insert_service" on public.profiles for insert with check (id = auth.uid());

create policy "admin_roles_admin_only" on public.admin_roles for all using (public.is_admin(array['owner','super_admin','admin']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));

create policy "public_settings_read" on public.site_settings for select using (is_public = true or public.is_admin());
create policy "settings_admin_write" on public.site_settings for all using (public.is_admin(array['owner','super_admin','admin']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));

create policy "published_services_read" on public.services for select using (status = 'published' or public.is_admin());
create policy "services_admin_write" on public.services for all using (public.is_admin(array['owner','super_admin','admin']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));

create policy "availability_public_read" on public.availability_rules for select using (is_active = true or public.is_admin());
create policy "availability_exceptions_public_read" on public.availability_exceptions for select using (true);
create policy "availability_admin_write" on public.availability_rules for all using (public.is_admin()) with check (public.is_admin());
create policy "availability_exceptions_admin_write" on public.availability_exceptions for all using (public.is_admin()) with check (public.is_admin());

create policy "coupons_admin_only" on public.coupons for all using (public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]));
create policy "coupon_redemptions_own_or_admin" on public.coupon_redemptions for select using (user_id = auth.uid() or public.is_admin(array['owner','super_admin','admin','finance']::public.app_role[]));

create policy "bookings_select_own_or_admin" on public.bookings for select using (user_id = auth.uid() or public.is_admin());
create policy "bookings_insert_own" on public.bookings for insert with check (user_id = auth.uid());
create policy "bookings_admin_update" on public.bookings for update using (public.is_admin(array['owner','super_admin','admin','support','finance']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','support','finance']::public.app_role[]));
create policy "booking_events_select_own_or_admin" on public.booking_events for select using (exists (select 1 from public.bookings b where b.id = booking_id and (b.user_id = auth.uid() or public.is_admin())));
create policy "booking_events_admin_insert" on public.booking_events for insert with check (public.is_admin() or actor_id = auth.uid());

create policy "orders_select_own_or_admin" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "orders_insert_own" on public.orders for insert with check (user_id = auth.uid());
create policy "orders_admin_update" on public.orders for update using (public.is_admin(array['owner','super_admin','admin','finance','support']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','finance','support']::public.app_role[]));
create policy "order_items_select_via_order" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

create policy "payment_proofs_select_own_or_admin" on public.payment_proofs for select using (user_id = auth.uid() or public.is_admin(array['owner','super_admin','admin','finance','support']::public.app_role[]));
create policy "payment_proofs_insert_own" on public.payment_proofs for insert with check (user_id = auth.uid());
create policy "payment_proofs_admin_update" on public.payment_proofs for update using (public.is_admin(array['owner','super_admin','admin','finance','support']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','finance','support']::public.app_role[]));

create policy "published_articles_read" on public.articles for select using (status = 'published' or public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "articles_admin_write" on public.articles for all using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "article_tags_read" on public.article_tags for select using (true);
create policy "article_tags_admin_write" on public.article_tags for all using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "article_tag_map_read" on public.article_tag_map for select using (true);

create policy "published_books_read" on public.books for select using (status = 'published' or public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "books_admin_write" on public.books for all using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "book_files_admin_or_access" on public.book_files for select using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]) or access_type = 'preview' or exists (select 1 from public.content_access ca where ca.content_type = 'book' and ca.content_id = book_id and ca.user_id = auth.uid() and ca.status = 'active' and (ca.expires_at is null or ca.expires_at > now())));
create policy "book_files_admin_write" on public.book_files for all using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "content_access_own_or_admin" on public.content_access for select using (user_id = auth.uid() or public.is_admin());
create policy "content_access_admin_write" on public.content_access for all using (public.is_admin(array['owner','super_admin','admin','content_manager','finance']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager','finance']::public.app_role[]));

create policy "reviews_public_approved" on public.reviews for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "reviews_insert_own" on public.reviews for insert with check (user_id = auth.uid());
create policy "reviews_admin_update" on public.reviews for update using (public.is_admin(array['owner','super_admin','admin','content_manager','support']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager','support']::public.app_role[]));

create policy "contact_insert_public" on public.contact_messages for insert with check (true);
create policy "contact_admin_read_write" on public.contact_messages for all using (public.is_admin(array['owner','super_admin','admin','support']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','support']::public.app_role[]));
create policy "newsletter_public_insert" on public.newsletter_subscribers for insert with check (true);
create policy "newsletter_admin_read_write" on public.newsletter_subscribers for all using (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));

create policy "notifications_own_or_admin" on public.notifications for select using (user_id = auth.uid() or audience in ('all') or public.is_admin());
create policy "notifications_update_own_read" on public.notifications for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "analytics_insert_public_limited" on public.analytics_events for insert with check (true);
create policy "analytics_admin_read" on public.analytics_events for select using (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));
create policy "audit_admin_read" on public.audit_logs for select using (public.is_admin(array['owner','super_admin','admin']::public.app_role[]));
