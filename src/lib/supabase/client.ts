import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicKey } from './public-key'

// Create lazily (inside handlers/effects) — never at module scope, so
// prerendering client components without env vars can't crash the build.
export function getBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey(),
  )
}
