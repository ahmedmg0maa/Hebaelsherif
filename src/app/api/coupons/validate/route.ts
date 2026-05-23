import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { code?: unknown; amount?: unknown }
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    const amount = Number(body.amount || 0)

    if (!code) return NextResponse.json({ valid: false, discountAmount: 0 })

    const db = getAdminDb()
    const snap = await db.collection('coupons').where('code', '==', code).where('active', '==', true).limit(1).get()

    if (snap.empty) return NextResponse.json({ valid: false, discountAmount: 0 })

    const coupon = snap.docs[0].data() as { type?: string; value?: number }
    const value = Number(coupon.value || 0)
    const discountAmount = coupon.type === 'percentage' ? Math.round((amount * value) / 100) : value

    return NextResponse.json({ valid: true, code, discountAmount: Math.max(0, Math.min(discountAmount, amount)) })
  } catch (error) {
    console.error('Coupon validate API error:', error)
    return NextResponse.json({ valid: false, discountAmount: 0 })
  }
}
