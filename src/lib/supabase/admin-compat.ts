import 'server-only'

import { createSupabaseAuthAdminCompat } from '@/lib/supabase/auth-admin-compat'
import { SupabaseAdminDataCompat } from '@/lib/supabase/data-admin-compat'
import { getSupabaseServiceEnv } from '@/lib/supabase/env'

let cachedDb: SupabaseAdminDataCompat | null = null
let cachedAuth: ReturnType<typeof createSupabaseAuthAdminCompat> | null = null

export function getSupabaseAdminConfigStatus() {
  const env = getSupabaseServiceEnv()
  const missingKeys: string[] = []
  if (!env.url) missingKeys.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!env.serviceRoleKey) missingKeys.push('SUPABASE_SERVICE_ROLE_KEY')
  return {
    ready: missingKeys.length === 0,
    missingKeys,
    projectId: 'supabase',
    clientEmail: 'service-role',
    hasPrivateKey: Boolean(env.serviceRoleKey),
  }
}

export function getAdminConfigStatus() {
  return getSupabaseAdminConfigStatus()
}

export function getAdminApp() {
  return { name: 'supabase-admin' }
}

export function getAdminDb() {
  if (!cachedDb) cachedDb = new SupabaseAdminDataCompat()
  return cachedDb
}

export function getAdminAuth() {
  if (!cachedAuth) cachedAuth = createSupabaseAuthAdminCompat()
  return cachedAuth
}

export function tryGetAdminDb() {
  try {
    return getAdminDb()
  } catch (error) {
    console.warn('[supabase-admin] Database is unavailable in this runtime:', error instanceof Error ? error.message : 'unknown error')
    return null
  }
}
