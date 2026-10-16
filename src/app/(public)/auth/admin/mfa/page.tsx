'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/Button'
import { getBrowserClient } from '@/lib/supabase/client'
import { recordAdminMfaEvent } from '@/lib/actions/auth'
import { establishAdminSession } from '@/lib/actions/admin-auth-session'

type Factor = { id: string; status: string; friendly_name?: string }
type Enrollment = { id: string; qr: string } | null

export default function AdminMfaPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [factors, setFactors] = useState<Factor[]>([])
  const [enrollment, setEnrollment] = useState<Enrollment>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('جارٍ التحقق من عاملَي الحماية…')
  const [busy, setBusy] = useState(false)
  const target = params.get('redirect')?.startsWith('/admin') ? params.get('redirect')! : '/admin/overview'
  const requiresFreshCode = params.get('reauth') === '1'

  const refresh = useCallback(async () => {
    const client = getBrowserClient()
    const [{ data: listed, error }, { data: assurance }] = await Promise.all([
      client.auth.mfa.listFactors(),
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
    if (error) { setMessage('تعذّر التحقق من عامل الحماية. أعيدي تسجيل الدخول.'); return }
    const verified = (listed.totp ?? []).filter((factor) => factor.status === 'verified') as Factor[]
    setFactors(verified)
    if (verified.length >= 2 && assurance?.currentLevel === 'aal2' && !requiresFreshCode) {
      const session = await establishAdminSession()
      if (session.ok) router.replace(target)
      else setMessage(session.error)
    }
    else if (verified.length >= 2 && assurance?.currentLevel === 'aal2' && requiresFreshCode) setMessage('أدخلي رمز TOTP جديدًا لتأكيد هذا الإجراء الحساس.')
    else if (verified.length >= 2) setMessage('أدخلي رمز تطبيق المصادقة لإكمال الدخول.')
    else setMessage(`يلزم تسجيل عاملَي TOTP احتياطيين. تم تسجيل ${verified.length.toLocaleString('ar-EG')} من ٢.`)
  }, [requiresFreshCode, router, target])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  async function startEnrollment() {
    setBusy(true)
    const client = getBrowserClient()
    const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Admin ${factors.length + 1}` })
    if (error || !data) setMessage('تعذّر إنشاء عامل الحماية. حاولي مجددًا.')
    else { setEnrollment({ id: data.id, qr: data.totp.qr_code }); setMessage('امسحي رمز QR بتطبيق المصادقة، ثم أدخلي رمز الستة أرقام.') }
    setBusy(false)
  }

  async function verify(factorId: string) {
    if (!/^\d{6}$/.test(code)) { setMessage('أدخلي رمزًا من ٦ أرقام.'); return }
    setBusy(true)
    const client = getBrowserClient()
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) { setMessage('تعذّر بدء التحقق. حاولي مجددًا.'); setBusy(false); return }
    const { error } = await client.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    if (error) setMessage('الرمز غير صحيح أو انتهت صلاحيته.')
    else {
      await client.auth.refreshSession()
      await recordAdminMfaEvent(enrollment ? 'mfa_enrolled' : 'mfa_verified')
      setEnrollment(null)
      setCode('')
      if (requiresFreshCode) {
        const session = await establishAdminSession()
        if (session.ok) router.replace(target)
        else setMessage(session.error)
      } else await refresh()
    }
    setBusy(false)
  }

  const currentFactor = enrollment?.id ?? factors[0]?.id
  return <AuthShell title="تأكيد حماية الإدارة" lead={requiresFreshCode ? 'أدخلي رمزًا جديدًا من تطبيق المصادقة قبل تنفيذ العملية الحساسة.' : 'يلزم عاملان منفصلان من تطبيق المصادقة قبل الدخول إلى الإدارة.'}>
    <div className="space-y-5">
      <p className="rounded-xl bg-antique-gold/10 p-3 text-sm leading-loose text-text-soft">{message}</p>
      {enrollment ? <>
        {/* The Supabase-generated QR is an ephemeral data URL, not a remotely optimizable image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrollment.qr} alt="رمز QR لإعداد تطبيق المصادقة" className="mx-auto h-52 w-52 rounded-xl bg-white p-3" />
      </> : factors.length < 2 ? <Button type="button" className="w-full" disabled={busy} onClick={startEnrollment}>{busy ? 'جارٍ الإعداد…' : 'إضافة عامل TOTP'}</Button> : null}
      {(enrollment || factors.length >= 2) && currentFactor && <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void verify(currentFactor) }}>
        <label className="block text-sm font-bold text-deep-teal" htmlFor="mfa-code">رمز تطبيق المصادقة</label>
        <input id="mfa-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="min-h-12 w-full rounded-xl border border-line bg-surface-raised px-4 text-center text-xl tracking-[0.45em] text-ink" />
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'جارٍ التحقق…' : enrollment ? 'تأكيد العامل' : requiresFreshCode ? 'تأكيد العملية' : 'تأكيد الدخول'}</Button>
      </form>}
      <p className="text-xs leading-relaxed text-text-soft">استخدمي تطبيقين أو جهازين منفصلين. لا تُعرض مفاتيح الاسترداد أو الرموز السرية داخل المنصة.</p>
    </div>
  </AuthShell>
}
