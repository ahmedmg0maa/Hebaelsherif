'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { getBrowserClient } from '@/lib/supabase/client'
import { revokeAdminSession, revokeAllAdminSessions } from '@/lib/actions/admin-sessions'

type Session = { id: string; device_label: string; created_at: string; last_seen_at: string; idle_expires_at: string; absolute_expires_at: string; current: boolean }
type Inventory = { state: 'ready' | 'unconfigured' | 'unavailable'; sessions: Session[] }
const formatter = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })

export function AdminSessionsPanel({ inventory }: { inventory: Inventory }) {
  const { sessions } = inventory
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function revoke(session: Session) {
    setBusy(session.id); setMessage('')
    const result = await revokeAdminSession(session.id)
    if (!result.ok) setMessage(result.error)
    else if (session.current) {
      await getBrowserClient().auth.signOut({ scope: 'local' })
      // Revoking the current session must discard cached Admin UI, not reuse the client router.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/auth/admin?error=session')
      return
    } else router.refresh()
    setBusy(null)
  }

  async function revokeAll() {
    setBusy('all'); setMessage('')
    const result = await revokeAllAdminSessions()
    if (!result.ok) { setMessage(result.error); setBusy(null); return }
    await getBrowserClient().auth.signOut({ scope: 'local' })
    // Revoking all sessions must discard cached Admin UI, not reuse the client router.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/auth/admin?error=session')
  }

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold text-deep-teal">جلسات الإدارة النشطة</h2><p className="text-sm text-text-soft">تنتهي الجلسة بعد ٣٠ دقيقة من عدم النشاط أو ٨ ساعات كحد أقصى.</p></div>
      <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void revokeAll()}>{busy === 'all' ? 'جارٍ الإنهاء…' : 'إنهاء كل الجلسات'}</Button>
    </div>
    {message && <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm text-burgundy" role="alert">{message}</p>}
    {inventory.state !== 'ready' ? <p className="rounded-xl bg-antique-gold/10 px-4 py-3 text-sm text-text-soft" role="status">{inventory.state === 'unconfigured' ? 'لم تُهيأ قاعدة الهدف، لذلك لا يمكن عرض جلسات الإدارة.' : 'تعذّر قراءة الجلسات؛ لم تُفسّر النتيجة على أنها قائمة فارغة.'}</p> : sessions.length === 0 ? <p className="rounded-xl bg-ivory/60 px-4 py-3 text-sm text-text-soft">لا توجد جلسات إدارية نشطة.</p> : <ul className="divide-y divide-line/70 rounded-xl border border-line/70 bg-surface-raised">
      {sessions.map((session) => <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="font-bold text-ink">{session.device_label}{session.current ? ' · هذه الجلسة' : ''}</p><p className="text-xs text-text-soft">آخر نشاط: {formatter.format(new Date(session.last_seen_at))} · بدأت: {formatter.format(new Date(session.created_at))}</p></div>
        <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void revoke(session)}>{busy === session.id ? 'جارٍ الإلغاء…' : 'إنهاء الجلسة'}</Button>
      </li>)}
    </ul>}
  </section>
}
