const DEFAULT_SITE_URL = 'https://hebaelsherif.com'
const LOCAL_SITE_URL = 'http://localhost:3000'

function stripWrappingQuotes(value: string) {
  return value.trim().replace(/^['\"]|['\"]$/g, '')
}

function normalizeSiteUrl(value: string) {
  const cleanedValue = stripWrappingQuotes(value).replace(/\/+$/g, '')
  const valueWithProtocol = /^https?:\/\//i.test(cleanedValue)
    ? cleanedValue
    : `https://${cleanedValue}`

  return new URL(valueWithProtocol).toString().replace(/\/+$/g, '')
}

export function getSafeSiteUrl(input = process.env.NEXT_PUBLIC_APP_URL) {
  const fallback = process.env.NODE_ENV === 'development' ? LOCAL_SITE_URL : DEFAULT_SITE_URL
  const rawValue = input || fallback

  try {
    return normalizeSiteUrl(rawValue)
  } catch {
    return fallback
  }
}

export function buildAbsoluteUrl(path = '/') {
  const baseUrl = getSafeSiteUrl()
  const safePath = path.startsWith('/') ? path : `/${path}`
  return safePath === '/' ? baseUrl : `${baseUrl}${safePath}`
}

export function cleanOptionalEnvValue(value: string | undefined) {
  return value?.trim().replace(/^['\"]|['\"]$/g, '')
}
