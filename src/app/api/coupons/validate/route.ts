import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isExpired(expiresAtText?: string) {
  if (!expiresAtText) return false
  const date = new Date(`${expiresAtText}T23:59:59`)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() < Date.now()
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

    const db = getAdminDb()
    const snap = await db.collection('coupons').where('code', '==', code).where('active', '==', true).limit(1).get()

    if (snap.empty) {
      return NextResponse.json({ valid: false, discountAmount: 0, reason: 'not_found' })
    }

    const couponDoc = snap.docs[0]
    const coupon = couponDoc.data() as {
      type?: string
      value?: number
      minAmount?: number
      expiresAtText?: string
      usageLimit?: number
      usageCount?: number
      scope?: string
    }

    if (isExpired(coupon.expiresAtText)) {
      return NextResponse.json({ valid: false, discountAmount: 0, reason: 'expired' })
    }

    if (coupon.scope && coupon.scope !== 'all' && coupon.scope !== scope) {
      return NextResponse.json({ valid: false, discountAmount: 0, reason: 'scope' })
    }

    if (Number(coupon.minAmount || 0) > amount) {
      return NextResponse.json({ valid: false, discountAmount: 0, reason: 'min_amount' })
    }

    if (Number(coupon.usageLimit || 0) > 0 && Number(coupon.usageCount || 0) >= Number(coupon.usageLimit)) {
      return NextResponse.json({ valid: false, discountAmount: 0, reason: 'usage_limit' })
    }

    const value = Number(coupon.value || 0)
    const discountAmount = coupon.type === 'percentage' ? Math.round((amount * value) / 100) : value

    return NextResponse.json({
      valid: true,
      code,
      couponId: couponDoc.id,
      discountAmount: Math.max(0, Math.min(discountAmount, amount)),
      reason: 'valid',
    })
  } catch (error) {
    console.error('Coupon validate API error:', error)
    return NextResponse.json({ valid: false, discountAmount: 0, reason: 'error' })
  }
}
