'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AdminPageHeader, AdminPanel, EmptyState } from '@/components/admin/OperationsUI'

const exportTargets = [
  { collection: 'orders', label: 'الطلبات', description: 'كل الطلبات وحالات الدفع والوصول.' },
  { collection: 'bookings', label: 'الحجوزات', description: 'حجوزات الجلسات وحالات الدفع والموعد.' },
  { collection: 'users', label: 'العملاء', description: 'بيانات العملاء الأساسية والوسوم.' },
  { collection: 'contact_messages', label: 'رسائل التواصل', description: 'رسائل نموذج التواصل.' },
  { collection: 'leads', label: 'قائمة الانتظار', description: 'العملاء المحتملون والاهتمامات.' },
  { collection: 'reviews', label: 'التقييمات', description: 'التقييمات وحالات الاعتماد.' },
]

export default function AdminExportsPage() {
  const { firebaseUser } = useAuth()
  const [error, setError] = useState('')

  async function exportCollection(collection: string) {
    setError('')
    if (!firebaseUser) {
      setError('يجب تسجيل الدخول كأدمن.')
      return
    }
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/export/${collection}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'تعذر التصدير.' }))
        setError(data.error || 'تعذر التصدير.')
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${collection}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      console.error('Export error:', exportError)
      setError('تعذر تصدير الملف الآن.')
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader title="تصدير البيانات" description="تصدير عملي للطلبات والحجوزات والعملاء والرسائل، مفيد للمراجعة الخارجية والنسخ الاحتياطي التشغيلي." />
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}
      <AdminPanel title="ملفات CSV" description="الحد الأقصى الحالي 1000 سجل لكل عملية تصدير للحفاظ على الأداء.">
        {exportTargets.length === 0 ? <EmptyState title="لا توجد ملفات" description="لم يتم تفعيل أي تصدير بعد." /> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exportTargets.map((target) => (
            <button
              key={target.collection}
              type="button"
              onClick={() => exportCollection(target.collection)}
              className="rounded-[1.5rem] border border-sand bg-cream/80 p-5 text-right shadow-soft transition hover:-translate-y-0.5 hover:border-gold dark:border-gold/25 dark:bg-white/10"
            >
              <h3 className="text-lg font-black text-charcoal dark:text-ivory">{target.label}</h3>
              <p className="mt-2 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{target.description}</p>
              <span className="mt-4 inline-flex rounded-full bg-gold px-4 py-2 text-xs font-black text-deepTeal">تحميل CSV</span>
            </button>
          ))}
        </div>
      </AdminPanel>
    </div>
  )
}
