import { isAccountDeletionStatus, type AccountDeletionStatus } from '@/lib/account-deletion/status'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'

export type MyAccountDeletionRequest = {
  id: string
  status: AccountDeletionStatus
  requestedAt: string
  updatedAt: string
  reviewedAt: string | null
  reviewNote: string | null
}

export async function getMyAccountDeletionRequest(): Promise<MyAccountDeletionRequest | null> {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) return null
  const supabase = await getServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error('CUSTOMER_ACCOUNT_DELETION_READ_UNAVAILABLE')
  if (!user) return null
  const { data, error } = await getServiceClient().rpc('get_customer_account_deletion_request', { p_actor_id: user.id })
  if (error) throw new Error('CUSTOMER_ACCOUNT_DELETION_READ_UNAVAILABLE')
  if (!data) return null
  if (typeof data !== 'object' || Array.isArray(data) || !isAccountDeletionStatus(data.status)
    || typeof data.id !== 'string' || typeof data.requestedAt !== 'string' || typeof data.updatedAt !== 'string') {
    throw new Error('CUSTOMER_ACCOUNT_DELETION_READ_UNAVAILABLE')
  }
  return {
    id: data.id,
    status: data.status,
    requestedAt: data.requestedAt,
    updatedAt: data.updatedAt,
    reviewedAt: typeof data.reviewedAt === 'string' ? data.reviewedAt : null,
    reviewNote: typeof data.reviewNote === 'string' ? data.reviewNote : null,
  }
}
