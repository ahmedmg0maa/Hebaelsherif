export const SUPABASE_PUBLIC_ENV_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

export function getSupabasePublicConfig(env = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) throw new Error('Supabase public configuration missing')
  return { url, key }
}

/** Pure diagnostics share the same key precedence as all deployment scripts. */
export function supabasePublicConfigIssues(env = process.env) {
  const issues = []
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  try { if (!url || !['https:', 'http:'].includes(new URL(url).protocol)) throw Error() } catch { issues.push('url') }
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!key) issues.push('key')
  return issues
}
