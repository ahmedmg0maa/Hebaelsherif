-- 010: storage buckets + policies
insert into storage.buckets (id, name, public) values
  ('public-media', 'public-media', true),
  ('avatars', 'avatars', true),
  ('protected-books', 'protected-books', false),
  ('course-videos', 'course-videos', false),
  ('course-resources', 'course-resources', false),
  ('payment-proofs', 'payment-proofs', false),
  ('workshop-recordings', 'workshop-recordings', false)
on conflict (id) do nothing;

-- public-media: anyone reads, admins write
create policy "public-media read" on storage.objects for select using (bucket_id = 'public-media');
create policy "public-media admin write" on storage.objects for insert
  with check (bucket_id = 'public-media' and public.is_admin());
create policy "public-media admin update" on storage.objects for update
  using (bucket_id = 'public-media' and public.is_admin());
create policy "public-media admin delete" on storage.objects for delete
  using (bucket_id = 'public-media' and public.is_admin());

-- avatars: public read, users write inside their own folder (<uid>/...)
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars own write" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- payment-proofs: user uploads inside own folder; only uploader + admins can read
create policy "proofs own insert" on storage.objects for insert
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "proofs own/admin read" on storage.objects for select
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- protected content buckets: admin-managed; delivery via server-side signed URLs
-- (service role bypasses RLS after an explicit content_access check).
create policy "protected admin all" on storage.objects for all
  using (bucket_id in ('protected-books','course-videos','course-resources','workshop-recordings') and public.is_admin())
  with check (bucket_id in ('protected-books','course-videos','course-resources','workshop-recordings') and public.is_admin());
