import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { cleanText, isAdminResponse, jsonError, jsonSuccess, requireAdmin } from '@/lib/admin/api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'logs:read')
  if (isAdminResponse(admin)) return admin

  try {
    const snap = await admin.db.collection('notifications').where('audience', 'in', ['admin', 'all']).limit(100).get()
    const notifications = (snap.docs
      .map((docItem) => {
        const data = docItem.data()
        return {
          id: docItem.id,
          ...data,
          body: data.body || data.message || '',
          message: data.message || data.body || '',
          read: Boolean(data.read || data.status === 'read'),
          priority: data.priority || 'normal',
        }
      }) as Array<Record<string, unknown> & { createdAt?: { toMillis?: () => number } }>)
      .sort((a, b) => {
        const left = (a as Record<string, unknown>).createdAt as { toMillis?: () => number } | undefined
        const right = (b as Record<string, unknown>).createdAt as { toMillis?: () => number } | undefined
        return Number(right?.toMillis?.() || 0) - Number(left?.toMillis?.() || 0)
      })
    return jsonSuccess({ notifications })
  } catch (error) {
    console.error('Admin notifications GET error:', error)
    return jsonError('تعذر تحميل الإشعارات.', 500)
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'settings:write')
  if (isAdminResponse(admin)) return admin

  try {
    const body = (await req.json()) as { action?: unknown; title?: unknown; body?: unknown; message?: unknown; href?: unknown; priority?: unknown }
    const action = cleanText(body.action, 80)
    if (action !== 'broadcast_admin') return jsonError('إجراء الإشعار غير معروف.', 400)

    const title = cleanText(body.title, 160)
    const message = cleanText(body.message || body.body, 1000)
    const href = cleanText(body.href, 200)
    const priority = cleanText(body.priority, 20) || 'normal'
    if (!title || !message) return jsonError('عنوان ونص الإشعار مطلوبان.', 400)

    const ref = await admin.db.collection('notifications').add({
      audience: 'admin',
      type: 'manual_broadcast',
      title,
      body: message,
      message,
      href,
      priority,
      read: false,
      status: 'unread',
      createdAt: Timestamp.now(),
    })

    return jsonSuccess({ id: ref.id })
  } catch (error) {
    console.error('Admin notifications POST error:', error)
    return jsonError('تعذر إنشاء الإشعار.', 500)
  }
}
