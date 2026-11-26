-- 000: non-destructive relocation of a pre-existing (legacy) schema.
-- The Supabase project had an earlier schema attempt (remote migrations 0001–0009)
-- with real rows in services/site_settings. Nothing is dropped: every public
-- table and function moves to the `legacy` schema; 013 ports the real data back.
create schema if not exists legacy;

do $$
declare r record;
begin
  -- move all user tables out of public
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I set schema legacy', r.tablename);
  end loop;

  -- move views too (if any)
  for r in
    select viewname from pg_views where schemaname = 'public'
  loop
    execute format('alter view public.%I set schema legacy', r.viewname);
  end loop;

  -- move user functions so legacy triggers keep working (OID references survive);
  -- skip extension-owned functions (e.g. btree_gist) — not ours to move
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.classid = 'pg_proc'::regclass and d.deptype = 'e'
      )
  loop
    execute format('alter function %s set schema legacy', r.sig);
  end loop;

  -- drop legacy triggers on auth.users (ours is recreated in 002)
  for r in
    select t.tgname
    from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal
  loop
    execute format('drop trigger %I on auth.users', r.tgname);
  end loop;

  -- clear storage.objects policies so 010 can recreate ours without name clashes
  for r in
    select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;
