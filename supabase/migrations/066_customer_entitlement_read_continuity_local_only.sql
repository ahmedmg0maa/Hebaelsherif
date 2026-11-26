-- 066: preserve customer-owned metadata after public unpublish/deactivation.
-- LOCAL ONLY. Apply after 065 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

drop policy if exists "products: public read published" on public.products;
create policy "products: public or customer-owned read" on public.products
  for select using (
    is_published
    or public.is_admin()
    or exists (
      select 1
        from public.order_items item
        join public.orders customer_order on customer_order.id = item.order_id
       where item.product_id = products.id
         and customer_order.user_id = auth.uid()
    )
  );

drop policy if exists "courses: public read published" on public.courses;
create policy "courses: public or enrolled read" on public.courses
  for select using (
    is_published
    or public.is_admin()
    or exists (
      select 1 from public.course_enrollments enrollment
       where enrollment.course_id = courses.id and enrollment.user_id = auth.uid()
    )
  );

drop policy if exists "modules: read via course" on public.course_modules;
create policy "modules: public or enrolled course read" on public.course_modules
  for select using (
    exists (
      select 1 from public.courses course
       where course.id = course_modules.course_id
         and (
           course.is_published
           or public.is_admin()
           or exists (
             select 1 from public.course_enrollments enrollment
              where enrollment.course_id = course.id and enrollment.user_id = auth.uid()
           )
         )
    )
  );

drop policy if exists "lessons: read via module" on public.course_lessons;
create policy "lessons: public or enrolled course read" on public.course_lessons
  for select using (
    exists (
      select 1
        from public.course_modules module
        join public.courses course on course.id = module.course_id
       where module.id = course_lessons.module_id
         and (
           course.is_published
           or public.is_admin()
           or exists (
             select 1 from public.course_enrollments enrollment
              where enrollment.course_id = course.id and enrollment.user_id = auth.uid()
           )
         )
    )
  );

drop policy if exists "books: public read published" on public.books;
create policy "books: public or owner-of-access read" on public.books
  for select using (
    is_published
    or public.is_admin()
    or exists (
      select 1 from public.book_access access
       where access.book_id = books.id and access.user_id = auth.uid()
    )
  );

drop policy if exists "workshops: public read published" on public.workshops;
create policy "workshops: public or registered read" on public.workshops
  for select using (
    is_published
    or public.is_admin()
    or exists (
      select 1 from public.workshop_registrations registration
       where registration.workshop_id = workshops.id
         and registration.user_id = auth.uid()
         and registration.status <> 'cancelled'
    )
  );

drop policy if exists "services: public read active" on public.services;
create policy "services: public or booked read" on public.services
  for select using (
    is_active
    or public.is_admin()
    or exists (
      select 1 from public.bookings booking
       where booking.service_id = services.id and booking.user_id = auth.uid()
    )
  );

-- These are SELECT-only continuity rules. Public discovery still depends on
-- publication/active flags; customer access still depends on an own grant.
-- Roll back only by a forward policy replacement after preserving receipts.
