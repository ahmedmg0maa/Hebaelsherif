import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import type { DecodedIdToken } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

export type AdminPermission =
  | 'owner'
  | 'admin'
  | 'super_admin'
  | 'finance'
  | 'support'
  | 'content_manager'
  | 'viewer'

export interface AdminContext {
  uid: string
  email?: string
  role: AdminPermission
  decoded: DecodedIdToken
  db: Firestore
}

const adminRoles = new Set<AdminPermission>(['owner', 'admin', 'super_admin', 'finance', 'support', 'content_manager', 'viewer'])

export function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error, details }, { status })
}

export function jsonSuccess(data: Record<string, unknown> = {}) {
  return NextResponse.json({ success: true, ...data })
}

export function getBearerToken(req: NextRequest) {
  return req.headers.get('authorization')?.replace('Bearer ', '').trim() || ''
}

export async function requireAdmin(req: NextRequest, allowedRoles: AdminPermission[] = ['owner', 'admin', 'super_admin']) {
  const token = getBearerToken(req)

  if (!token) {
    return { error: jsonError('يجب تسجيل الدخول كمدير.', 401) as NextResponse, context: null }
  }

  const db = getAdminDb()
  const decoded = await getAdminAuth().verifyIdToken(token)
  const userSnap = await db.collection('users').doc(decoded.uid).get()
  const roleValue = String(userSnap.data()?.role || decoded.role || 'user') as AdminPermission

  if (!adminRoles.has(roleValue) || !allowedRoles.includes(roleValue)) {
    return { error: jsonError('ليست لديك صلاحية لتنفيذ هذا الإجراء.', 403) as NextResponse, context: null }
  }

  return {
    error: null,
    context: {
      uid: decoded.uid,
      email: decoded.email || String(userSnap.data()?.email || ''),
      role: roleValue,
      decoded,
      db,
    } satisfies AdminContext,
  }
}

export async function requireUser(req: NextRequest) {
  const token = getBearerToken(req)

  if (!token) {
    return { error: jsonError('يجب تسجيل الدخول أولًا.', 401) as NextResponse, uid: '', decoded: null, db: getAdminDb() }
  }

  const decoded = await getAdminAuth().verifyIdToken(token)
  return { error: null, uid: decoded.uid, decoded, db: getAdminDb() }
}

export async function writeAdminLog(
  db: Firestore,
  params: {
    adminId: string
    adminEmail?: string
    action: string
    targetType: string
    targetId?: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    message?: string
  },
) {
  await db.collection('admin_logs').add({
    adminId: params.adminId,
    adminEmail: params.adminEmail || '',
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId || '',
    before: params.before || {},
    after: params.after || {},
    message: params.message || '',
    createdAt: Timestamp.now(),
  })
}

export async function createNotification(
  db: Firestore,
  params: {
    userId?: string
    adminOnly?: boolean
    type: string
    title: string
    body: string
    href?: string
    entityType?: string
    entityId?: string
    priority?: 'low' | 'normal' | 'high'
  },
) {
  await db.collection('notifications').add({
    userId: params.userId || '',
    adminOnly: Boolean(params.adminOnly),
    type: params.type,
    title: params.title,
    body: params.body,
    href: params.href || '',
    entityType: params.entityType || '',
    entityId: params.entityId || '',
    priority: params.priority || 'normal',
    status: 'unread',
    createdAt: Timestamp.now(),
  })
}

export function sanitizeForPublicProduct(values: Record<string, unknown>) {
  const privateKeys = [
    'contentUrl',
    'contentURL',
    'protectedUrl',
    'protectedURL',
    'downloadUrl',
    'downloadURL',
    'fileUrl',
    'fileURL',
    'driveUrl',
    'driveURL',
    'driveFileUrl',
    'driveFileURL',
    'driveFolderUrl',
    'driveFolderURL',
    'googleDriveUrl',
    'googleDriveURL',
    'resourceUrl',
    'resourceURL',
    'videoUrl',
    'videoURL',
    'pdfUrl',
    'pdfURL',
    'secretUrl',
    'secretURL',
    'privateUrl',
    'privateURL',
    'accessUrl',
    'accessURL',
  ]

  const cleaned = { ...values }
  privateKeys.forEach((key) => {
    delete cleaned[key]
  })
  return cleaned
}

export function parseDateRange(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = cleanString(searchParams.get('from'))
  const to = cleanString(searchParams.get('to'))
  return { from, to }
}
