import 'server-only'

const buckets = new Map<string, { count: number; expiresAt: number }>()

export function getRateLimitKey(prefix: string, identifier: string) {
  return `${prefix}:${identifier || 'anonymous'}`
}

export function checkRateLimit(key: string, limit = 12, windowMs = 60_000) {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.expiresAt }
  }

  existing.count += 1
  buckets.set(key, existing)
  return { allowed: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.expiresAt }
}

export function getClientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}
