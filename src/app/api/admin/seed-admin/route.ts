import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(req: NextRequest) {
  try {
    const setupSecret = process.env.ADMIN_SETUP_SECRET
    const requestSecret = req.headers.get('x-admin-setup-secret')

    if (!setupSecret) {
      return NextResponse.json(
        { error: 'ADMIN_SETUP_SECRET is not configured.' },
        { status: 500 },
      )
    }

    if (!requestSecret || requestSecret !== setupSecret) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = (await req.json()) as { email?: unknown; name?: unknown; phone?: unknown }
    const email = sanitizeText(body.email).toLowerCase()
    const name = sanitizeText(body.name) || 'مدير المنصة'
    const phone = sanitizeText(body.phone)

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 })
    }

    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()
    const userRecord = await adminAuth.getUserByEmail(email)

    await adminDb.collection('users').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        name,
        email,
        phone,
        role: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    )

    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'admin' })

    return NextResponse.json({ success: true, uid: userRecord.uid, email, role: 'admin' })
  } catch (error) {
    console.error('Seed admin API error:', error)
    return NextResponse.json(
      {
        error:
          'Failed to seed admin. Make sure the user already exists in Firebase Authentication.',
      },
      { status: 500 },
    )
  }
}
