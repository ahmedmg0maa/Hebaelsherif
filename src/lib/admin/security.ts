import { NextRequest, NextResponse } from 'next/server'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import type { UserRole } from '@/types'

export type AdminPermission =
  | 'orders:write'
  | 'bookings:write'
  | 'content:write'
  | 'products:write'
  | 'users:write'
  | 'reviews:write'
  | 'messages:write'
  | 'settings:write'
  | 'analytics:read'
  | 'logs:read'

const permissionMatrix: Record<UserRole, AdminPermission[]> = {
  super_admin: ['orders:write', 'bookings:write', 'content:write', 'products:write', 'users:write', 'reviews:write', 'messages:write', 'settings:write', 'analytics:read', 'logs:read'],
  owner: ['orders:write', 'bookings:write', 'content:write', 'products:write', 'users:write', 'reviews:write', 'messages:write', 'settings:write', 'analytics:read', 'logs:read'],
  admin: ['orders:write', 'bookings:write', 'content:write', 'products:write', 'users:write', 'reviews:write', 'messages:write', 'settings:write', 'analytics:read', 'logs:read'],
  finance: ['orders:write', 'analytics:read', 'logs:read'],
  support: ['bookings:write', 'messages:write', 'reviews:write', 'analytics:read', 'logs:read'],
  content_manager: ['content:write', 'products:write', 'reviews:write', 'analytics:read', 'logs:read'],
  viewer: ['analytics:read', 'logs:read'],
  user: [],
}

export interface AdminContext {
  uid: string
  email?: string
  role: UserRole
  decoded: DecodedIdToken
}

export function cleanText(value: unknown, maxLength = 4000) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

function asRole(value: unknown): UserRole {
  if (value === 'owner' || value === 'admin' || value === 'support' || value === 'content_manager' || value === 'finance' || value === 'viewer') {
    return value
  }
  return 'user'
}

export function hasPermission(role: UserRole, permission: AdminPermission) {
  return permissionMatrix[role]?.includes(permission) || false
}

export async function getAdminContext(req: NextRequest, permission?: AdminPermission): Promise<AdminContext | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return null

  const auth = getAdminAuth()
  const db = getAdminDb()
  const decoded = await auth.verifyIdToken(token)
  const userSnap = await db.collection('users').doc(decoded.uid).get()
  const role = asRole(userSnap.data()?.role || decoded.role)

  if (!hasPermission(role, permission || 'analytics:read') && role !== 'admin' && role !== 'owner') {
    return null
  }

  return {
    uid: decoded.uid,
    email: decoded.email || String(userSnap.data()?.email || ''),
    role,
    decoded,
  }
}

export async function requireAdmin(req: NextRequest, permission?: AdminPermission): Promise<AdminContext | NextResponse> {
  try {
    const admin = await getAdminContext(req, permission)
    if (!admin) return jsonError('Unauthorized admin action.', 401)
    return admin
  } catch (error) {
    console.error('Admin auth failed:', error)
    return jsonError('Unauthorized admin action.', 401)
  }
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}
