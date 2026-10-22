-- 013: port the real business data captured in the legacy schema (see 000).
-- Values are read from legacy tables verbatim; guards make this a no-op on fresh databases.
do $$
declare
  legacy_services regclass := to_regclass('legacy.services');
  legacy_settings regclass := to_regclass('legacy.site_settings');
  svc record;
  pid uuid;
  pay jsonb;
  brand jsonb;
  booking jsonb;
begin
  -- 1) الجلسات الفردية الحقيقية (legacy.services → products + services)
  if legacy_services is not null then
    for svc in execute
      'select slug, title_ar, description_ar, duration_minutes, price_egp from legacy.services where status = ''published'''
    loop
      insert into public.products (type, slug, title, subtitle, description, price, is_published, sort)
      values ('session', svc.slug, svc.title_ar,
              svc.duration_minutes || ' دقيقة — أونلاين',
              coalesce(svc.description_ar, ''), svc.price_egp, true, 10)
      on conflict (slug) do update set title = excluded.title, price = excluded.price, is_published = true
      returning id into pid;

      insert into public.services (product_id, slug, title, description, duration_minutes, price, is_active)
      values (pid, svc.slug, svc.title_ar, coalesce(svc.description_ar, ''), svc.duration_minutes, svc.price_egp, true)
      on conflict (slug) do update set price = excluded.price, duration_minutes = excluded.duration_minutes, is_active = true;
    end loop;
  end if;

  -- 2) إعدادات الدفع والهوية (legacy.site_settings → site_settings بمفاتيحنا)
  if legacy_settings is not null then
    execute 'select value from legacy.site_settings where key = ''payments''' into pay;
    if pay ? 'instapayPhone' then
      insert into public.site_settings (key, value, is_public) values
        ('payment_instapay', jsonb_build_object('handle', pay->>'instapayPhone', 'name', 'هبة الشريف'), true),
        ('payment_wallet', jsonb_build_object('number', pay->>'instapayPhone', 'provider', 'المحافظ الإلكترونية'), true)
      on conflict (key) do update set value = excluded.value, is_public = excluded.is_public;
    end if;
    if pay ? 'whatsappPhone' then
      insert into public.site_settings (key, value, is_public)
      values ('contact_whatsapp', jsonb_build_object('phone', pay->>'whatsappPhone'), true)
      on conflict (key) do update set value = excluded.value;
    end if;

    execute 'select value from legacy.site_settings where key = ''brand''' into brand;
    if brand is not null then
      insert into public.site_settings (key, value, is_public) values ('brand', brand, true)
      on conflict (key) do update set value = excluded.value;
    end if;

    execute 'select value from legacy.site_settings where key = ''booking''' into booking;
    if booking is not null then
      insert into public.site_settings (key, value, is_public) values ('booking', booking, true)
      on conflict (key) do update set value = excluded.value;
    end if;
  end if;
end $$;

-- 3) مهلة الطلبات + مفاتيح الميزات (defaults; safe upserts)
insert into public.site_settings (key, value, is_public)
values ('order_expiry_hours', '{"hours":72}', true)
on conflict (key) do nothing;

insert into public.feature_flags (key, is_enabled, description) values
  ('workshops', true, 'إظهار قسم ورش العمل'),
  ('vip_program', false, 'برنامج VIP — قائمة انتظار'),
  ('certificates', true, 'إصدار شهادات إتمام الدورات')
on conflict (key) do nothing;

-- 4) المالكة تحصل على دور owner تلقائيًا عند تسجيلها بهذا البريد
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''));
  if lower(coalesce(new.email, '')) = 'heba0elsherif@gmail.com' then
    insert into public.admin_roles (user_id, role) values (new.id, 'owner')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;
