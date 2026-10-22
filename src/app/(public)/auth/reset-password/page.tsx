'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { getBrowserClient } from '@/lib/supabase/client'
import { AuthShell, AuthLink } from '@/components/auth/AuthShell'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'

export default function ResetPasswordPage() {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const configured = hasSupabasePublicConfig()
  const adminReset = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).get('from') === 'admin', () => false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!configured || busy.current) return
    busy.current = true
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      const result = await getBrowserClient().auth.resetPasswordForEmail(String(form.get('email')), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      })
      if (result.error) { setError('تعذر طلب رابط الاستعادة الآن. حاولي مرة أخرى لاحقًا.'); return }
      // Identical acknowledgement for registered and unregistered addresses.
      setDone(true)
    } catch {
      setError('تعذر الاتصال لطلب الاستعادة. تحققي من الاتصال وحاولي مرة أخرى.')
    } finally { busy.current = false; setLoading(false) }
  }

  return (
    <AuthShell
      title="استعادة كلمة المرور"
      lead="أدخلي بريدك وسنرسل لك رابط إعادة التعيين."
      footer={
        <>
          تذكرتِ كلمة المرور؟ <AuthLink href={adminReset ? '/auth/admin' : '/auth/login'}>سجّلي دخولك</AuthLink>
        </>
      }
    >
      {done ? (
        <div className="space-y-3 text-center">
          <h2 className="text-xl font-bold text-deep-teal">تحققي من بريدك</h2>
          <p className="leading-relaxed text-text-soft">
            إذا كان البريد مسجّلًا ومزوّد البريد مهيّأ، تُرسل خدمة المصادقة رسالة برابط إعادة التعيين. لا نعرض مدة تسليم ثابتة.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          {!configured && <p role="status" className="rounded-xl bg-ivory p-4 text-sm leading-loose text-text-soft">استعادة كلمة المرور غير متاحة على هذه النسخة حاليًا.</p>}
          {adminReset && <p className="text-sm leading-loose text-text-soft">استخدمي البريد المرتبط بحساب المالكة أو حساب الإدارة.</p>}
          <FormField label="البريد الإلكتروني" name="email" type="email" autoComplete="email" required dir="ltr" />
          {error && <p role="alert" className="rounded-xl bg-burgundy/10 p-4 text-sm text-burgundy">{error}</p>}
          <Button type="submit" disabled={loading || !configured} className="w-full">
            {loading ? 'جارٍ الإرسال…' : 'إرسال رابط الاستعادة'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
