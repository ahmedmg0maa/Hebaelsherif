import { redirect } from 'next/navigation'
import { getServerClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { isPasswordOwner } from '@/lib/auth/owner-password'

/** One entry for every sensitive action; the server chooses the enrolled method. */
export default async function AdminConfirmationPage({ searchParams }: {
  searchParams: Promise<{ redirect?: string; next?: string }>
}) {
  const params = await searchParams
  const requested = params.redirect ?? params.next
  const destination = requested?.startsWith('/admin/') ? requested : '/admin/overview'
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) redirect('/auth/admin')
  const client = await getServerClient()
  const { data: { user } } = await client.auth.getUser()
  const passwordEntry = !user || await isPasswordOwner(user.id)
  const route = passwordEntry ? '/auth/admin' : '/auth/admin/mfa'
  redirect(`${route}?reauth=1&redirect=${encodeURIComponent(destination)}`)
}
