export function getSupabasePublicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }
}

export function assertSupabasePublicEnv() {
  const env = getSupabasePublicEnv()
  const missing = []
  if (!env.url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!env.anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (missing.length > 0) {
    throw new Error(`Missing Supabase public environment variables: ${missing.join(', ')}`)
  }
  return env
}

export function getSupabaseServiceEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  }
}

export function assertSupabaseServiceEnv() {
  const env = getSupabaseServiceEnv()
  const missing = []
  if (!env.url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!env.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (missing.length > 0) {
    throw new Error(`Missing Supabase service environment variables: ${missing.join(', ')}`)
  }
  return env
}
