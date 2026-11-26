'use client'

import { getBrowserClient } from '@/lib/supabase/client'

// Fire-and-forget product analytics (anon-insertable under RLS; read admin-only).
// Never throws, never blocks the UI.
export function track(name: string, props: Record<string, unknown> = {}) {
  try {
    let sessionId = sessionStorage.getItem('hs_session')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('hs_session', sessionId)
    }
    void getBrowserClient()
      .from('analytics_events')
      .insert({ name, props, session_id: sessionId })
      .then(() => undefined)
  } catch {
    // analytics must never break the experience
  }
}
