import 'server-only'

import type { NextRequest } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import type { AdminRole } from '@/types'

export const adminRoles: AdminRole[] = ['owner', 'super_admin', 'admin', 'support', 'content_manager', 'finance', 'viewer']
export const writeRoles: AdminRole[] = ['owner', 'super_admin', 'admin', 'support', 'content_manager', 'finance']
export const financeRoles: AdminRole[] = ['owner', 'super_admin', 'admin', 'finance']
export const contentRoles: AdminRole[] = ['owner', 'super_admin', 'admin', 'content_manager']

export interface AdminSession {
  uid: string
  email: string
  role: AdminRole
  name?: string
}

export function getBearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length).trim()
}

export async function requireAdminSession(req: NextRequest, allowedRoles: AdminRole[] = writeRoles): Promise<AdminSession> {
  const token = getBearerToken(req)
  if (!token) {
    throw new Error('UNAUTHENTICATED')
  }

  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()
  const decoded = await adminAuth.verifyIdToken(token)
  const profileSnap = await adminDb.collection('users').doc(decoded.uid).get()

  if (!profileSnap.exists) {
    throw new Error('ADMIN_PROFILE_NOT_FOUND')
  }

  const profile = profileSnap.data() || {}
  const role = String(profile.role || 'user') as AdminRole

  if (!adminRoles.includes(role) || !allowedRoles.includes(role)) {
    throw new Error('FORBIDDEN')
  }

  return {
    uid: decoded.uid,
    email: decoded.email || String(profile.email || ''),
    name: String(profile.name || profile.displayName || ''),
    role,
  }
}

export function adminErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message === 'UNAUTHENTICATED') return { status: 401, error: 'يجب تسجيل الدخول أولًا.' }
  if (message === 'FORBIDDEN') return { status: 403, error: 'ليست لديك صلاحية تنفيذ هذا الإجراء.' }
  if (message === 'ADMIN_PROFILE_NOT_FOUND') return { status: 403, error: 'لم يتم العثور على ملف الأدمن.' }
  return { status: 500, error: 'تعذر تنفيذ العملية الآن.' }
}
