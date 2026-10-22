import { createHash, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './public-config.mjs'

const { url } = getSupabasePublicConfig()
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!key) throw new Error('Supabase server configuration is missing')
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const throttleKey = createHash('sha256').update(randomUUID()).digest('hex')

try {
  const consume = async (p_outcome) => {
    const { data, error } = await supabase.rpc('consume_admin_login_throttle', { p_key: throttleKey, p_outcome })
    if (error || !Array.isArray(data) || data.length !== 1) throw error ?? new Error('Unexpected throttle response')
    return data[0]
  }
  if (!(await consume('attempt')).allowed) throw new Error('Fresh administrative login attempt was blocked')
  for (let count = 0; count < 5; count += 1) await consume('failure')
  const locked = await consume('attempt')
  if (locked.allowed || locked.retry_after_seconds < 1 || locked.retry_after_seconds > 300) throw new Error('Progressive administrative cooldown was not enforced')
  const blockedSuccess = await consume('success')
  if (blockedSuccess.allowed) throw new Error('Cooldown was bypassed by a reset outcome')
} finally {
  await supabase.from('admin_login_throttles').delete().eq('throttle_key', throttleKey)
}

console.log('verify:admin-controls passed — serialized progressive login cooldown enforced')
