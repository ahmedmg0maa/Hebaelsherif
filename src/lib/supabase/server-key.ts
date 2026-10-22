/** Server-only key selection. Empty new-key fields must not mask a legacy key. */
export function getSupabaseServerKey() {
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
}
