import { existsSync, readFileSync } from 'node:fs'
import { walk, read, report } from './lib.mjs'

const failures = []
const manifest = JSON.parse(readFileSync('scripts/expected-routes.json', 'utf8'))

// Once admin routes exist, the admin tree must have a layout that performs a role check.
if (manifest.admin.length > 0) {
  const layout = 'src/app/admin/layout.tsx'
  if (!existsSync(layout)) {
    failures.push('admin routes declared but src/app/admin/layout.tsx missing')
  } else if (!/requireAdmin|admin_roles|role/i.test(read(layout))) {
    failures.push('admin layout has no visible role check')
  }
  // Every admin page must exist (covered by audit:routes) and no admin page may skip auth wrapper.
  for (const f of walk('src/app/admin', ['.tsx'])) {
    if (/(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)/.test(read(f)) && /['"]use client['"]/.test(read(f)))
      failures.push(`${f}: service key in client admin component`)
  }

  const privilegedActionFiles = [
    'src/lib/actions/admin.ts', 'src/lib/actions/admin-tools.ts', 'src/lib/actions/admin-control.ts',
    'src/lib/actions/booking-admin.ts', 'src/lib/actions/cms.ts', 'src/lib/actions/marketing.ts',
    'src/lib/actions/reports.ts', 'src/lib/actions/revisions.ts',
  ]
  for (const file of privilegedActionFiles) {
    if (!existsSync(file)) failures.push(`${file}: privileged action module missing`)
    else if (!/require(?:Permission|FreshAdminAssurance)\(/.test(read(file))) failures.push(`${file}: actions do not use a centralized permission/assurance gate`)
  }

  const freshGateTargets = [
    ['src/lib/actions/admin.ts', 'approvePayment'],
    ['src/lib/actions/admin.ts', 'rejectPayment'],
    ['src/lib/actions/cms.ts', 'grantRole'],
    ['src/lib/actions/cms.ts', 'revokeRole'],
    ['src/lib/actions/cms.ts', 'setRolePermissions'],
    ['src/lib/actions/admin-control.ts', 'saveOperationalSettings'],
    ['src/lib/actions/revisions.ts', 'restoreContentRevision'],
  ]
  for (const [file, action] of freshGateTargets) {
    const source = read(file)
    const start = source.indexOf(`export async function ${action}`)
    const next = source.indexOf('\nexport async function ', start + 1)
    if (start === -1 || !/requireFreshAdminAssurance\(/.test(source.slice(start, next === -1 ? source.length : next)))
      failures.push(`${file}: ${action} lacks fresh-AAL2 step-up protection`)
  }

  const reports = read('src/lib/data/reports.ts')
  const reportsPage = read('src/app/admin/reports/page.tsx')
  const reportActions = read('src/lib/actions/reports.ts')
  if (!/state: 'ready' \| 'unconfigured' \| 'error'/.test(reports)) failures.push('reports source lacks explicit readiness state')
  if (!/state !== 'ready'/.test(reportsPage)) failures.push('reports page can render unavailable source data as KPIs')
  if (!/reports\.state !== 'ready'/.test(reportActions)) failures.push('report snapshots are not blocked when data is unavailable')
  const reportExport = read('src/app/admin/reports/export/route.ts')
  if (!/requireFreshAdminAssurance\('reports\.export'\)/.test(reportExport)) failures.push('report export lacks fresh-AAL2 protection')
  if (!/action: 'report\.exported'/.test(reportExport)) failures.push('report export lacks fail-closed audit evidence')

  const permissionLayouts = [
    'payments', 'orders', 'bookings', 'memberships', 'users', 'inbox', 'products', 'courses', 'books',
    'workshops', 'articles', 'pages', 'revisions', 'media', 'reviews', 'offers', 'coupons', 'reports', 'roles',
    'audit-logs', 'security', 'settings', 'system',
  ]
  for (const route of permissionLayouts) {
    const file = `src/app/admin/${route}/layout.tsx`
    if (!existsSync(file) || !/PermissionBoundary/.test(read(file))) failures.push(`${file}: granular page boundary missing`)
  }

  const migrations = walk('supabase/migrations', ['.sql']).map(read).join('\n')
  if (!/function public\.has_permission/.test(migrations)) failures.push('database has_permission() migration missing')
  if (!/permission_rls/.test(walk('supabase/migrations', ['.sql']).join('\n'))) failures.push('permission RLS migration missing')
}

report('audit:admin', failures)
