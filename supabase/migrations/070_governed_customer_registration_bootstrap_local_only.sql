-- 070: governed customer profile bootstrap; registration never grants Admin.
-- LOCAL ONLY. Apply after 069 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

-- These NOT VALID constraints protect every new/changed row without making the
-- migration fail because of unknown historical profile content. Validation of
-- the existing population belongs to the controlled Staging data-quality gate.
alter table public.profiles
  drop constraint if exists profiles_full_name_shape;
alter table public.profiles
  add constraint profiles_full_name_shape check (
    full_name = ''
    or (
      char_length(full_name) between 2 and 120
      and full_name !~ '[[:cntrl:]]'
    )
  ) not valid;

alter table public.profiles
  drop constraint if exists profiles_email_shape;
alter table public.profiles
  add constraint profiles_email_shape check (
    email = ''
    or (
      char_length(email) <= 320
      and email = btrim(email)
      and email !~ '[[:cntrl:]]'
    )
  ) not valid;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text := regexp_replace(
    btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
    '[[:space:]]+',
    ' ',
    'g'
  );
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_inserted integer := 0;
begin
  if char_length(v_full_name) not between 2 and 120
     or v_full_name ~ '[[:cntrl:]]' then
    v_full_name := '';
  end if;
  if char_length(v_email) > 320
     or v_email ~ '[[:cntrl:]]' then
    v_email := '';
  end if;

  insert into public.profiles(id, full_name, email)
  values (new.id, v_full_name, v_email)
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (
      new.id,
      'customer.registered',
      'profile',
      new.id::text,
      jsonb_build_object(
        'profileCreated', true,
        'nameAccepted', v_full_name <> ''
      )
    );
  end if;

  -- Deliberately no admin_roles write. Owner/staff provisioning is a separate,
  -- owner-authorized AAL2 operation governed by migration 060.
  return new;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

comment on function public.handle_new_user() is
  'Auth-trigger-only profile bootstrap with bounded identity metadata and content-minimized audit; never grants administrative roles.';

-- Rollback-by-forward-fix: do not restore email-based role grants or remove
-- existing profiles/audit. Replace the function and constraints additively.
