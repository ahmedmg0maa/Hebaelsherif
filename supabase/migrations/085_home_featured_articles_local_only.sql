-- 085: ordered featured articles from published content only. LOCAL ONLY.
create or replace function public.validate_home_featured_articles()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_slug text; v_article public.articles%rowtype;
begin
  if NEW.kind<>'articles' or not exists(select 1 from public.pages where id=NEW.page_id and slug='home') or not(NEW.content ? 'selectedSlugs') then return NEW; end if;
  if jsonb_typeof(NEW.content->'selectedSlugs')<>'array' then raise exception using errcode='22023',message='home_articles_selection_invalid'; end if;
  if jsonb_array_length(NEW.content->'selectedSlugs')>3 or exists(select 1 from jsonb_array_elements(NEW.content->'selectedSlugs') item where jsonb_typeof(item)<>'string') then raise exception using errcode='22023',message='home_articles_count_invalid'; end if;
  if (select count(distinct value) from jsonb_array_elements_text(NEW.content->'selectedSlugs'))<>jsonb_array_length(NEW.content->'selectedSlugs') then raise exception using errcode='22023',message='home_articles_duplicate'; end if;
  for v_slug in select value from jsonb_array_elements_text(NEW.content->'selectedSlugs') order by value loop
    if length(v_slug) not between 3 and 80 or v_slug!~'^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception using errcode='22023',message='home_article_slug_invalid'; end if;
    select * into v_article from public.articles where slug=v_slug for share;
    if not found or not v_article.is_published or v_article.status<>'published' then raise exception using errcode='23514',message='home_article_not_published'; end if;
  end loop;
  return NEW;
end $$;
revoke all on function public.validate_home_featured_articles() from public,anon,authenticated;
create trigger home_featured_articles_validation before insert or update on public.page_sections for each row execute function public.validate_home_featured_articles();
