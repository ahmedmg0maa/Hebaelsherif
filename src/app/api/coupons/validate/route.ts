export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { code?: unknown; amount?: unknown; scope?: unknown }
    const code = clean(body.code).toUpperCase()
    const amount = Number(body.amount || 0)
    const scope = clean(body.scope) || 'all'

    if (!code || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ valid: false, discountAmount: 0, reason: 'empty' })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.rpc('validate_coupon', {
      input_code: code,
      input_amount: amount,
      input_scope: scope,
    })

    if (error) throw error

    const result = (data || {}) as { valid?: boolean; appliedCode?: string; discountAmount?: number; couponId?: string | null }

    return NextResponse.json({
      valid: Boolean(result.valid),
      code: result.appliedCode || '',
      couponId: result.couponId || '',
      discountAmount: Number(result.discountAmount || 0),
      reason: result.valid ? 'valid' : 'not_valid',
    })
  } catch (error) {
    console.error('Supabase coupon validate API error:', error)
    return NextResponse.json({ valid: false, discountAmount: 0, reason: 'error' })
  }
}
