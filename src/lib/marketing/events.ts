'use client'

export interface ConversionEventPayload {
  name: string
  path?: string
  source?: string
  metadata?: Record<string, unknown>
}

export function getClientSessionId() {
  if (typeof window === 'undefined') return ''
  const key = 'heba_session_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.localStorage.setItem(key, next)
  return next
}

export async function trackConversionEvent(payload: ConversionEventPayload) {
  if (typeof window === 'undefined') return
  try {
    const searchParams = new URLSearchParams(window.location.search)
    const attribution = {
      utm_source: searchParams.get('utm_source') || window.localStorage.getItem('utm_source') || '',
      utm_medium: searchParams.get('utm_medium') || window.localStorage.getItem('utm_medium') || '',
      utm_campaign: searchParams.get('utm_campaign') || window.localStorage.getItem('utm_campaign') || '',
      utm_content: searchParams.get('utm_content') || window.localStorage.getItem('utm_content') || '',
    }

    Object.entries(attribution).forEach(([key, value]) => {
      if (value) window.localStorage.setItem(key, value)
    })

    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        path: payload.path || window.location.pathname,
        sessionId: getClientSessionId(),
        metadata: { ...(payload.metadata || {}), attribution },
      }),
      keepalive: true,
    })
  } catch (error) {
    console.warn('Conversion event failed:', error)
  }
}
