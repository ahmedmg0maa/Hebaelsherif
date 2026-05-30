import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

export type AdminRole = 'owner' | 'super_admin' | 'admin' | 'finance' | 'support' | 'content_manager' | 'viewer'

export interface AuthenticatedAdmin {
  uid: string
  email: string
  name: string
  role: AdminRole
  db: Firestore
}

export interface AuthenticatedUser {
  uid: string
  email: string
  name: string
  role?: string
  db: Firestore
}

const adminRoles = new Set<AdminRole>(['owner', 'super_admin', 'admin', 'finance', 'support', 'content_manager', 'viewer'])
const writeRoles = new Set<AdminRole>(['owner', 'super_admin', 'admin', 'finance', 'support', 'content_manager'])

export function cleanText(value: unknown, maxLength = 4000) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

export function cleanUrl(value: unknown) {
  const url = cleanText(value, 2000)
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : ''
  } catch {
    return ''
  }
}

export function jsonError(message: string, status = 400, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: message, ...details }, { status })
}

export function jsonSuccess<T extends Record<string, unknown> = Record<string, never>>(payload?: T) {
  return NextResponse.json({ success: true, ...(payload || {}) })
}

export function now() {
  return Timestamp.now()
}

function getToken(req: NextRequest) {
  return req.headers.get('authorization')?.replace('Bearer ', '').trim() || ''
}

export async function requireUser(req: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  const token = getToken(req)
  if (!token) return jsonError('يجب تسجيل الدخول أولًا.', 401)

  try {
    const db = getAdminDb()
    const decoded = await getAdminAuth().verifyIdToken(token)
    const userSnap = await db.collection('users').doc(decoded.uid).get()
    const profile = userSnap.exists ? userSnap.data() || {} : {}

    return {
      uid: decoded.uid,
      email: decoded.email || String(profile.email || ''),
      name: decoded.name || String(profile.name || profile.displayName || 'مستخدمة'),
      role: String(profile.role || decoded.role || 'user'),
      db,
    }
  } catch (error) {
    console.error('User authentication error:', error)
    return jsonError('انتهت صلاحية الجلسة أو لا توجد صلاحية كافية.', 401)
  }
}

export async function requireAdmin(req: NextRequest, allowedRoles?: AdminRole[]): Promise<AuthenticatedAdmin | NextResponse> {
  const result = await requireUser(req)
  if (result instanceof NextResponse) return result

  const role = (result.role || 'user') as AdminRole
  const allowed = allowedRoles && allowedRoles.length > 0 ? new Set(allowedRoles) : writeRoles

  if (!adminRoles.has(role) || !allowed.has(role)) {
    return jsonError('لا توجد صلاحية كافية لتنفيذ هذا الإجراء.', 403)
  }

  return {
    ...result,
    role,
  }
}

export function isReadonlyAdmin(admin: AuthenticatedAdmin) {
  return admin.role === 'viewer'
}

export async function writeAdminLog(params: {
  db: Firestore
  adminId: string
  adminEmail?: string
  action: string
  targetType: string
  targetId?: string
  before?: DocumentData | null
  after?: DocumentData | null
  message?: string
}) {
  try {
    await params.db.collection('admin_logs').add({
      adminId: params.adminId,
      adminEmail: params.adminEmail || '',
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId || '',
      before: params.before || null,
      after: params.after || null,
      message: params.message || '',
      createdAt: now(),
    })
  } catch (error) {
    console.warn('Admin log write failed:', error)
  }
}

export async function createNotification(params: {
  db: Firestore
  userId?: string
  role?: 'admin' | 'user'
  type: string
  title: string
  message: string
  href?: string
  priority?: 'low' | 'normal' | 'high'
  entityType?: string
  entityId?: string
}) {
  try {
    await params.db.collection('notifications').add({
      userId: params.userId || '',
      role: params.role || (params.userId ? 'user' : 'admin'),
      type: params.type,
      title: params.title,
      message: params.message,
      href: params.href || '',
      priority: params.priority || 'normal',
      entityType: params.entityType || '',
      entityId: params.entityId || '',
      read: false,
      createdAt: now(),
      updatedAt: now(),
    })
  } catch (error) {
    console.warn('Notification write failed:', error)
  }
}

export async function appendTimeline(params: {
  db: Firestore
  collectionName: string
  documentId: string
  action: string
  title: string
  by: string
  note?: string
  meta?: Record<string, unknown>
}) {
  try {
    await params.db
      .collection(params.collectionName)
      .doc(params.documentId)
      .collection('timeline')
      .add({
        action: params.action,
        title: params.title,
        by: params.by,
        note: params.note || '',
        meta: params.meta || {},
        createdAt: now(),
      })
  } catch (error) {
    console.warn('Timeline write failed:', error)
  }
}

export async function trackEvent(params: {
  db: Firestore
  userId?: string
  name: string
  source?: string
  properties?: Record<string, unknown>
}) {
  try {
    await params.db.collection('events').add({
      userId: params.userId || '',
      name: params.name,
      source: params.source || 'server',
      properties: params.properties || {},
      createdAt: now(),
    })
  } catch (error) {
    console.warn('Event tracking failed:', error)
  }
}

export function withUpdatedMeta(values: Record<string, unknown>, admin?: AuthenticatedAdmin | AuthenticatedUser) {
  return {
    ...values,
    updatedAt: now(),
    updatedBy: admin?.uid || 'system',
  }
}
