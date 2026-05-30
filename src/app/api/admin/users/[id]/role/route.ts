import { NextRequest } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { asRecord, cleanString, createNotification, jsonError, jsonSuccess, requireAdmin } from '@/lib/server/admin-api'

const allowedRoles = new Set(['user', 'admin', 'owner', 'support', 'finance', 'content_manager', 'viewer'])

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error, context } = await requireAdmin(req, ['owner', 'admin', 'super_admin'])
    if (error || !context) return error

    const userId = cleanString(params.id)
    const body = asRecord(await req.json().catch(() => ({})))
    const role = cleanString(body.role)

    if (!userId || !allowedRoles.has(role)) return jsonError('الدور أو المستخدم غير صحيح.', 400)
    if (userId === context.uid && role === 'user') return jsonError('لا يمكنك إزالة صلاحيتك من نفس الحساب.', 400)

    const userRef = context.db.collection('users').doc(userId)
    const userSnap = await userRef.get()
    if (!userSnap.exists) return jsonError('المستخدم غير موجود.', 404)

    const before = userSnap.data() || {}
    await userRef.set({ role, updatedAt: Timestamp.now(), updatedBy: context.uid }, { merge: true })

    await context.db.collection('admin_logs').add({
      adminId: context.uid,
      adminEmail: context.email || '',
      action: 'user_role_changed',
      targetType: 'users',
      targetId: userId,
      before: { role: before.role || 'user' },
      after: { role },
      message: `تغيير دور المستخدم إلى ${role}`,
      createdAt: Timestamp.now(),
    })

    await createNotification(context.db, {
      adminOnly: true,
      type: 'user_role_changed',
      title: 'تم تغيير دور مستخدم',
      body: `تم تغيير دور ${before.email || userId} إلى ${role}.`,
      href: '/admin/users',
      entityType: 'user',
      entityId: userId,
      priority: 'high',
    }).catch(() => undefined)

    return jsonSuccess({ userId, role })
  } catch (error) {
    console.error('Admin user role API error:', error)
    return jsonError('تعذر تغيير دور المستخدم.', 500)
  }
}
