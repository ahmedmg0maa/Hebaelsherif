'use client'

import { FormEvent, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import PremiumSection from '@/components/ui/PremiumSection'

export default function ContactPage() {
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('تم تجهيز نموذج التواصل. اربطه لاحقًا بخدمة بريد أو Firestore حسب التشغيل النهائي.')
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium py-16">
          <PremiumSection eyebrow="تواصل" title="ابدئي بسؤال واضح" description="استخدمي هذا النموذج للتواصل العام أو الاستفسار عن الخدمات والباقات.">
            <form onSubmit={handleSubmit} className="mx-auto max-w-3xl rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm md:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <PremiumFormField label="الاسم">
                  <input className="premium-input" placeholder="اكتبي اسمك" />
                </PremiumFormField>
                <PremiumFormField label="البريد الإلكتروني">
                  <input className="premium-input" type="email" placeholder="name@example.com" />
                </PremiumFormField>
              </div>
              <div className="mt-5">
                <PremiumFormField label="الرسالة">
                  <textarea className="premium-input min-h-40 resize-y" placeholder="اكتبي رسالتك هنا..." />
                </PremiumFormField>
              </div>
              {message ? <p className="mt-5 text-sm font-black text-burgundy">{message}</p> : null}
              <PremiumButton type="submit" className="mt-7">إرسال</PremiumButton>
            </form>
          </PremiumSection>
        </section>
      </main>
      <Footer />
    </>
  )
}
