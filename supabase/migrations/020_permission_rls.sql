-- 020: replace broad admin write/read policies with least-privilege permission checks

-- Identity and operations
drop policy if exists "profiles: own read" on public.profiles;
create policy "profiles: own or permitted read" on public.profiles for select
  using (id = auth.uid() or public.has_permission('users.view'));
drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: permitted update" on public.profiles for update
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));
drop policy if exists "audit_logs: admin read" on public.audit_logs;
create policy "audit_logs: permitted read" on public.audit_logs for select using (public.has_permission('audit.view'));
drop policy if exists "audit_logs: admin insert" on public.audit_logs;
create policy "audit_logs: permitted insert" on public.audit_logs for insert with check (public.has_permission('admin.access'));
drop policy if exists "notifications: admin insert" on public.notifications;
create policy "notifications: permitted insert" on public.notifications for insert with check (public.has_permission('notifications.send'));
drop policy if exists "user_notes: admin only" on public.user_notes;
create policy "user_notes: permitted" on public.user_notes for all using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));
drop policy if exists "user_tags: admin only" on public.user_tags;
create policy "user_tags: permitted" on public.user_tags for all using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));

-- Commerce
drop policy if exists "products: admin write" on public.products;
create policy "products: permitted write" on public.products for all using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));
drop policy if exists "variants: admin write" on public.product_variants;
create policy "variants: permitted write" on public.product_variants for all using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));
drop policy if exists "bundles: admin write" on public.product_bundles;
create policy "bundles: permitted write" on public.product_bundles for all using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));
drop policy if exists "coupons: admin only" on public.coupons;
create policy "coupons: permitted" on public.coupons for all using (public.has_permission('marketing.manage')) with check (public.has_permission('marketing.manage'));
drop policy if exists "offers: admin write" on public.offers;
create policy "offers: permitted write" on public.offers for all using (public.has_permission('marketing.manage')) with check (public.has_permission('marketing.manage'));
drop policy if exists "offer_targets: admin write" on public.offer_targets;
create policy "offer_targets: permitted write" on public.offer_targets for all using (public.has_permission('marketing.manage')) with check (public.has_permission('marketing.manage'));
drop policy if exists "orders: admin update" on public.orders;
create policy "orders: permitted update" on public.orders for update using (public.has_permission('orders.update') or public.has_permission('orders.refund')) with check (public.has_permission('orders.update') or public.has_permission('orders.refund'));
drop policy if exists "order_items: admin write" on public.order_items;
create policy "order_items: permitted write" on public.order_items for all using (public.has_permission('orders.update')) with check (public.has_permission('orders.update'));
drop policy if exists "payments: admin update" on public.payments;
create policy "payments: permitted update" on public.payments for update using (public.has_permission('payments.approve') or public.has_permission('payments.reject')) with check (public.has_permission('payments.approve') or public.has_permission('payments.reject'));
drop policy if exists "content_access: admin write" on public.content_access;
create policy "content_access: permitted write" on public.content_access for all using (public.has_permission('payments.approve')) with check (public.has_permission('payments.approve'));
drop policy if exists "redemptions: admin write" on public.coupon_redemptions;
create policy "redemptions: permitted write" on public.coupon_redemptions for all using (public.has_permission('payments.approve')) with check (public.has_permission('payments.approve'));

-- Learning, books, and workshops
drop policy if exists "courses: admin write" on public.courses;
create policy "courses: permitted write" on public.courses for all using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));
drop policy if exists "modules: admin write" on public.course_modules;
create policy "modules: permitted write" on public.course_modules for all using (public.has_permission('learning.manage')) with check (public.has_permission('learning.manage'));
drop policy if exists "lessons: admin write" on public.course_lessons;
create policy "lessons: permitted write" on public.course_lessons for all using (public.has_permission('learning.manage')) with check (public.has_permission('learning.manage'));
drop policy if exists "lesson_resources: admin write" on public.lesson_resources;
create policy "lesson_resources: permitted write" on public.lesson_resources for all using (public.has_permission('learning.manage')) with check (public.has_permission('learning.manage'));
drop policy if exists "enrollments: admin write" on public.course_enrollments;
create policy "enrollments: permitted write" on public.course_enrollments for all using (public.has_permission('payments.approve')) with check (public.has_permission('payments.approve'));
drop policy if exists "course_reviews: admin all" on public.course_reviews;
create policy "course_reviews: permitted" on public.course_reviews for all using (public.has_permission('reviews.manage')) with check (public.has_permission('reviews.manage'));
drop policy if exists "certificates: admin write" on public.certificates;
create policy "certificates: permitted write" on public.certificates for all using (public.has_permission('learning.manage')) with check (public.has_permission('learning.manage'));
drop policy if exists "books: admin write" on public.books;
create policy "books: permitted write" on public.books for all using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));
drop policy if exists "book_versions: admin write" on public.book_versions;
create policy "book_versions: permitted write" on public.book_versions for all using (public.has_permission('learning.manage')) with check (public.has_permission('learning.manage'));
drop policy if exists "book_files: admin write" on public.book_files;
create policy "book_files: permitted write" on public.book_files for all using (public.has_permission('learning.manage')) with check (public.has_permission('learning.manage'));
drop policy if exists "book_access: admin write" on public.book_access;
create policy "book_access: permitted write" on public.book_access for all using (public.has_permission('payments.approve')) with check (public.has_permission('payments.approve'));
drop policy if exists "workshops: admin write" on public.workshops;
create policy "workshops: permitted write" on public.workshops for all using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));
drop policy if exists "ws_registrations: admin write" on public.workshop_registrations;
create policy "ws_registrations: permitted write" on public.workshop_registrations for all using (public.has_permission('payments.approve')) with check (public.has_permission('payments.approve'));
drop policy if exists "ws_attendance: admin write" on public.workshop_attendance;
create policy "ws_attendance: permitted write" on public.workshop_attendance for all using (public.has_permission('bookings.manage')) with check (public.has_permission('bookings.manage'));
drop policy if exists "ws_resources: admin write" on public.workshop_resources;
create policy "ws_resources: permitted write" on public.workshop_resources for all using (public.has_permission('learning.manage')) with check (public.has_permission('learning.manage'));
drop policy if exists "ws_recordings: admin write" on public.workshop_recordings;
create policy "ws_recordings: permitted write" on public.workshop_recordings for all using (public.has_permission('learning.manage')) with check (public.has_permission('learning.manage'));

