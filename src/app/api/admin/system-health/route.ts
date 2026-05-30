export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import type { Firestore } from 'firebase-admin/firestore'
import { jsonError, jsonSuccess, requireAdmin } from '@/lib/server/admin-guard'
import { buildOperationalAlerts, getOperationalHealth } from '@/lib/admin/operations'

async function getCollection(db: Firestore, name: string) {
  const snap = await db.collection(name).limit(500).get()
  return snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, ['owner', 'super_admin', 'admin', 'support', 'viewer'])
    if (admin instanceof Response) return admin

    const [orders, bookings, courses, books, protectedItems, contact, leads] = await Promise.all([
      getCollection(admin.db, 'orders'),
      getCollection(admin.db, 'bookings'),
      getCollection(admin.db, 'courses'),
      getCollection(admin.db, 'books'),
      getCollection(admin.db, 'protected_content'),
      getCollection(admin.db, 'contact_messages'),
      getCollection(admin.db, 'leads'),
    ])

    const alerts = buildOperationalAlerts({
      orders: orders as never,
      bookings: bookings as never,
      courses: courses as never,
      books: books as never,
      protectedItems: protectedItems as Array<Record<string, unknown>>,
      messages: [...contact, ...leads] as Array<{ status?: unknown }>,
    })
    const env = {
      appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      adminProject: Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID),
      adminEmail: Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
      adminPrivateKey: Boolean(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      paymentInstapay: Boolean(process.env.NEXT_PUBLIC_PAYMENT_INSTAPAY),
      paymentWallet: Boolean(process.env.NEXT_PUBLIC_PAYMENT_WALLET),
      paymentBank: Boolean(process.env.NEXT_PUBLIC_PAYMENT_BANK),
    }
    const envMissing = Object.entries(env).filter(([, value]) => !value).map(([key]) => key)
    const health = getOperationalHealth(alerts)

    return jsonSuccess({
      health,
      alerts,
      environment: { ok: envMissing.length === 0, missing: envMissing, checks: env },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('System health API error:', error)
    return jsonError('تعذر فحص صحة النظام الآن.', 500)
  }
}
