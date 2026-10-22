'use client'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/client'
import { touchAdminSession } from '@/lib/actions/admin-sessions'

export function AdminSessionMonitor({ idleExpiresAt, absoluteExpiresAt }: { idleExpiresAt: string; absoluteExpiresAt: string }) {
  const [expiresAt, setExpiresAt] = useState(Math.min(new Date(idleExpiresAt).getTime(), new Date(absoluteExpiresAt).getTime()))
  const [warning, setWarning] = useState(false)

  useEffect(() => {
    let lastTouch = 0
    const endSession = async () => {
      await getBrowserClient().auth.signOut({ scope: 'local' })
      // Session invalidation requires a full document navigation to discard cached Admin UI.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/auth/admin?error=session')
    }
    const touch = async () => {
      if (Date.now() - lastTouch < 60_000) return
      lastTouch = Date.now()
      const result = await touchAdminSession()
      if (!result.ok || !result.idleExpiresAt || !result.absoluteExpiresAt) { await endSession(); return }
      setExpiresAt(Math.min(new Date(result.idleExpiresAt).getTime(), new Date(result.absoluteExpiresAt).getTime()))
    }
    const activity = () => { void touch() }
    const timer = window.setInterval(() => {
      const remaining = expiresAt - Date.now()
      setWarning(remaining > 0 && remaining <= 5 * 60_000)
      if (remaining <= 0) void endSession()
    }, 15_000)
    for (const name of ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const) window.addEventListener(name, activity, { passive: true })
    return () => {
      window.clearInterval(timer)
      for (const name of ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const) window.removeEventListener(name, activity)
    }
  }, [expiresAt])

  if (!warning) return null
  return <p className="mx-auto mb-4 max-w-6xl rounded-xl border border-antique-gold/40 bg-antique-gold/10 px-4 py-3 text-sm text-ink" role="alert">ستنتهي جلسة الإدارة قريبًا بسبب عدم النشاط. تابعي العمل أو سجّلي الدخول مجددًا.</p>
}
