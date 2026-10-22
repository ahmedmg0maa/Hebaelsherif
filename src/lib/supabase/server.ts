import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabasePublicKey } from './public-key'
import { getSupabaseServerKey } from './server-key'

// Server Components / Server Actions / Route Handlers client (anon key + user cookies).
export async function getServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component — session refresh is handled by middleware.
          }
        },
      },
    },
  )
}

// Service-role client — SERVER ONLY. Bypasses RLS; use exclusively after an
// explicit access check (signed URLs, grants, admin mutations).
export function getServiceClient() {
  const key = getSupabaseServerKey()
  if (!key) throw new Error('Supabase server secret is not configured.')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** True only when a server-only elevated key is available; never expose this value. */
export function hasSupabaseServerSecret() {
  return Boolean(getSupabaseServerKey())
}
