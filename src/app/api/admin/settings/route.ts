import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

const allowedCollections = new Set([
  'site_settings',
  'availability_settings',
  'payment_settings',
  'seo_settings',
  'notification_templates',
  'navigation_settings',
  'media_settings',
  'ai_guide_settings',
  'feature_flags',
  'integration_settings',
  'policy_settings',
  'legal_settings',
  'security_settings',
  'operations_settings',
  'backup_settings',
  'email_settings',
  'calendar_settings',
  'pricing_settings',
  'experiment_settings',
  'academy_settings',
  'admin_analytics_events_settings',
  'admin_assessment_settings',
  'admin_automation_settings',
  'admin_commerce_settings',
  'admin_content_ops_settings',
  'admin_customer_journey_settings',
  'admin_homepage_settings',
  'admin_quality_settings',
  'admin_theme_settings',
])

async function assertAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const auth = getAdminAuth()
  const db = getAdminDb()
  const decoded = await auth.verifyIdToken(token)
  const userSnap = await db.collection('users').doc(decoded.uid).get()
  const role = userSnap.data()?.role || decoded.role

  if (role !== 'admin') return null
  return decoded.uid
}

function getTarget(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const collectionName = clean(searchParams.get('collectionName'))
  const documentId = clean(searchParams.get('documentId')) || 'default'

  if (!collectionName || !allowedCollections.has(collectionName)) return null
  return { collectionName, documentId }
}

export async function GET(req: NextRequest) {
  try {
    const adminId = await assertAdmin(req)
    if (!adminId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const target = getTarget(req)
    if (!target) return NextResponse.json({ error: 'Invalid settings target.' }, { status: 400 })

    const db = getAdminDb()
    const snap = await db.collection(target.collectionName).doc(target.documentId).get()

    return NextResponse.json({
      success: true,
      exists: snap.exists,
      data: snap.exists ? snap.data() : {},
    })
  } catch (error) {
    console.error('Admin settings GET error:', error)
    return NextResponse.json({ error: 'Failed to load settings.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminId = await assertAdmin(req)
    if (!adminId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const target = getTarget(req)
    if (!target) return NextResponse.json({ error: 'Invalid settings target.' }, { status: 400 })

    const body = (await req.json()) as { values?: Record<string, unknown> }
    const values = body.values && typeof body.values === 'object' ? body.values : {}

    const db = getAdminDb()
    await db.collection(target.collectionName).doc(target.documentId).set(
      {
        ...values,
        updatedAt: Timestamp.now(),
        updatedBy: adminId,
      },
      { merge: true },
    )

    await db.collection('admin_logs').add({
      adminId,
      action: 'settings_updated',
      targetType: target.collectionName,
      targetId: target.documentId,
      after: values,
      createdAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin settings PUT error:', error)
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 })
  }
}
