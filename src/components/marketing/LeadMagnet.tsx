'use client'

import { FormEvent, useState } from 'react'
import PremiumButton from '@/components/ui/PremiumButton'

export default function LeadMagnet() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setMessage('اكتبي بريدك أولًا.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          source: 'lead_magnet_home',
          interest: 'دليل البداية والأسئلة الهادئة',
        }),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !data.success) {
        setMessage(data.error || 'لم نتمكن من حفظ بريدك الآن.')
        return
      }

      setEmail('')
      setMessage('تم تسجيل اهتمامك. سنرسل لكِ التحديثات المهمة فقط عند جاهزية الدليل.')
    } catch (error) {
      console.error('Lead magnet error:', error)
      setMessage('لم نتمكن من حفظ بريدك الآن. حاولي مرة أخرى بعد قليل.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="premium-glow-border rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm dark:bg-deep-teal/60">
      <p className="mini-label">دليل البداية</p>
      <h3 className="mt-3 text-2xl font-black text-charcoal">7 أسئلة لفهم علاقتك بنفسك</h3>
      <p className="mt-3 text-sm leading-7 text-warm-gray">اتركي بريدك لتصلكِ الإصدارات الهادئة والتحديثات المهمة فقط. لا ضغط ولا رسائل مزعجة.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input className="premium-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
        <PremiumButton type="submit" disabled={loading}>{loading ? 'جارٍ الحفظ...' : 'أريد الدليل'}</PremiumButton>
      </div>
      {message ? <p className="mt-3 text-xs font-black text-petrol dark:text-gold">{message}</p> : null}
    </form>
  )
}
