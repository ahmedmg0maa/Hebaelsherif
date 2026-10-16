import { NextResponse, type NextRequest } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'

const allowedDestinations = new Set(['/dashboard', '/auth/update-password', '/auth/login'])

function destination(value: string | null) {
  return value && allowedDestinations.has(value) ? value : '/auth/login'
}

function privateRedirect(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url))
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  return response
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const next = destination(request.nextUrl.searchParams.get('next'))
  if (!hasSupabasePublicConfig() || !code) return privateRedirect(request, '/auth/login?error=callback')

  const supabase = await getServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return privateRedirect(request, '/auth/login?error=callback')
  return privateRedirect(request, next)
}
