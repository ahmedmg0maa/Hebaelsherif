'use client'

export const dynamic = 'force-dynamic'
import { FormEvent, Suspense, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import { useAuth } from '@/hooks/useAuth'

function getArabicFirebaseError(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return 'لم تكتمل العملية الآن. حاولي مرة أخرى.'
  }

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'هذا البريد مستخدم بالفعل. يمكنك تسجيل الدخول بدلًا من إنشاء حساب جديد.',
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
    'auth/weak-password': 'كلمة المرور ضعيفة. استخدمي 6 أحرف على الأقل.',
    'auth/operation-not-allowed': 'طريقة التسجيل غير مفعلة من Firebase.',
    'auth/popup-closed-by-user': 'تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.',
  }

  return messages[error.code] || 'تعذر إنشاء الحساب. تأكدي من البيانات وحاولي مرة أخرى.'
}

function RegisterPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const { register, loginWithGoogle } = useAuth()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (name.trim().length < 2) {
      setError('اكتبي الاسم بشكل صحيح.')
      return
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب ألا تقل عن 6 أحرف.')
      return
    }

    setSubmitLoading(true)

    try {
      await register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      })

      router.push(next)
      router.refresh()
    } catch (registerError) {
      setError(getArabicFirebaseError(registerError))
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setGoogleLoading(true)

    try {
      await loginWithGoogle()
      router.push(next)
      router.refresh()
    } catch (googleError) {
      setError(getArabicFirebaseError(googleError))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <AuthShell
      title="إنشاء حساب جديد"
      description="أنشئي حسابك للوصول إلى الكورسات، الكتب، الجلسات، ولوحة رحلتك الخاصة."
      footerText="لديك حساب بالفعل؟"
      footerLinkText="سجلي الدخول"
      footerLinkHref="/auth/login"
    >
      <form onSubmit={handleRegister} className="space-y-5">
        <PremiumFormField label="الاسم" required>
          <input
            className="premium-input"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="اكتبي اسمك"
            required
          />
        </PremiumFormField>

        <PremiumFormField label="رقم الهاتف" hint="اختياري، لكنه مفيد لتأكيد الجلسات أو الطلبات.">
          <input
            className="premium-input"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01xxxxxxxxx"
          />
        </PremiumFormField>

        <PremiumFormField label="البريد الإلكتروني" required>
          <input
            className="premium-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            required
          />
        </PremiumFormField>

        <PremiumFormField label="كلمة المرور" required hint="6 أحرف على الأقل.">
          <input
            className="premium-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </PremiumFormField>

        {error ? (
          <div className="rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm leading-7 text-burgundy">
            {error}
          </div>
        ) : null}

        <PremiumButton type="submit" className="w-full" disabled={submitLoading || googleLoading}>
          {submitLoading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
        </PremiumButton>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-sand" />
        <span className="text-xs font-bold text-warm-gray">أو</span>
        <span className="h-px flex-1 bg-sand" />
      </div>

      <PremiumButton
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={submitLoading || googleLoading}
      >
        {googleLoading ? 'جاري الاتصال بجوجل...' : 'المتابعة باستخدام Google'}
      </PremiumButton>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  )
}