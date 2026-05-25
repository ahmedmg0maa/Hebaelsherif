'use client'

export const dynamic = 'force-dynamic'
import { FormEvent, useState } from 'react'
import { FirebaseError } from 'firebase/app'
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
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني.',
    'auth/too-many-requests': 'تمت محاولات كثيرة. انتظري قليلًا ثم حاولي مرة أخرى.',
  }

  return messages[error.code] || 'تعذر إرسال رابط إعادة التعيين. حاولي مرة أخرى.'
}

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('اكتبي البريد الإلكتروني أولًا.')
      return
    }

    setSubmitting(true)

    try {
      await resetPassword(email.trim())
      setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.')
      setEmail('')
    } catch (resetError) {
      setError(getArabicFirebaseError(resetError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="استعادة كلمة المرور"
      description="اكتبي بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور."
      footerText="تذكرتِ كلمة المرور؟"
      footerLinkText="تسجيل الدخول"
      footerLinkHref="/auth/login"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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

        {error ? (
          <div className="rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm leading-7 text-burgundy">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-olive/20 bg-olive/10 px-4 py-3 text-sm leading-7 text-olive">
            {success}
          </div>
        ) : null}

        <PremiumButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
        </PremiumButton>
      </form>
    </AuthShell>
  )
}