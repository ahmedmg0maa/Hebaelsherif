import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertSupabaseServiceEnv } from './env'

let serviceClient: any = null

export function createSupabaseAdminClient() {
  if (serviceClient) return serviceClient
  const { url, serviceRoleKey } = assertSupabaseServiceEnv()
  serviceClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return serviceClient
}
