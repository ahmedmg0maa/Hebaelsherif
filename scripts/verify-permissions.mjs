import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './public-config.mjs'

const PERMISSIONS = [
  'admin.access', 'roles.manage', 'users.view', 'users.manage', 'payments.view', 'payments.approve', 'payments.reject',
  'orders.view', 'orders.update', 'orders.refund', 'bookings.view', 'bookings.manage', 'availability.manage', 'packages.manage',
  'catalog.view', 'catalog.manage', 'catalog.publish', 'catalog.delete', 'content.view', 'content.manage', 'content.publish',
  'content.delete', 'learning.manage', 'media.view', 'media.manage', 'media.delete', 'settings.view', 'settings.manage',
  'feature_flags.manage', 'inbox.view', 'inbox.manage', 'newsletter.manage', 'reviews.manage', 'reports.view',
  'reports.export', 'reports.snapshot', 'marketing.manage', 'audit.view', 'system.view', 'notifications.send', 'admin.search',
]

const { url, key: publicKey } = getSupabasePublicConfig()
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!key) throw new Error('Supabase server configuration is missing')

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const { data: mappings, error: mappingsError } = await supabase.from('admin_permissions').select('role,permission')
if (mappingsError) throw mappingsError

const expectedRoles = ['admin', 'operations', 'finance', 'content', 'marketing', 'support', 'editor']
for (const role of expectedRoles) {
  if (!mappings.some((row) => row.role === role && row.permission === 'admin.access')) {
    throw new Error(`Missing admin.access mapping for ${role}`)
  }
}

const { data: owner, error: ownerError } = await supabase.from('admin_roles').select('user_id').eq('role', 'owner').limit(1).maybeSingle()
if (ownerError) throw ownerError
if (!owner) throw new Error('No owner recovery account exists')

const checks = await Promise.all(PERMISSIONS.map((permission_name) => supabase.rpc('has_permission', { permission_name, uid: owner.user_id })))
if (checks.some((result) => result.error || result.data !== true)) throw new Error('Owner wildcard permission check failed')

// Live least-privilege smoke test with a disposable support account.
const marker = crypto.randomUUID()
const email = `permission-${marker}@example.invalid`
const password = `T!${crypto.randomUUID()}a9`
let disposableUserId
try {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (createError || !created.user) throw createError ?? new Error('Could not create permission test user')
  disposableUserId = created.user.id
  const { error: roleError } = await supabase.from('admin_roles').insert({ user_id: disposableUserId, role: 'support', granted_by: owner.user_id })
  if (roleError) throw roleError

  const userClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: signInError } = await userClient.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  // A password-only session must be denied even when it has an administrative
  // role. AAL2 is obtained only after the TOTP challenge in the application.
  const [{ data: canEnter }, { data: canMarket }] = await Promise.all([
    userClient.rpc('has_permission', { permission_name: 'admin.access', uid: disposableUserId }),
    userClient.rpc('has_permission', { permission_name: 'marketing.manage', uid: disposableUserId }),
  ])
  if (canEnter !== false || canMarket !== false) throw new Error('AAL1 session unexpectedly retained administrative permission')

  const { error: deniedWrite } = await userClient.from('feature_flags').insert({ key: `permission-test-${marker}`, is_enabled: false })
  if (!deniedWrite) throw new Error('RLS allowed support to mutate feature flags')
  const { error: deniedNotification } = await userClient.from('notifications').insert({ user_id: disposableUserId, title: 'Permission test', body: '', kind: 'info' })
  if (!deniedNotification) throw new Error('AAL1 session was allowed to create an administrative notification')
} finally {
  await supabase.from('feature_flags').delete().eq('key', `permission-test-${marker}`)
  if (disposableUserId) await supabase.auth.admin.deleteUser(disposableUserId)
}

console.log(`verify:permissions passed — ${expectedRoles.length + 1} roles, ${mappings.length} mappings, service-role wildcard and AAL1 denial verified`)
