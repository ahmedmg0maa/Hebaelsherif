-- V7 storage: course/workshop content buckets.
-- protected-books, payment-proofs, public-media, avatars already exist (0007).
-- All new buckets are private; delivery happens through server-generated
-- signed URLs after an access check (content_access / enrollments / registrations).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-videos', 'course-videos', false, 1073741824, array['video/mp4','video/webm']),
  ('course-resources', 'course-resources', false, 52428800, array['application/pdf','image/png','image/jpeg','audio/mpeg','application/zip']),
  ('workshop-recordings', 'workshop-recordings', false, 1073741824, array['video/mp4','video/webm'])
on conflict (id) do nothing;

-- Avatars: owner-managed, readable by any signed-in user.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'avatars_owner_write') then
    create policy "avatars_owner_write" on storage.objects for all
      using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
      with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'avatars_authenticated_read') then
    create policy "avatars_authenticated_read" on storage.objects for select
      using (bucket_id = 'avatars' and auth.role() = 'authenticated');
  end if;

  -- Course/workshop media: admin management only; customers receive signed URLs
  -- from server routes after enrollment/registration checks.
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'course_media_admin_all') then
    create policy "course_media_admin_all" on storage.objects for all
      using (
        bucket_id in ('course-videos','course-resources','workshop-recordings')
        and public.is_admin(array['owner','super_admin','admin','content_manager','course_manager']::public.app_role[])
      )
      with check (
        bucket_id in ('course-videos','course-resources','workshop-recordings')
        and public.is_admin(array['owner','super_admin','admin','content_manager','course_manager']::public.app_role[])
      );
  end if;
end $$;
