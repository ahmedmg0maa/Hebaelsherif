'use client'

import { useEffect, useSyncExternalStore } from 'react'

// Motion runs automatically. Only the device's accessibility preference reduces it.
function subscribe(callback: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const snapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
export function useReducedMotion() { return useSyncExternalStore(subscribe, snapshot, () => false) }

/** Retire the previous page control and clear its stale preference once. */
export function MotionPreferenceController() {
  useEffect(() => {
    document.documentElement.dataset.motion = 'system'
    try { localStorage.removeItem('heba-motion') } catch { /* Motion does not depend on storage. */ }
    window.dispatchEvent(new Event('heba-motion-change'))
  }, [])
  return null
}
