'use client'

import { FormEvent, useEffect, useState } from 'react'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'

export default function DashboardProfilePage() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [goal, setGoal] = useState('')
  const [interest, setInterest] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setPhone(user.phone || '')
  }, [user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (!user) return
    setSaving(true)

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        phone: phone.trim(),
        emotionalGoal: goal.trim(),
        primaryInterest: interest.trim(),
        updatedAt: serverTimestamp(),
      })
      setMessage('تم حفظ الملف الشخصي بنجاح.')
    } catch (error) {
      console.error('Profile update error:', error)
      setMessage('تعذر حفظ البيانات الآن.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return <PremiumEmptyState title="غير متاح" description="سجلي الدخول لعرض الملف الشخصي." />
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mini-label">ملفي الشخصي</p>
        <h2 className="mt-3 text-3xl font-black text-charcoal">تخصيص رحلتك</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">هذه البيانات تساعد في تخصيص توصياتك لاحقًا.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <PremiumFormField label="الاسم">
            <input className="premium-input" value={name} onChange={(event) => setName(event.target.value)} />
          </PremiumFormField>
          <PremiumFormField label="الهاتف">
            <input className="premium-input" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </PremiumFormField>
          <PremiumFormField label="ما الهدف الأقرب لك الآن؟">
            <input className="premium-input" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="مثال: بناء حدود صحية" />
          </PremiumFormField>
          <PremiumFormField label="الموضوع الأكثر أهمية">
            <select className="premium-input" value={interest} onChange={(event) => setInterest(event.target.value)}>
              <option value="">اختاري اهتمامًا</option>
              <option value="boundaries">الحدود</option>
              <option value="relationships">العلاقات</option>
              <option value="self-worth">القيمة الذاتية</option>
              <option value="healing">التعافي العاطفي</option>
            </select>
          </PremiumFormField>
        </div>
        {message ? <p className="mt-5 text-sm font-black text-petrol">{message}</p> : null}
        <PremiumButton type="submit" disabled={saving} className="mt-7">{saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</PremiumButton>
      </form>
    </div>
  )
}
