-- Optional local seed. Run after migrations in a local Supabase instance.
insert into public.services (slug, title_ar, description_ar, duration_minutes, price_egp, sort_order)
values
  ('clarity-session-60', 'جلسة وضوح 60 دقيقة', 'جلسة مركزة لسؤال محدد وخطوة عملية واضحة.', 60, 1200, 1),
  ('deep-session-90', 'جلسة عميقة 90 دقيقة', 'مساحة ممتدة لتفكيك نمط أو سؤال مركّب بهدوء.', 90, 1500, 2)
on conflict (slug) do nothing;
