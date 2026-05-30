export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import type { Firestore } from 'firebase-admin/firestore'
import { jsonError, jsonSuccess, requireAdmin } from '@/lib/server/admin-guard'
import { buildAnalyticsSummary } from '@/lib/analytics/insights'

async function getCollection(db: Firestore, name: string, limit = 500) {
  const snap = await db.collection(name).limit(limit).get()
  return snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, ['owner', 'super_admin', 'admin', 'finance', 'support', 'viewer'])
    if (admin instanceof Response) return admin

    const [orders, bookings, users, contact, leads, subscribers, events] = await Promise.all([
      getCollection(admin.db, 'orders'),
      getCollection(admin.db, 'bookings'),
      getCollection(admin.db, 'users'),
      getCollection(admin.db, 'contact_messages'),
      getCollection(admin.db, 'leads'),
      getCollection(admin.db, 'newsletter_subscribers'),
      getCollection(admin.db, 'events', 1000),
    ])

    return jsonSuccess({ summary: buildAnalyticsSummary({ orders, bookings, users, messages: [...contact, ...leads, ...subscribers], events }) })
  } catch (error) {
    console.error('Admin analytics API error:', error)
    return jsonError('تعذر تحميل التحليلات الآن.', 500)
  }
}
