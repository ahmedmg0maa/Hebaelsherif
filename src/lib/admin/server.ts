import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import type { ProductType } from '@/types'

export type AdminPermission =
  | 'orders:write'
  | 'bookings:write'
  | 'content:write'
  | 'products:write'
  | 'users:write'
  | 'reviews:write'
  | 'settings:write'
  | 'analytics:read'
  | 'support'
  | 'content_manager'
  | 'finance'
  | 'admin'
  | 'owner'

export interface VerifiedAdmin {
  uid: string
  email: string
  role: string
  permissions: Set<AdminPermission | '*'>
}

const rolePermissions: Record<string, Array<AdminPermission | '*'>> = {
  owner: ['*'],
  admin: ['*'],
  finance: ['orders:write', 'analytics:read', 'finance'],
  support: ['bookings:write', 'reviews:write', 'support', 'analytics:read'],
  content_manager: ['content:write', 'products:write', 'reviews:write', 'content_manager', 'analytics:read'],
  viewer: ['analytics:read'],
}

export function cleanText(value: unknown, max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function isProductType(value: unknown): value is ProductType {
  return value === 'course' || value === 'book'
}

export function getBearerToken(req: NextRequest) {
  return cleanText(req.headers.get('authorization')).replace(/^Bearer\s+/i, '')
}

export async function requireAdmin(req: NextRequest, permission?: AdminPermission): Promise<VerifiedAdmin> {
  const token = getBearerToken(req)
  if (!token) throw new Error('UNAUTHORIZED')

  const auth = getAdminAuth()
  const db = getAdminDb()
  const decoded = await auth.verifyIdToken(token)
  const userSnap = await db.collection('users').doc(decoded.uid).get()
  const userData = userSnap.data() || {}
  const role = String(userData.role || decoded.role || 'user')
  const permissions = new Set(rolePermissions[role] || [])

  if (!permissions.has('*') && permission && !permissions.has(permission)) {
    throw new Error('FORBIDDEN')
  }
  if (!permissions.has('*') && !permission && !Object.keys(rolePermissions).includes(role)) {
    throw new Error('FORBIDDEN')
  }

  return {
    uid: decoded.uid,
    email: String(userData.email || decoded.email || ''),
    role,
    permissions,
  }
}

export async function assertAdmin(req: NextRequest, permission?: AdminPermission | string) {
  try {
    return await requireAdmin(req, permission as AdminPermission | undefined)
  } catch {
    return null
  }
}

export function apiErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  if (message === 'UNAUTHORIZED') return 401
  if (message === 'FORBIDDEN') return 403
  if (message === 'NOT_FOUND') return 404
  if (message === 'BAD_REQUEST') return 400
  return 500
}

export function apiErrorMessage(error: unknown) {
  const status = apiErrorStatus(error)
  if (status === 401) return 'يجب تسجيل الدخول بحساب أدمن.'
  if (status === 403) return 'ليست لديك صلاحية تنفيذ هذا الإجراء.'
  if (status === 404) return 'العنصر المطلوب غير موجود.'
  if (status === 400) return 'بيانات غير مكتملة.'
  return 'تعذر تنفيذ العملية الآن.'
}

export function serverError(message = 'تعذر تنفيذ العملية الآن.', status = 500) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function now() {
  return Timestamp.now()
}

interface LogParams {
  admin: VerifiedAdmin | { uid: string; email?: string; role?: string }
  action: string
  targetType: string
  targetId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  message?: string
}

export async function writeAdminLog(db: Firestore, params: LogParams): Promise<void>
export async function writeAdminLog(params: LogParams): Promise<void>
export async function writeAdminLog(dbOrParams: Firestore | LogParams, maybeParams?: LogParams) {
  const db = maybeParams ? (dbOrParams as Firestore) : getAdminDb()
  const params = maybeParams || (dbOrParams as LogParams)
  await db.collection('admin_logs').add({
    adminId: params.admin.uid,
    adminEmail: params.admin.email || '',
    adminRole: params.admin.role || '',
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId || '',
    before: sanitizeLogPayload(params.before),
    after: sanitizeLogPayload(params.after),
    message: params.message || '',
    createdAt: Timestamp.now(),
  })
}

interface NotificationParams {
  audience?: 'admin' | 'user' | 'all'
  userId?: string
  adminOnly?: boolean
  type: string
  title: string
  body?: string
  message?: string
  href?: string
  entityType?: string
  entityId?: string
  priority?: 'low' | 'normal' | 'high' | 'critical'
}

export async function createNotification(db: Firestore, params: NotificationParams): Promise<void>
export async function createNotification(params: NotificationParams): Promise<void>
export async function createNotification(dbOrParams: Firestore | NotificationParams, maybeParams?: NotificationParams) {
  const db = maybeParams ? (dbOrParams as Firestore) : getAdminDb()
  const params = maybeParams || (dbOrParams as NotificationParams)
  await db.collection('notifications').add({
    audience: params.audience || (params.adminOnly ? 'admin' : 'user'),
    userId: params.userId || '',
    type: params.type,
    title: params.title,
    body: params.body || params.message || '',
    message: params.message || params.body || '',
    href: params.href || '',
    entityType: params.entityType || '',
    entityId: params.entityId || '',
    priority: params.priority || 'normal',
    status: 'unread',
    read: false,
    createdAt: Timestamp.now(),
  })
}

export function serverTimestamp() {
  return Timestamp.now()
}

export function deleteField() {
  return FieldValue.delete()
}

export const privateContentFields = [
  'contentUrl', 'contentURL', 'protectedUrl', 'protectedURL', 'downloadUrl', 'downloadURL', 'fileUrl', 'fileURL',
  'driveUrl', 'driveURL', 'driveFileUrl', 'driveFileURL', 'driveFolderUrl', 'driveFolderURL', 'googleDriveUrl', 'googleDriveURL',
  'resourceUrl', 'resourceURL', 'videoUrl', 'videoURL', 'pdfUrl', 'pdfURL', 'secretUrl', 'secretURL', 'privateUrl', 'privateURL', 'accessUrl', 'accessURL',
]

export function sanitizeLogPayload(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return {}
  const blocked = new Set(privateContentFields)
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !blocked.has(key)))
}

export function hasPrivateFieldLeak(data: Record<string, unknown>) {
  return privateContentFields.some((field) => typeof data[field] === 'string' && String(data[field]).trim().length > 0)
}

export function removePrivateFields(data: Record<string, unknown>) {
  const sanitized = { ...data }
  privateContentFields.forEach((field) => {
    delete sanitized[field]
  })
  return sanitized
}

export function getProtectedContentDocumentId(productType: ProductType, productId: string) {
  return `${productType}_${productId}`
}
