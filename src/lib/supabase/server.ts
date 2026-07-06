import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { assertSupabasePublicEnv } from './env'

export async function createSupabaseServerClient(): Promise<any> {
  const { url, anonKey } = assertSupabasePublicEnv()
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot set cookies. Middleware/Route Handlers can.
        }
      },
    },
  })
}
