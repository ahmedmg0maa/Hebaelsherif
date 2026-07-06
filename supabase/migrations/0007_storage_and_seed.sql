insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 10485760, array['image/png','image/jpeg','image/webp','image/gif']),
  ('protected-books', 'protected-books', false, 52428800, array['application/pdf']),
  ('payment-proofs', 'payment-proofs', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf']),
  ('avatars', 'avatars', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "public_media_read" on storage.objects for select using (bucket_id = 'public-media');
create policy "public_media_admin_write" on storage.objects for all using (bucket_id = 'public-media' and public.is_admin()) with check (bucket_id = 'public-media' and public.is_admin());

create policy "payment_proofs_owner_insert" on storage.objects for insert with check (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "payment_proofs_owner_or_admin_read" on storage.objects for select using (bucket_id = 'payment-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(array['owner','super_admin','admin','finance','support']::public.app_role[])));

create policy "protected_books_admin_write" on storage.objects for all using (bucket_id = 'protected-books' and public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[])) with check (bucket_id = 'protected-books' and public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));
create policy "protected_books_admin_read" on storage.objects for select using (bucket_id = 'protected-books' and public.is_admin(array['owner','super_admin','admin','content_manager']::public.app_role[]));

insert into public.services (slug, title_ar, description_ar, duration_minutes, price_egp, sort_order)
values
  ('clarity-session-60', 'جلسة وضوح 60 دقيقة', 'جلسة مركزة لسؤال محدد وخطوة عملية واضحة.', 60, 1200, 1),
  ('deep-session-90', 'جلسة عميقة 90 دقيقة', 'مساحة ممتدة لتفكيك نمط أو سؤال مركّب بهدوء.', 90, 1500, 2)
on conflict (slug) do update set title_ar = excluded.title_ar, description_ar = excluded.description_ar, duration_minutes = excluded.duration_minutes, price_egp = excluded.price_egp, sort_order = excluded.sort_order;

insert into public.availability_rules (weekday, is_available, start_time, end_time, slot_interval_minutes, buffer_minutes)
values
  (0, true, '07:00', '21:00', 30, 30),
  (1, true, '07:00', '21:00', 30, 30),
  (2, true, '07:00', '21:00', 30, 30),
  (3, true, '07:00', '21:00', 30, 30),
  (4, true, '07:00', '21:00', 30, 30),
  (5, false, '07:00', '21:00', 30, 30),
  (6, true, '07:00', '21:00', 30, 30);

insert into public.site_settings (key, value, is_public)
values
  ('brand', '{"name":"هبة الشريف","tagline":"رحلة وعي تعيدك إلى ذاتك"}', true),
  ('payments', '{"instapayPhone":"01037141322","whatsappPhone":"01037141322"}', true),
  ('booking', '{"timezone":"Africa/Cairo","minDaysAhead":1,"maxDaysAhead":30,"bufferMinutes":30}', true)
on conflict (key) do update set value = excluded.value, is_public = excluded.is_public;
