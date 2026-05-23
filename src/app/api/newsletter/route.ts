import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase/admin'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: unknown; source?: unknown; interest?: unknown }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const source = typeof body.source === 'string' ? body.source.trim() : 'website'
    const interest = typeof body.interest === 'string' ? body.interest.trim() : ''

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'اكتبي بريدًا إلكترونيًا صحيحًا.' }, { status: 400 })
    }

    const db = getAdminDb()
    await db.collection('leads').add({
      email,
      source,
      interest,
      status: 'new',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter API error:', error)
    return NextResponse.json({ error: 'تعذر حفظ الاشتراك الآن.' }, { status: 500 })
  }
}
