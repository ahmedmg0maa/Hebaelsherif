-- OPTIONAL LOCAL-ONLY operation, AFTER reviewed migration 082.
-- Requires explicit Staging authority and a tested restore point.
-- Does not run during application startup/build. Never feed to Production blindly.
-- Only legacy empty Hero records are backfilled; populated typed records stay intact.
begin;
do $$
declare
  v_page_id uuid;
  v_section public.page_sections%rowtype;
  v_legacy jsonb;
  v_content jsonb;
  v_defaults jsonb := '{"eyebrow":"مساحة عربية للفهم والتعلّم والاختيار الواعي","headlineStart":"افهمي","headlineAccent":"نفسكِ…","headlineMiddle":"واختاري","headlinePath":"حياة","headlineEnd":"تشبهكِ","headlineAwareness":"أنتِ","lead":"دورات وكتب وورش وجلسات تساعدك على فهم ما تحتاجينه، ثم تحويل هذا الفهم إلى خطوة واضحة تناسب إيقاعك وحياتك.","primaryCta":"ابدئي من هنا","secondaryCta":"احجزي جلستك","imageTitle":"صورة تعبيرية","imageLead":"تمثل جمهور المنصة ولا تمثل المالكة"}'::jsonb;
begin
  select value into v_legacy from public.site_settings where key = 'home_copy';
  if v_legacy is null then v_legacy := '{}'::jsonb; end if;
  if jsonb_typeof(v_legacy) <> 'object' then raise exception 'legacy_home_copy_review_required'; end if;
  -- Drop unknown legacy keys, never overwrite a valid authored known field.
  select v_defaults || coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    into v_content from jsonb_each(v_legacy) where v_defaults ? key;
  if v_content->>'secondaryCta' = 'استكشفي المسارات' then
    v_content := jsonb_set(v_content, '{secondaryCta}', v_defaults->'secondaryCta');
  end if;
  if not public.master_v2_home_content_valid('hero', v_content) then
    raise exception 'legacy_home_copy_review_required';
  end if;
  -- Same lock order as manage_cms_page_section: page, advisory, section.
  for v_page_id in select id from public.pages where slug = 'home' for update loop
    perform pg_advisory_xact_lock(hashtextextended('cms-page-sections:' || v_page_id::text, 0));
    for v_section in select * from public.page_sections
      where page_id = v_page_id and kind = 'hero' and content = '{}'::jsonb for update
    loop
    insert into public.content_revisions(entity_type, entity_id, snapshot, created_by)
      values ('page_section', v_section.id, to_jsonb(v_section), null);
    update public.page_sections set content = v_content, revision = v_section.revision + 1 where id = v_section.id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
      values (null, 'home_section.master_v2_backfilled', 'page_section', v_section.id::text,
        jsonb_build_object('source', 'legacy_home_copy', 'revisionCreated', true));
    end loop;
  end loop;
end $$;
commit;
-- Roll back CONTENT using the recorded prior revision through the governed
-- recovery workflow. Keep the immutable revision/audit history and 082 schema.
