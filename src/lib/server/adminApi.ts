import { NextRequest, NextResponse } from 'next/server'
import { Timestamp, type DocumentData } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

export interface AdminIdentity {
  uid: string
  email: string
  role: string
  name?: string
}

export function cleanText(value: unknown, maxLength = 2000) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

export function cleanOptionalNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status })
}

export async function getAuthenticatedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return null

  const decoded = await getAdminAuth().verifyIdToken(token)
  const db = getAdminDb()
  const userSnap = await db.collection('users').doc(decoded.uid).get()
  const userData = userSnap.exists ? userSnap.data() : {}
  const role = String(userData?.role || decoded.role || 'user')

  return {
    uid: decoded.uid,
    email: String(decoded.email || userData?.email || ''),
    name: String(userData?.name || userData?.displayName || decoded.name || ''),
    role,
  }
}

export async function requireAdmin(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  if (!user || !['admin', 'owner', 'super_admin'].includes(user.role)) return null
  return user
}

export function now() {
  return Timestamp.now()
}

export async function writeAdminLog(params: {
  admin: AdminIdentity
  action: string
  targetType: string
  targetId?: string
  before?: DocumentData | null
  after?: DocumentData | null
  message?: string
}) {
  const db = getAdminDb()
  await db.collection('admin_logs').add({
    adminId: params.admin.uid,
    adminEmail: params.admin.email,
    adminName: params.admin.name || '',
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId || '',
    before: sanitizeLogPayload(params.before),
    after: sanitizeLogPayload(params.after),
    message: params.message || '',
    createdAt: now(),
  })
}

export async function createNotification(params: {
  userId?: string
  adminOnly?: boolean
  type: string
  title: string
  body: string
  href?: string
  entityType?: string
  entityId?: string
  priority?: 'low' | 'normal' | 'high'
}) {
  const db = getAdminDb()
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
    read: false,
    createdAt: now(),
  })
}

export function sanitizeLogPayload(payload: DocumentData | null | undefined) {
  if (!payload) return {}
  const blocked = new Set(['contentUrl', 'resourceUrl', 'driveUrl', 'driveFileUrl', 'driveFolderUrl', 'privateUrl', 'secretUrl'])
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => !blocked.has(key))
      .map(([key, value]) => [key, typeof value === 'function' ? '[function]' : value]),
  )
}

export function hasPrivateLinkFields(data: Record<string, unknown>) {
  const privateFields = [
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

  return privateFields.some((key) => typeof data[key] === 'string' && String(data[key]).trim().length > 0)
}

export function removePrivateLinkFields(data: Record<string, unknown>) {
  const clone = { ...data }
  for (const key of Object.keys(clone)) {
    if (/url$/i.test(key) || /drive/i.test(key) || /protected/i.test(key) || /resource/i.test(key)) {
      if (!['coverImageUrl', 'heroImageUrl', 'ogImageUrl', 'previewImageUrl', 'imageUrl'].includes(key)) {
        delete clone[key]
      }
    }
  }
  return clone
}
