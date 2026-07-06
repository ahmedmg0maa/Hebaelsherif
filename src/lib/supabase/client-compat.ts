'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export const db = { provider: 'supabase' } as unknown

export const auth = {
  get currentUser() {
    return null
  },
} as unknown as { currentUser: null }

export async function getSupabaseAnalytics() {
  return null
}

export function getSupabaseClientApp() {
  return createSupabaseBrowserClient()
}

export default null
