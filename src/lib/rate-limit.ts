import { getServerClient } from '@/lib/supabase/server'

type RateLimitScope = 'coupon' | 'payment_proof' | 'checkout'

export async function rateLimit(
  scope: RateLimitScope,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const supabase = await getServerClient()
  const { data, error } = await supabase.rpc('consume_action_rate_limit', {
    p_scope: scope,
    p_max_hits: max,
    p_window_seconds: windowSeconds,
  })
  if (error || !data || typeof data !== 'object') return { allowed: false, retryAfterSec: 60 }
  const result = data as { allowed?: unknown; retryAfterSec?: unknown }
  return {
    allowed: result.allowed === true,
    retryAfterSec: Number(result.retryAfterSec) || 0,
  }
}

export const RATE_LIMIT_MSG = 'محاولات كثيرة — انتظري قليلًا ثم حاولي مجددًا.'