-- Booking
drop policy if exists "services: admin write" on public.services;
create policy "services: permitted write" on public.services for all using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));
drop policy if exists "availability_rules: admin write" on public.availability_rules;
create policy "availability_rules: permitted write" on public.availability_rules for all using (public.has_permission('availability.manage')) with check (public.has_permission('availability.manage'));
drop policy if exists "availability_exceptions: admin write" on public.availability_exceptions;
create policy "availability_exceptions: permitted write" on public.availability_exceptions for all using (public.has_permission('availability.manage')) with check (public.has_permission('availability.manage'));
drop policy if exists "bookings: admin update" on public.bookings;
create policy "bookings: permitted update" on public.bookings for update using (public.has_permission('bookings.manage')) with check (public.has_permission('bookings.manage'));
drop policy if exists "booking_events: admin insert" on public.booking_events;
create policy "booking_events: permitted insert" on public.booking_events for insert with check (public.has_permission('bookings.manage'));
drop policy if exists "reschedules: admin update" on public.booking_reschedule_requests;
create policy "reschedules: permitted update" on public.booking_reschedule_requests for update using (public.has_permission('bookings.manage')) with check (public.has_permission('bookings.manage'));

-- CMS, media, CRM, and reporting
drop policy if exists "pages: admin write" on public.pages;
create policy "pages: permitted write" on public.pages for all using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));
drop policy if exists "page_sections: admin write" on public.page_sections;
create policy "page_sections: permitted write" on public.page_sections for all using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));
drop policy if exists "navigation: admin write" on public.navigation_items;
create policy "navigation: permitted write" on public.navigation_items for all using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));
drop policy if exists "articles: admin write" on public.articles;
create policy "articles: permitted write" on public.articles for all using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));
drop policy if exists "article_tags: admin write" on public.article_tags;
create policy "article_tags: permitted write" on public.article_tags for all using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));
drop policy if exists "media: admin write" on public.media_assets;
create policy "media: permitted write" on public.media_assets for all using (public.has_permission('media.manage')) with check (public.has_permission('media.manage'));
drop policy if exists "settings: admin write" on public.site_settings;
create policy "settings: permitted write" on public.site_settings for all using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));
drop policy if exists "flags: admin write" on public.feature_flags;
create policy "flags: permitted write" on public.feature_flags for all using (public.has_permission('feature_flags.manage')) with check (public.has_permission('feature_flags.manage'));
drop policy if exists "reviews: admin write" on public.reviews;
create policy "reviews: permitted write" on public.reviews for all using (public.has_permission('reviews.manage')) with check (public.has_permission('reviews.manage'));
drop policy if exists "contact: admin read/write" on public.contact_messages;
create policy "contact: permitted read" on public.contact_messages for select using (public.has_permission('inbox.view'));
drop policy if exists "contact: admin update" on public.contact_messages;
create policy "contact: permitted update" on public.contact_messages for update using (public.has_permission('inbox.manage')) with check (public.has_permission('inbox.manage'));
drop policy if exists "newsletter: admin read" on public.newsletter_subscribers;
create policy "newsletter: permitted read" on public.newsletter_subscribers for select using (public.has_permission('inbox.view') or public.has_permission('newsletter.manage'));
drop policy if exists "newsletter: admin update" on public.newsletter_subscribers;
create policy "newsletter: permitted update" on public.newsletter_subscribers for update using (public.has_permission('newsletter.manage')) with check (public.has_permission('newsletter.manage'));
drop policy if exists "reports: admin only" on public.report_snapshots;
create policy "reports: permitted" on public.report_snapshots for all using (public.has_permission('reports.view')) with check (public.has_permission('reports.snapshot'));
drop policy if exists "analytics: admin read" on public.analytics_events;
create policy "analytics: permitted read" on public.analytics_events for select using (public.has_permission('reports.view'));
drop policy if exists "system_events: admin only" on public.system_events;
create policy "system_events: permitted" on public.system_events for all using (public.has_permission('system.view')) with check (public.has_permission('system.view'));

-- Storage objects
drop policy if exists "public-media admin write" on storage.objects;
create policy "public-media: permitted insert" on storage.objects for insert with check (bucket_id = 'public-media' and public.has_permission('media.manage'));
drop policy if exists "public-media admin update" on storage.objects;
create policy "public-media: permitted update" on storage.objects for update using (bucket_id = 'public-media' and public.has_permission('media.manage'));
drop policy if exists "public-media admin delete" on storage.objects;
create policy "public-media: permitted delete" on storage.objects for delete using (bucket_id = 'public-media' and public.has_permission('media.delete'));
drop policy if exists "proofs own/admin read" on storage.objects;
create policy "proofs own/permitted read" on storage.objects for select
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_permission('payments.view')));
drop policy if exists "protected admin all" on storage.objects;
create policy "protected-content: permitted" on storage.objects for all
  using (bucket_id in ('protected-books','course-videos','course-resources','workshop-recordings') and public.has_permission('media.manage'))
  with check (bucket_id in ('protected-books','course-videos','course-resources','workshop-recordings') and public.has_permission('media.manage'));
