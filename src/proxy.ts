import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicKey, hasSupabasePublicConfig } from '@/lib/supabase/public-key'

const stagingHeaders = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  'Cache-Control': 'private, no-store',
}

const baseSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

function securityHeaders(nonce?: string) {
  const scripts = nonce ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'` : "script-src 'none'"
  return {
    ...baseSecurityHeaders,
    'Content-Security-Policy': `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https://*.supabase.co; media-src 'self' blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://upload.videodelivery.net; frame-src 'self' https://*.cloudflarestream.com; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ${scripts}; script-src-attr 'none'; upgrade-insecure-requests`,
  }
}

function isStaging() {
  return process.env.HEBA_DEPLOYMENT_ENV === 'staging'
}

function sameText(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

function stagingAccessAllowed(request: NextRequest) {
  const expectedUser = process.env.STAGING_ACCESS_USER
  const expectedPassword = process.env.STAGING_ACCESS_PASSWORD
  const authorization = request.headers.get('authorization')
  if (!expectedUser || !expectedPassword || !authorization?.startsWith('Basic ')) return false
  try {
    const decoded = atob(authorization.slice('Basic '.length))
    const separator = decoded.indexOf(':')
    if (separator < 0) return false
    return sameText(decoded.slice(0, separator), expectedUser) && sameText(decoded.slice(separator + 1), expectedPassword)
  } catch {
    return false
  }
}

function stagingChallenge(nonce: string) {
  return new NextResponse('Staging access required.', {
    status: 401,
    headers: { ...securityHeaders(nonce), ...stagingHeaders, 'WWW-Authenticate': 'Basic realm="Heba ElSherif staging", charset="UTF-8"' },
  })
}

function applyResponseHeaders(response: NextResponse, nonce: string, privateResponse = false) {
  Object.entries(securityHeaders(nonce)).forEach(([key, value]) => response.headers.set(key, value))
  if (privateResponse) {
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  if (isStaging()) Object.entries(stagingHeaders).forEach(([key, value]) => response.headers.set(key, value))
  return response
}

export default async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  // Both Next and vinext extract framework-script nonces from the request CSP,
  // not from x-nonce. Keep the renderer and the browser on the same policy.
  requestHeaders.set('Content-Security-Policy', securityHeaders(nonce)['Content-Security-Policy'])
  const path = request.nextUrl.pathname
  const needsAuth = path.startsWith('/dashboard') || path.startsWith('/admin')
  const redirectToAuth = () => {
    const url = request.nextUrl.clone()
    url.pathname = path.startsWith('/admin') ? '/auth/admin' : '/auth/login'
    url.searchParams.set('redirect', path)
    return applyResponseHeaders(NextResponse.redirect(url), nonce, true)
  }

  // A staging deployment must be unreachable to the general public. Missing
  // credentials deliberately deny every app route rather than silently opening
  // an unprotected preview. cPanel stores these values outside the repository.
  if (isStaging() && !stagingAccessAllowed(request)) return stagingChallenge(nonce)

  let response = applyResponseHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce, needsAuth || path.startsWith('/auth'))

  // Public routes do not need a Supabase session refresh. Avoid spending a
  // shared-hosting request on a remote Auth lookup for every anonymous page.
  if (!needsAuth) return response

  // A missing public client configuration cannot establish a session. Keep
  // protected areas closed instead of rendering their server components
  // without an identity provider.
  if (!hasSupabasePublicConfig()) {
    return redirectToAuth()
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = applyResponseHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce, true)
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Authentication lookup failures must never open a protected route.
    if (needsAuth) return redirectToAuth()
  }

  if (needsAuth && !user) {
    return redirectToAuth()
  }

  if (path.startsWith('/admin') && user) {
    let assurance
    try {
      const result = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      assurance = result.data
    } catch {
      return redirectToAuth()
    }
    const { data: ownerAssured } = await supabase.rpc('owner_password_assured', { uid: user.id })
    if (assurance?.currentLevel !== 'aal2' && ownerAssured !== true) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/admin'
      url.searchParams.set('reauth', '1')
      url.searchParams.set('redirect', path)
      return applyResponseHeaders(NextResponse.redirect(url), nonce, true)
    }
    let role = null
    try {
      const { data } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      role = data
    } catch {
      return redirectToAuth()
    }
    if (!role) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/admin'
      url.search = '?error=role'
      return applyResponseHeaders(NextResponse.redirect(url), nonce, true)
    }
  }

  return response
}

export const config = {
  // Static build assets are non-sensitive and are excluded to avoid an
  // unnecessary middleware hop. Every rendered route, API route and robots
  // response is protected/noindexed on staging.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
