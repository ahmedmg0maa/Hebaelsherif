'use client'

import { useEffect } from 'react'

export function trackEvent(name: string, payload?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('heba:event', { detail: { name, payload: payload || {}, at: new Date().toISOString() } }))
}

function getUtmParams() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  return {
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || '',
  }
}

export default function ConversionEvents() {
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ name?: string; payload?: Record<string, unknown> }>
      const name = customEvent.detail?.name
      if (!name) return

      fetch('/api/events/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: name,
          path: window.location.pathname,
          ...getUtmParams(),
          ...(customEvent.detail.payload || {}),
        }),
        keepalive: true,
      }).catch(() => undefined)
    }

    window.addEventListener('heba:event', handler)
    return () => window.removeEventListener('heba:event', handler)
  }, [])

  return null
}
