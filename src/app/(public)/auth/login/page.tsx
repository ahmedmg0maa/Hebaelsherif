'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/client'
import { AuthShell, AuthLink } from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'

function safeRedirect(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const passwordChanged = params.get('password') === 'changed'
  const callbackFailed = params.get('error') === 'callback'

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const { error: signInError } = await getBrowserClient().auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
    if (signInError) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.')
      setLoading(false)
      return
    }
    router.replace(safeRedirect(params.get('redirect')))
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {passwordChanged && (
        <p className="rounded-xl bg-deep-teal/8 px-4 py-3 text-sm font-medium text-deep-teal" role="status">
          تم حفظ كلمة المرور. سجّلي الدخول مجددًا بها.
        </p>
      )}
      {callbackFailed && (
        <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy" role="alert">
          الرابط غير صالح أو انتهت صلاحيته. اطلبي رابطًا جديدًا إذا كنتِ تستعيدين الحساب.
        </p>
      )}
      <FormField label="البريد الإلكتروني" name="email" type="email" autoComplete="email" required dir="ltr" />
      <PasswordField label="كلمة المرور" name="password" autoComplete="current-password" />
      {error && <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy" role="alert">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
      </Button>
      <p className="text-center text-sm"><AuthLink href="/auth/reset-password">نسيتِ كلمة المرور؟</AuthLink></p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <AuthShell
      title="أهلًا بعودتك"
      lead="ادخلي ببريدك وكلمة المرور لمتابعة رحلتك بأمان."
      footer={<>ليس لديك حساب؟ <AuthLink href="/auth/register">أنشئي حسابك</AuthLink></>}
    >
      <Suspense><LoginForm /></Suspense>
    </AuthShell>
  )
}
