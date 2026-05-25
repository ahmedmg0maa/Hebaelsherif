'use client'

export const dynamic = 'force-dynamic'
import { FormEvent, useEffect, useState } from 'react'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import BrandOrnament from '@/components/brand/BrandOrnament'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumFormField from '@/components/ui/PremiumFormField'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'

const interests = [
  { value: 'boundaries', label: 'الحدود الصحية' },
  { value: 'relationships', label: 'العلاقات' },
  { value: 'self-worth', label: 'القيمة الذاتية' },
  { value: 'healing', label: 'التعافي العاطفي' },
  { value: 'purpose', label: 'الرسالة والاتجاه' },
]

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
    <div className="space-y-8">
      <section className="premium-glow-border rounded-[2.5rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm lg:p-8">
        <BrandOrnament className="mb-5" />
        <div className="grid gap-8 lg:grid-cols-[1fr_330px] lg:items-center">
          <div>
            <p className="mini-label mb-3">ملفي الشخصي</p>
            <h2 className="text-4xl font-black leading-tight text-petrol md:text-5xl">تخصيص رحلتك مع هبة</h2>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-warm-gray">
              بياناتك تساعد المنصة على اقتراح المسار الأقرب لكِ: كورس، كتاب، أو جلسة خاصة.
            </p>
          </div>
          <ImageSlot ratio="square" variant="portrait" label="صورة شخصية اختيارية" hint="رمز هادئ للملف الشخصي." />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm md:p-8">
          <div className="mb-7">
            <p className="mini-label mb-2">بيانات أساسية</p>
            <h3 className="text-2xl font-black text-charcoal">معلومات التواصل والاهتمام</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <PremiumFormField label="الاسم">
              <input className="premium-input" value={name} onChange={(event) => setName(event.target.value)} />
            </PremiumFormField>

            <PremiumFormField label="الهاتف">
              <input className="premium-input" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </PremiumFormField>

            <PremiumFormField label="ما الهدف الأقرب لك الآن؟">
              <input
                className="premium-input"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="مثال: بناء حدود صحية أو فهم علاقة مرهقة"
              />
            </PremiumFormField>

            <PremiumFormField label="الموضوع الأكثر أهمية">
              <select className="premium-input" value={interest} onChange={(event) => setInterest(event.target.value)}>
                <option value="">اختاري اهتمامًا</option>
                {interests.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </PremiumFormField>
          </div>

          {message ? <p className="mt-5 text-sm font-black text-petrol">{message}</p> : null}

          <PremiumButton type="submit" disabled={saving} className="mt-7">
            {saving ? 'جاري الحفظ...' : 'حفظ البيانات'}
          </PremiumButton>
        </form>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-sand bg-petrol on-dark p-6 text-ivory shadow-premium">
            <p className="text-xs font-black tracking-[.22em] text-gold">بطاقة الرحلة</p>
            <h3 className="mt-4 text-2xl font-black">{name || user.name}</h3>
            <p className="mt-2 break-words text-sm leading-7 text-ivory/72">{user.email}</p>
            <div className="mt-5 rounded-2xl border border-ivory/15 bg-ivory/8 p-4">
              <p className="text-xs font-bold text-ivory/65">الاهتمام الحالي</p>
              <p className="mt-1 text-sm font-black text-gold">{interests.find((item) => item.value === interest)?.label || 'لم يتم التحديد بعد'}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
            <p className="mini-label mb-3">تذكير لطيف</p>
            <p className="text-sm leading-8 text-warm-gray">
              كلما كانت بياناتك أوضح، أصبحت توصيات الكورسات والكتب والجلسات أكثر قربًا لاحتياجك الحقيقي.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
