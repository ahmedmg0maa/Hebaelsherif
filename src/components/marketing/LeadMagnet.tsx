'use client'

import { FormEvent, useState } from 'react'
import PremiumButton from '@/components/ui/PremiumButton'

export default function LeadMagnet() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(email.trim() ? 'تم تسجيل اهتمامك بهدوء. سنربط الإرسال التلقائي بخدمة البريد لاحقًا.' : 'اكتبي بريدك أولًا.')
    if (email.trim()) setEmail('')
  }

  return (
    <form onSubmit={handleSubmit} className="premium-glow-border rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm">
      <p className="mini-label">دليل مجاني</p>
      <h3 className="mt-3 text-2xl font-black text-charcoal">7 أسئلة لفهم علاقتك بنفسك</h3>
      <p className="mt-3 text-sm leading-7 text-warm-gray">اتركي بريدك للحصول على دليل هادئ عند فتحه قريبًا. لا رسائل مزعجة، فقط محتوى مختار بعناية.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input className="premium-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
        <PremiumButton type="submit">أريد الدليل</PremiumButton>
      </div>
      {message ? <p className="mt-3 text-xs font-black text-petrol">{message}</p> : null}
    </form>
  )
}
