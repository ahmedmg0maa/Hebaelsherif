'use client'

import Link from 'next/link'
import { useState } from 'react'
import { subscribeNewsletter } from '@/lib/actions/newsletter'
import type { NewsletterContent } from '@/lib/home/sections'
import { Button } from '@/components/ui/Button'

export function NewsletterSignup({ content, preview = false }: { content: NewsletterContent; preview?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  return <section aria-labelledby="newsletter-heading" className="section-pad border-y border-line bg-deep-teal text-on-dark">
    <div className="page-shell grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div><p className="section-eyebrow text-aqua">{content.eyebrow}</p><h2 id="newsletter-heading" className="mt-3 text-3xl font-bold md:text-4xl">{content.heading}</h2><p className="mt-4 max-w-2xl leading-loose text-white/80">{content.body}</p></div>
      {success ? <div role="status" className="rounded-2xl border border-aqua/40 bg-white/10 p-6 text-lg font-bold">تم تسجيل موافقتك. لن تُرسل أي رسالة قبل تهيئة مزود البريد، ويمكنك الإلغاء من رابط كل رسالة.</div> : <form className="grid gap-4 rounded-2xl bg-surface-raised p-5 text-ink shadow-card" onSubmit={async (event) => {
        event.preventDefault()
        if (preview) return
        setBusy(true); setMessage(null)
        const result = await subscribeNewsletter(new FormData(event.currentTarget))
        if (result.ok) setSuccess(true); else setMessage(result.error)
        setBusy(false)
      }}>
        <label className="grid gap-2 text-sm font-bold text-deep-teal">البريد الإلكتروني<input name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required disabled={preview} dir="ltr" className="min-h-12 rounded-xl border border-line bg-ivory px-4 text-ink" /></label>
        <label className="sr-only" aria-hidden="true">الموقع<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="flex items-start gap-3 text-sm leading-relaxed text-text-soft"><input name="consent" type="checkbox" required disabled={preview} className="mt-1 size-4 shrink-0 accent-deep-teal" /><span>أوافق صراحة على استلام رسائل النشرة، ويمكنني الإلغاء في أي وقت. قرأت <Link href="/privacy" className="font-bold text-burgundy underline">سياسة الخصوصية</Link>.</span></label>
        <p className="text-xs text-text-soft">لن نضيفك تلقائيًا بسبب شراء أو حجز، ولن نشارك بريدك مع طرف تسويقي.</p>
        {message && <p role="alert" className="text-sm font-semibold text-burgundy">{message}</p>}
        <Button type="submit" disabled={busy || preview}>{preview ? 'معاينة — الإرسال معطّل' : busy ? 'جاري الحفظ…' : 'اشتركي بموافقتك'}</Button>
      </form>}
    </div>
  </section>
}
