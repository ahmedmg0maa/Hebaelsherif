'use client'

import { createBrowserClient } from '@supabase/ssr'
import { assertSupabasePublicEnv } from './env'

let browserClient: any = null

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient
  const { url, anonKey } = assertSupabasePublicEnv()
  browserClient = createBrowserClient(url, anonKey)
  return browserClient
}
