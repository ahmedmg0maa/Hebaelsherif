'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { adminPasswordLogin, ownerPasswordLogin } from '@/lib/actions/auth'

export function AdminLoginForm({ configured, ownerConfigured }: { configured: boolean; ownerConfigured: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(params.get('error') === 'role' ? 'هذا الحساب لا يملك صلاحية إدارية.' : null)
  const staff = params.get('staff') === '1'
  const [loading, setLoading] = useState(false)
  const busy = useRef(false)
  const available = configured && (staff || ownerConfigured)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!available || busy.current) return
    busy.current = true
    setLoading(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      const result = staff ? await adminPasswordLogin(String(form.get('email')), String(form.get('password'))) : await ownerPasswordLogin(String(form.get('password')))
      if (!result.ok) { setError(result.error); return }
      const requested = params.get('redirect')
      const target = requested?.startsWith('/admin/') ? requested : '/admin/overview'
      router.replace(result.needsMfa ? `/auth/admin/mfa?redirect=${encodeURIComponent(target)}` : target)
      router.refresh()
    } catch {
      setError('تعذر إكمال الدخول الآن. تحققي من الاتصال وحاولي مرة أخرى.')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-antique-gold/30 bg-antique-gold/5 px-4 py-3 text-sm text-text-soft">
        {staff ? 'أدخلي بريد حساب الإدارة وكلمة مروره.' : 'أهلًا بكِ في مساحة إدارة موقعك. أدخلي كلمة المرور للمتابعة.'}
      </div>
      {!available && <div role="status" className="rounded-xl border border-line bg-ivory px-4 py-4 text-sm leading-loose text-text-soft">
        <p className="font-bold text-deep-teal">الدخول للإدارة لم يُفعّل على هذه النسخة بعد</p>
        <p className="mt-2">{!configured ? 'يلزم إكمال إعداد الاتصال وتفعيل حساب المالكة لدى المسؤول عن تشغيل الموقع.' : 'يلزم ربط حساب المالكة بالدخول المختصر. إذا كان لديكِ حساب إدارة مفعّل، استخدمي دخول فريق الإدارة أدناه.'}</p>
      </div>}
      {available && params.get('reauth') === '1' && <p role="status" className="text-sm leading-loose text-text-soft">سجّلي دخولكِ مجددًا لمتابعة العمل بأمان.</p>}
      {staff && <FormField label="البريد الإلكتروني الإداري" name="email" type="email" autoComplete="email" required dir="ltr" />}
      <PasswordField label="كلمة مرور الإدارة" name="password" autoComplete="current-password" />
      {error && <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy" role="alert">{error}</p>}
      <Button type="submit" disabled={loading || !available} className="w-full">
        {loading ? 'جارٍ التحقق…' : !available ? 'بانتظار تفعيل الدخول' : 'دخول لوحة الإدارة'}
      </Button>
      <Link prefetch={false} href="/" className="block min-h-11 content-center text-center text-sm text-deep-teal underline">العودة للموقع</Link>
      <Link prefetch={false} href={staff?'/auth/admin':'/auth/admin?staff=1'} className="block min-h-11 content-center text-center text-sm text-text-soft underline">{staff?'دخول المالكة':'دخول فريق الإدارة'}</Link>
      <Link prefetch={false} href="/auth/reset-password?from=admin" className="block min-h-11 content-center text-center text-sm underline underline-offset-4">نسيتِ كلمة المرور؟</Link>
    </form>
  )
}

