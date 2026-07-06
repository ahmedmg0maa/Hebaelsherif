import { createSupabaseAdminClient } from './admin'

export interface DecodedIdToken {
  uid: string
  email?: string
  role?: string
  [key: string]: unknown
}

export function createSupabaseAuthAdminCompat() {
  const supabase = createSupabaseAdminClient()
  return {
    async verifyIdToken(token: string): Promise<DecodedIdToken> {
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data.user) throw error || new Error('Invalid Supabase access token')
      return {
        uid: data.user.id,
        email: data.user.email || undefined,
        role: String(data.user.app_metadata?.role || data.user.user_metadata?.role || ''),
        ...data.user.user_metadata,
      }
    },
    async getUserByEmail(email: string) {
      const { data, error } = await supabase.auth.admin.listUsers()
      if (error) throw error
      const user = data.users.find((item: { email?: string | null }) => item.email?.toLowerCase() === email.toLowerCase())
      if (!user) throw new Error(`No user found for ${email}`)
      return { uid: user.id, email: user.email || email }
    },
    async setCustomUserClaims(uid: string, claims: Record<string, unknown>) {
      const { error } = await supabase.auth.admin.updateUserById(uid, { app_metadata: claims })
      if (error) throw error
    },
  }
}
