'use client'

export function trackEvent(name: string, payload?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('heba:event', { detail: { name, payload, at: new Date().toISOString() } }))
}

export default function ConversionEvents() {
  return null
}
