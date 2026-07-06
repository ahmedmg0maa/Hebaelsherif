import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

export interface FeatureFlags {
  courses_enabled: boolean
  workshops_enabled: boolean
  books_enabled: boolean
  booking_enabled: boolean
  maintenance_mode: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  courses_enabled: false,
  workshops_enabled: false,
  books_enabled: true,
  booking_enabled: true,
  maintenance_mode: false,
}

function envOverride(name: string): boolean | undefined {
  const raw = process.env[name]
  if (raw === 'true') return true
  if (raw === 'false') return false
  return undefined
}

/**
 * Reads feature flags from site_settings (key = 'features', public row) with
 * safe defaults, so a missing row or unreachable database never breaks pages.
 * NEXT_PUBLIC_FEATURE_* env vars win over database values when set.
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const flags: FeatureFlags = { ...DEFAULT_FLAGS }

  try {
    const { url, anonKey } = getSupabasePublicEnv()
    if (url && anonKey) {
      const supabase = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'features')
        .eq('is_public', true)
        .maybeSingle()

      const value = (data?.value ?? {}) as Partial<Record<keyof FeatureFlags, unknown>>
      for (const key of Object.keys(flags) as Array<keyof FeatureFlags>) {
        if (typeof value[key] === 'boolean') flags[key] = value[key] as boolean
      }
    }
  } catch {
    // Fall through to defaults/env overrides — flags must never crash a page.
  }

  const overrides: Record<keyof FeatureFlags, string> = {
    courses_enabled: 'NEXT_PUBLIC_FEATURE_COURSES',
    workshops_enabled: 'NEXT_PUBLIC_FEATURE_WORKSHOPS',
    books_enabled: 'NEXT_PUBLIC_FEATURE_BOOKS',
    booking_enabled: 'NEXT_PUBLIC_FEATURE_BOOKING',
    maintenance_mode: 'NEXT_PUBLIC_MAINTENANCE_MODE',
  }
  for (const key of Object.keys(overrides) as Array<keyof FeatureFlags>) {
    const value = envOverride(overrides[key])
    if (value !== undefined) flags[key] = value
  }

  return flags
}
