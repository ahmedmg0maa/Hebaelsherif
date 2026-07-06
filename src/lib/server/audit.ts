import 'server-only'

import { FieldValue, type Supabase } from '@/lib/supabase/data-admin-compat'
import type { AdminSession } from '@/lib/server/admin-auth'

export async function writeAdminLog(db: Supabase, params: {
  session: AdminSession
  action: string
  targetType: string
  targetId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  message?: string
}) {
  await db.collection('admin_logs').add({
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId || '',
    adminId: params.session.uid,
    adminEmail: params.session.email,
    adminRole: params.session.role,
    before: params.before || {},
    after: params.after || {},
    message: params.message || '',
    createdAt: FieldValue.serverTimestamp(),
  })
}

export async function createNotification(db: Supabase, params: {
  audience: 'admin' | 'user' | 'all'
  userId?: string
  type: string
  title: string
  body: string
  href?: string
  priority?: 'low' | 'normal' | 'high' | 'critical'
}) {
  await db.collection('notifications').add({
    audience: params.audience,
    userId: params.userId || '',
    type: params.type,
    title: params.title,
    body: params.body,
    href: params.href || '',
    priority: params.priority || 'normal',
    status: 'unread',
    createdAt: FieldValue.serverTimestamp(),
  })
}
