'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import PremiumButton from '@/components/ui/PremiumButton'
import { useAuth } from '@/hooks/useAuth'

interface WorkshopRegisterButtonProps {
  workshopId: string
  isFree: boolean
}

type Status = 'idle' | 'loading' | 'success' | 'waitlisted' | 'error'

export default function WorkshopRegisterButton({ workshopId, isFree }: WorkshopRegisterButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, sessionUser, loading } = useAuth()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleRegister() {
    if (!user || !sessionUser) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const token = await sessionUser.getIdToken()
      const response = await fetch('/api/workshops/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workshopId }),
      })
      const data = (await response.json()) as { success?: boolean; status?: string; error?: string }

      if (!response.ok || !data.success) {
        setStatus('error')
        setMessage(data.error || 'تعذر إتمام التسجيل الآن. حاولي مرة أخرى.')
        return
      }

      if (data.status === 'waitlisted') {
        setStatus('waitlisted')
        setMessage('الورشة مكتملة حاليًا، وتمت إضافتك إلى قائمة الانتظار.')
      } else {
        setStatus('success')
        setMessage(
          isFree
            ? 'تم تأكيد تسجيلك. ستجدين التفاصيل داخل لوحتك.'
            : 'تم استلام تسجيلك. أكملي الدفع من لوحتك ليتم تأكيد مقعدك.',
        )
      }
    } catch {
      setStatus('error')
      setMessage('تعذر إتمام التسجيل الآن. حاولي مرة أخرى.')
    }
  }

  if (status === 'success' || status === 'waitlisted') {
    return (
      <div>
        <p className="rounded-[1.4rem] border border-gold/30 bg-cream/80 p-4 text-sm font-black leading-7 text-petrol">{message}</p>
        <PremiumButton href="/dashboard" size="lg" className="mt-4 w-full">الانتقال إلى لوحتي</PremiumButton>
      </div>
    )
  }

  return (
    <div>
      <PremiumButton
        type="button"
        size="lg"
        className="w-full"
        onClick={handleRegister}
        disabled={loading || status === 'loading'}
      >
        {status === 'loading' ? 'جارٍ التسجيل...' : user ? 'سجلي مقعدك الآن' : 'سجلي الدخول للتسجيل'}
      </PremiumButton>
      {status === 'error' && message ? (
        <p className="mt-3 text-xs font-bold leading-6 text-burgundy">{message}</p>
      ) : null}
    </div>
  )
}
