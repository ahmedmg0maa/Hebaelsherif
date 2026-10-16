// Supabase's current publishable key is preferred. The legacy anon JWT remains
// a deployment-compatible fallback while projects migrate key formats.
export function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
  )
}

export function hasSupabasePublicConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      getSupabasePublicKey(),
  )
}
