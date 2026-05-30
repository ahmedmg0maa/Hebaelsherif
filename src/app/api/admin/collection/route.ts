import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

interface AdminCollectionItem {
  id: string
  archived?: boolean
  [key: string]: unknown
}

interface AdminCollectionBody {
  id?: unknown
  values?: Record<string, unknown>
  action?: unknown
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

const allowedCollections = new Set([
  'coupons',
  'faqs',
  'articles',
  'reviews',
  'leads',
  'media_library',
  'testimonials',
  'session_packages',
  'bundles',
  'journeys',
  'drive_assets',
  'admin_tasks',
  'campaigns',
  'content_calendar',
  'email_templates',
  'workshops',
  'customer_notes',
  'saved_views',
])

async function assertAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return null
  }

  const auth = getAdminAuth()
  const db = getAdminDb()

  const decoded = await auth.verifyIdToken(token)
  const userSnap = await db.collection('users').doc(decoded.uid).get()
  const role = userSnap.data()?.role || decoded.role

  if (role !== 'admin') {
    return null
  }

  return decoded.uid
}

function getCollection(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const collectionName = clean(searchParams.get('collectionName'))

  if (!collectionName || !allowedCollections.has(collectionName)) {
    return null
  }

  return collectionName
}

export async function GET(req: NextRequest) {
  try {
    const adminId = await assertAdmin(req)

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const collectionName = getCollection(req)

    if (!collectionName) {
      return NextResponse.json({ error: 'Invalid collection.' }, { status: 400 })
    }

    const db = getAdminDb()
    const snap = await db.collection(collectionName).limit(100).get()

    const items: AdminCollectionItem[] = snap.docs
      .map(
        (docItem): AdminCollectionItem => ({
          id: docItem.id,
          ...docItem.data(),
        }),
      )
      .filter((item) => !item.archived)

    return NextResponse.json({
      success: true,
      items,
    })
  } catch (error) {
    console.error('Admin collection GET error:', error)

    return NextResponse.json({ error: 'Failed to load collection.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = await assertAdmin(req)

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const collectionName = getCollection(req)

    if (!collectionName) {
      return NextResponse.json({ error: 'Invalid collection.' }, { status: 400 })
    }

    const body = (await req.json()) as AdminCollectionBody
    const id = clean(body.id)
    const action = clean(body.action)
    const values =
      body.values && typeof body.values === 'object' && !Array.isArray(body.values)
        ? body.values
        : {}

    const db = getAdminDb()

    if ((action === 'delete' || action === 'archive') && id) {
      await db.collection(collectionName).doc(id).set(
        {
          archived: true,
          active: false,
          status: 'archived',
          archivedAt: Timestamp.now(),
          archivedBy: adminId,
          updatedAt: Timestamp.now(),
          updatedBy: adminId,
        },
        { merge: true },
      )

      await db.collection('admin_logs').add({
        adminId,
        action: 'collection_item_archived',
        targetType: collectionName,
        targetId: id,
        createdAt: Timestamp.now(),
      })

      return NextResponse.json({ success: true })
    }

    if (id) {
      await db.collection(collectionName).doc(id).set(
        {
          ...values,
          updatedAt: Timestamp.now(),
          updatedBy: adminId,
        },
        { merge: true },
      )

      return NextResponse.json({
        success: true,
        id,
      })
    }

    const ref = await db.collection(collectionName).add({
      ...values,
      archived: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: adminId,
      updatedBy: adminId,
    })

    return NextResponse.json({
      success: true,
      id: ref.id,
    })
  } catch (error) {
    console.error('Admin collection POST error:', error)

    return NextResponse.json({ error: 'Failed to save collection item.' }, { status: 500 })
  }
}