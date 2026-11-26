import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'

/** Server-only enrollment and role lookup; never trusts user_metadata. */
export async function isPasswordOwner(userId: string) {
  if (!hasSupabaseServerSecret()) return false
  const service = getServiceClient()
  const [access, role] = await Promise.all([
    service.from('owner_password_access').select('user_id').eq('user_id', userId).eq('enabled', true).maybeSingle(),
    service.from('admin_roles').select('user_id').eq('user_id', userId).eq('role', 'owner').maybeSingle(),
  ])
  return !access.error && !role.error && Boolean(access.data && role.data)
}

/** Read claims only after getUser has validated this same Supabase session. */
export function validatedSessionClaims(accessToken?: string) {
  try { return JSON.parse(Buffer.from(accessToken?.split('.')[1] ?? '', 'base64url').toString('utf8')) as { session_id?: string; amr?: { method?: string; timestamp?: number }[] } }
  catch { return {} }
}
