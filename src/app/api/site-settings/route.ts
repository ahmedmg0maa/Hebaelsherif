import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

const publicCollections = [
  { collectionName: 'site_settings', documentId: 'default' },
  { collectionName: 'payment_settings', documentId: 'default' },
  { collectionName: 'availability_settings', documentId: 'default' },
  { collectionName: 'seo_settings', documentId: 'default' },
  { collectionName: 'feature_flags', documentId: 'default' },
]

function removeSensitiveFields(data: Record<string, unknown>) {
  const blocked = new Set(['secret', 'apiKey', 'webhookSecret', 'privateKey', 'token', 'password'])
  return Object.fromEntries(Object.entries(data).filter(([key]) => !blocked.has(key)))
}

export async function GET() {
  try {
    const db = getAdminDb()
    const entries = await Promise.all(
      publicCollections.map(async (target) => {
        const snap = await db.collection(target.collectionName).doc(target.documentId).get()
        return [target.collectionName, snap.exists ? removeSensitiveFields(snap.data() || {}) : {}] as const
      }),
    )

    return NextResponse.json({ success: true, settings: Object.fromEntries(entries) })
  } catch (error) {
    console.error('Site settings GET error:', error)
    return NextResponse.json({ success: true, settings: {} })
  }
}
