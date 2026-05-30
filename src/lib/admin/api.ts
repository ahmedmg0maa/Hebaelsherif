import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp, type DocumentData, type Firestore, type Transaction } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

export type AdminRole = 'owner' | 'admin' | 'super_admin' | 'support' | 'content_manager' | 'finance' | 'viewer'

export type AdminPermission =
  | 'orders:write'
  | 'bookings:write'
  | 'content:write'
  | 'customers:write'
  | 'reviews:write'
  | 'settings:write'
  | 'logs:read'
  | 'analytics:read'

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  owner: ['orders:write', 'bookings:write', 'content:write', 'customers:write', 'reviews:write', 'settings:write', 'logs:read', 'analytics:read'],
  super_admin: ['orders:write', 'bookings:write', 'content:write', 'customers:write', 'reviews:write', 'settings:write', 'logs:read', 'analytics:read'],
  admin: ['orders:write', 'bookings:write', 'content:write', 'customers:write', 'reviews:write', 'settings:write', 'logs:read', 'analytics:read'],
  support: ['bookings:write', 'customers:write', 'reviews:write', 'logs:read', 'analytics:read'],
  content_manager: ['content:write', 'reviews:write', 'logs:read', 'analytics:read'],
  finance: ['orders:write', 'logs:read', 'analytics:read'],
  viewer: ['logs:read', 'analytics:read'],
}

const adminRoles = new Set<AdminRole>(['owner', 'admin', 'super_admin', 'support', 'content_manager', 'finance', 'viewer'])

export interface AdminContext {
  uid: string
  email: string
  name: string
  role: AdminRole
  db: Firestore
}

export function cleanText(value: unknown, max = 2000) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function jsonSuccess(data: Record<string, unknown> = {}) {
  return NextResponse.json({ success: true, ...data })
}

export async function requireAdmin(req: NextRequest, permission?: AdminPermission): Promise<AdminContext | NextResponse> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()

  if (!token) return jsonError('يجب تسجيل الدخول كمسؤول.', 401)

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const db = getAdminDb()
    const userSnap = await db.collection('users').doc(decoded.uid).get()
    const role = String(userSnap.data()?.role || 'user') as AdminRole

    if (!adminRoles.has(role)) return jsonError('لا تملك صلاحية الدخول لهذه العملية.', 403)
    if (permission && !rolePermissions[role].includes(permission)) return jsonError('صلاحيات هذا الحساب لا تسمح بتنفيذ هذا الإجراء.', 403)

    return {
      uid: decoded.uid,
      email: decoded.email || String(userSnap.data()?.email || ''),
      name: String(userSnap.data()?.name || decoded.name || decoded.email || 'Admin'),
      role,
      db,
    }
  } catch (error) {
    console.error('Admin auth error:', error)
    return jsonError('تعذر التحقق من صلاحية الأدمن.', 401)
  }
}

export function isAdminResponse(value: AdminContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

export async function writeAdminLog(params: {
  db: Firestore | Transaction
  admin: Pick<AdminContext, 'uid' | 'email' | 'role'>
  action: string
  targetType: string
  targetId?: string
  before?: DocumentData | null
  after?: DocumentData | null
  message?: string
}) {
  const payload = {
    adminId: params.admin.uid,
    adminEmail: params.admin.email,
    adminRole: params.admin.role,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId || '',
    before: params.before || null,
    after: params.after || null,
    message: params.message || '',
    createdAt: Timestamp.now(),
  }

  if ('collection' in params.db) {
    await params.db.collection('admin_logs').add(payload)
    return
  }

  const realDb = getAdminDb()
  const ref = realDb.collection('admin_logs').doc()
  params.db.set(ref, payload)
}

export async function createNotification(params: {
  db: Firestore | Transaction
  type: string
  title: string
  body: string
  audience: 'admin' | 'user'
  userId?: string
  href?: string
  priority?: 'low' | 'normal' | 'high'
}) {
  const payload = {
    type: params.type,
    title: params.title,
    body: params.body,
    audience: params.audience,
    userId: params.userId || '',
    href: params.href || '',
    priority: params.priority || 'normal',
    read: false,
    createdAt: Timestamp.now(),
  }

  if ('collection' in params.db) {
    await params.db.collection('notifications').add(payload)
    return
  }

  const realDb = getAdminDb()
  const ref = realDb.collection('notifications').doc()
  params.db.set(ref, payload)
}

export async function trackServerEvent(params: {
  db: Firestore | Transaction
  type: string
  userId?: string
  entityType?: string
  entityId?: string
  source?: string
  metadata?: Record<string, unknown>
}) {
  const payload = {
    type: params.type,
    userId: params.userId || '',
    entityType: params.entityType || '',
    entityId: params.entityId || '',
    source: params.source || 'server',
    metadata: params.metadata || {},
    createdAt: Timestamp.now(),
  }

  if ('collection' in params.db) {
    await params.db.collection('events').add(payload)
    return
  }

  const realDb = getAdminDb()
  const ref = realDb.collection('events').doc()
  params.db.set(ref, payload)
}

export async function appendEntityTimeline(params: {
  db: Firestore | Transaction
  entityType: string
  entityId: string
  action: string
  label: string
  description?: string
  admin?: Pick<AdminContext, 'uid' | 'email'>
}) {
  const payload = {
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    label: params.label,
    description: params.description || '',
    adminId: params.admin?.uid || 'system',
    adminEmail: params.admin?.email || '',
    createdAt: Timestamp.now(),
  }

  if ('collection' in params.db) {
    await params.db.collection('activity_timeline').add(payload)
    return
  }

  const realDb = getAdminDb()
  const ref = realDb.collection('activity_timeline').doc()
  params.db.set(ref, payload)
}

export async function addCustomerTag(db: Firestore, userId: string, tag: string) {
  if (!userId || !tag) return
  await db.collection('users').doc(userId).set(
    {
      tags: FieldValue.arrayUnion(tag),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  )
}
