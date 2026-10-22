'use server'

import { establishAdminSession as establish } from '@/lib/auth/admin-session'

/** Client-callable boundary for creating the opaque server-only admin session. */
export async function establishAdminSession() {
  return establish()
}
