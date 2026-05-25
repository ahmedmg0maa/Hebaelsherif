'use client'

export const dynamic = 'force-dynamic'
import { FormEvent, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import PremiumSection from '@/components/ui/PremiumSection'

type FormState = {
  name: string
  email: string
  phone: string
  topic: string
  message: string
}

const initialForm: FormState = {
  name: '',
  email: '',
  phone: '',
  topic: 'استفسار عام',
  message: '',
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !data.success) {
        setStatus('error')
        setMessage(data.error || 'لم نتمكن من إرسال الرسالة الآن.')
        return
      }

      setStatus('success')
      setMessage('وصلت رسالتك بهدوء. سنراجعها ونعود إليكِ من القناة المناسبة.')
      setForm(initialForm)
    } catch (error) {
      console.error('Contact submit error:', error)
      setStatus('error')
      setMessage('لم نتمكن من إرسال الرسالة الآن. حاولي مرة أخرى بعد قليل.')
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="تواصل"
            title="ابدئي بسؤال واضح"
            description="اكتبي ما تحتاجينه بهدوء. الرسالة تصل للإدارة كمحادثة خاصة، ويتم التعامل معها باحترام وخصوصية."
          >
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.75fr]">
              <form onSubmit={handleSubmit} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm md:p-8 dark:bg-deep-teal/55">
                <div className="grid gap-5 md:grid-cols-2">
                  <PremiumFormField label="الاسم">
                    <input className="premium-input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="اكتبي اسمك" required />
                  </PremiumFormField>
                  <PremiumFormField label="البريد الإلكتروني">
                    <input className="premium-input" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="name@example.com" required />
                  </PremiumFormField>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <PremiumFormField label="رقم الهاتف / واتساب">
                    <input className="premium-input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="اختياري" />
                  </PremiumFormField>
                  <PremiumFormField label="نوع الرسالة">
                    <select className="premium-input" value={form.topic} onChange={(event) => updateField('topic', event.target.value)}>
                      <option>استفسار عام</option>
                      <option>جلسة فردية</option>
                      <option>مسارات التعلم</option>
                      <option>الدفع والوصول</option>
                      <option>تعاون أو ظهور إعلامي</option>
                    </select>
                  </PremiumFormField>
                </div>

                <div className="mt-5">
                  <PremiumFormField label="الرسالة">
                    <textarea className="premium-input min-h-40 resize-y" value={form.message} onChange={(event) => updateField('message', event.target.value)} placeholder="اكتبي رسالتك هنا..." required />
                  </PremiumFormField>
                </div>

                {message ? (
                  <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-black ${status === 'success' ? 'border-olive/20 bg-olive/10 text-olive' : 'border-burgundy/20 bg-burgundy/10 text-burgundy'}`}>
                    {message}
                  </p>
                ) : null}

                <PremiumButton type="submit" className="mt-7" disabled={status === 'loading'}>
                  {status === 'loading' ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
                </PremiumButton>
              </form>

              <aside className="rounded-[2rem] border border-sand bg-cream/80 p-6 shadow-soft dark:bg-deep-teal/50">
                <p className="mini-label">متى أستخدم هذا النموذج؟</p>
                <h2 className="mt-3 text-2xl font-black text-petrol dark:text-gold">لأي سؤال يحتاج ردًا إنسانيًا واضحًا.</h2>
                <ul className="mt-5 space-y-3 text-sm font-bold leading-7 text-warm-gray">
                  <li>• قبل حجز جلسة خاصة.</li>
                  <li>• للاستفسار عن فتح المحتوى بعد الدفع.</li>
                  <li>• للتعاونات والظهور الإعلامي.</li>
                  <li>• لأي ملاحظة تشغيلية تحتاج متابعة.</li>
                </ul>
              </aside>
            </div>
          </PremiumSection>
        </section>
      </main>
      <Footer />
    </>
  )
}
