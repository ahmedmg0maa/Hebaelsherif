import { supabasePublicConfigIssues } from './public-config.mjs'
export function adminLoginPrerequisites(env = process.env) {
  const issues = []
  const secret = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const email = env.OWNER_ADMIN_EMAIL?.trim()
  for (const issue of supabasePublicConfigIssues(env)) {
    issues.push(issue === 'url' ? 'NEXT_PUBLIC_SUPABASE_URL: أضيفي عنوان المشروع الصحيح.' : 'مفتاح Supabase العام: املئي PUBLISHABLE_KEY أو ANON_KEY.')
  }
  if (!secret) issues.push('مفتاح الخادم: املئي SUPABASE_SECRET_KEY أو SUPABASE_SERVICE_ROLE_KEY على الخادم فقط.')
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push('OWNER_ADMIN_EMAIL: أضيفي بريد حساب المالكة الصحيح على الخادم.')
  return issues
}
