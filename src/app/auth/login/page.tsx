'use client'

export const dynamic = 'force-dynamic'
import { FormEvent, Suspense, useState } from 'react'
import Link from 'next/link'
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
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
    'auth/user-disabled': 'هذا الحساب موقوف. تواصلي مع الدعم.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني.',
    'auth/wrong-password': 'كلمة المرور غير صحيحة.',
    'auth/invalid-credential': 'بيانات الدخول غير صحيحة.',
    'auth/too-many-requests': 'تمت محاولات كثيرة. انتظري قليلًا ثم حاولي مرة أخرى.',
    'auth/popup-closed-by-user': 'تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.',
  }

  return messages[error.code] || 'تعذر تسجيل الدخول. تأكدي من البيانات وحاولي مرة أخرى.'
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const { login, loginWithGoogle } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitLoading(true)

    try {
      await login({
        email: email.trim(),
        password,
      })

      router.push(next)
      router.refresh()
    } catch (loginError) {
      setError(getArabicFirebaseError(loginError))
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
      title="تسجيل الدخول"
      description="ادخلي إلى حسابك لمتابعة رحلتك، كورساتك، كتبك، وجلساتك."
      footerText="ليس لديك حساب؟"
      footerLinkText="أنشئي حسابًا جديدًا"
      footerLinkHref="/auth/register"
    >
      <form onSubmit={handleEmailLogin} className="space-y-5">
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

        <PremiumFormField label="كلمة المرور" required>
          <input
            className="premium-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </PremiumFormField>

        <div className="-mt-2 text-left">
          <Link
            href="/auth/reset-password"
            className="text-xs font-bold text-petrol transition hover:text-gold"
          >
            نسيتِ كلمة المرور؟
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm leading-7 text-burgundy">
            {error}
          </div>
        ) : null}

        <PremiumButton type="submit" className="w-full" disabled={submitLoading || googleLoading}>
          {submitLoading ? 'جاري الدخول...' : 'دخول'}
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
        {googleLoading ? 'جاري الاتصال بجوجل...' : 'الدخول باستخدام Google'}
      </PremiumButton>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}