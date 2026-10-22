import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'

// Executes the actual local validator, resolving its TypeScript-only imports.
export function loadCatalogSource(path) {
  const filename = resolve(path), loaded = { exports: {} }
  const require = createRequire(filename)
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const sourceRequire = name => name.startsWith('.') ? loadCatalogSource(resolve(dirname(filename), `${name}.ts`)) : require(name)
  new Function('require', 'module', 'exports', compiled)(sourceRequire, loaded, loaded.exports)
  return loaded.exports
}

export const { catalogEditorPayload } = loadCatalogSource('src/lib/catalog/editor.ts')
export const actor = '10000000-0000-4000-8000-000000000001'
export const editor = '10000000-0000-4000-8000-000000000002'
export const cover = '20000000-0000-4000-8000-000000000001'
export const cover2 = '20000000-0000-4000-8000-000000000002'

export function catalogForm(kind, overrides = {}) {
  const fields = {
    title: 'محتوى تجريبي', slug: `test-${kind}`, subtitle: 'عنوان فرعي تجريبي',
    description: 'وصف تجريبي كامل للمحتوى يتجاوز الحد المطلوب للنشر.', price: '200', currency: 'EGP',
    cover_asset_id: cover, cover_url: 'https://example.test/storage/v1/object/public/public-media/cover.jpg',
    ...(kind === 'course' ? { duration_minutes: '60', level: 'all' } : {}),
    ...(kind === 'book' ? { pages_count: '90', author: 'هبة الشريف' } : {}),
    ...(kind === 'service' ? { duration_minutes: '60', booking_payment_mode: 'payment_required' } : {}),
    ...(kind === 'workshop' ? { starts_at: '2099-01-15T12:00', ends_at: '2099-01-15T14:00', seats_total: '10', location_kind: 'online', meeting_url: 'https://example.test/meeting' } : {}),
    ...overrides,
  }
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) if (value !== null) form.set(key, value)
  return form
}

export function catalogPayload(kind, overrides = {}) {
  const result = catalogEditorPayload(kind, catalogForm(kind, overrides))
  if (!result.ok) throw new Error(result.error)
  return result.value
}

// Actual core table DDL and relevant ALTERs, with deliberately minimal external
// history/permission fixtures. This is NOT a full Supabase migration rehearsal.
export function catalogFixtureSQL() {
  const read = file => readFileSync(`supabase/migrations/${file}`, 'utf8')
  const table = (file, name) => {
    const match = read(file).match(new RegExp(`create table (?:if not exists )?public\\.${name} \\([\\s\\S]*?\\n\\);`, 'i'))
    if (!match) throw new Error(`Missing real table DDL: ${name}`)
    return match[0]
  }
  const alter = (file, name) => read(file).match(new RegExp(`alter table public\\.${name}\\s+[\\s\\S]*?;`, 'i'))[0]
  return `
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values ('${actor}'),('${editor}');
    create table public.fixture_permissions(actor_id uuid, permission text);
    insert into fixture_permissions values ('${actor}','catalog.manage'),('${actor}','catalog.publish'),('${actor}','catalog.delete'),('${editor}','catalog.manage');
    create function public.has_permission(p text, a uuid) returns boolean language sql stable as $$ select exists(select 1 from public.fixture_permissions where actor_id=a and permission=p) $$;
    ${table('003_commerce.sql', 'products')}
    ${table('003_commerce.sql', 'product_bundles')}
    ${table('004_lms.sql', 'courses')}
    ${table('004_lms.sql', 'course_modules')}
    ${table('004_lms.sql', 'course_lessons')}
    ${table('004_lms.sql', 'lesson_resources')}
    ${table('005_books.sql', 'books')}
    ${table('005_books.sql', 'book_versions')}
    ${table('005_books.sql', 'book_files')}
    ${alter('074_governed_protected_delivery_removal_local_only.sql', 'book_files')}
    ${table('006_booking.sql', 'services')}
    ${table('006_booking.sql', 'availability_rules')}
    ${alter('044_booking_operational_workflow_local_only.sql', 'services')}
    ${table('007_workshops.sql', 'workshops')}
    ${table('007_workshops.sql', 'workshop_resources')}
    ${table('007_workshops.sql', 'workshop_recordings')}
    ${table('008_cms.sql', 'media_assets')}
    ${alter('021_media_library.sql', 'media_assets')}
    ${alter('046_media_governance_local_only.sql', 'media_assets')}
    ${alter('054_media_lifecycle_local_only.sql', 'media_assets')}
    ${table('021_media_library.sql', 'media_usages')}
    ${table('018_admin_control_center.sql', 'content_revisions')}
    ${table('002_users_auth.sql', 'audit_logs')}
    create table order_items(id uuid default gen_random_uuid(), product_id uuid references products(id));
    create table content_access(product_id uuid references products(id));
    create table course_enrollments(course_id uuid references courses(id));
    create table book_access(book_id uuid references books(id));
    create table workshop_registrations(workshop_id uuid references workshops(id));
    create table bookings(service_id uuid references services(id));
    insert into media_assets(id,bucket,path,kind,visibility,rights_status,rights_reference)
      values ('${cover}','public-media','cover.jpg','image','public','owned','Synthetic fixture'),
             ('${cover2}','public-media','cover-2.jpg','image','public','owned','Synthetic fixture');
    grant select,insert,update,delete on products,courses,books,workshops,services to anon,authenticated;
  `
}
