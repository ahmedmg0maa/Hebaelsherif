'use client'

export const dynamic = 'force-dynamic'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { EmailTemplate } from '@/types'
import { formatNumber } from '@/lib/utils/formatters'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, StatusBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

const defaultTemplates = [
  { key: 'booking_request_received', label: 'استلام طلب حجز' },
  { key: 'booking_confirmed', label: 'تأكيد الحجز' },
  { key: 'payment_proof_received', label: 'استلام إثبات الدفع' },
  { key: 'payment_confirmed', label: 'تأكيد الدفع' },
  { key: 'access_granted', label: 'فتح المحتوى' },
  { key: 'waitlist_joined', label: 'الانضمام لقائمة الانتظار' },
]

function mapDocs<T>(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as T[]
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedKey, setSelectedKey] = useState(defaultTemplates[0].key)
  const [form, setForm] = useState({ subject: '', body: '', status: 'enabled' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const snap = await getDocs(collection(db, 'notification_templates'))
      setTemplates(mapDocs<EmailTemplate>(snap))
    } catch (loadError) {
      console.error('Templates load error:', loadError)
      setError('تعذر تحميل قوالب الرسائل.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const current = templates.find((template) => template.key === selectedKey)
    setForm({ subject: current?.subject || '', body: current?.body || '', status: current?.status || 'enabled' })
  }, [selectedKey, templates])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      if (!form.subject.trim() || !form.body.trim()) {
        setError('الموضوع ونص الرسالة مطلوبان.')
        return
      }
      await setDoc(doc(db, 'notification_templates', selectedKey), {
        key: selectedKey,
        subject: form.subject.trim(),
        body: form.body.trim(),
        status: form.status,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setMessage('تم حفظ القالب.')
      await load()
    } catch (saveError) {
      console.error('Template save error:', saveError)
      setError('تعذر حفظ القالب. تأكد من الصلاحيات.')
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => ({ total: templates.length, enabled: templates.filter((template) => template.status === 'enabled').length }), [templates])

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="قوالب الرسائل" description="نواة أتمتة الرسائل: قوالب عربية موحدة للحجز والدفع وفتح المحتوى، جاهزة للربط بالبريد لاحقًا." />
      {message ? <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard label="قوالب محفوظة" value={formatNumber(stats.total)} tone="petrol" />
        <MetricCard label="قوالب مفعلة" value={formatNumber(stats.enabled)} tone="success" />
      </div>

      <AdminPanel title="تحرير قالب" description="هذه القوالب لا ترسل بريدًا تلقائيًا الآن؛ لكنها توحد النصوص وتجهز طبقة الأتمتة.">
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          <Field label="نوع القالب">
            <select className={inputClass} value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
              {defaultTemplates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}
            </select>
          </Field>
          <Field label="الحالة">
            <select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="enabled">مفعل</option>
              <option value="disabled">متوقف</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="موضوع الرسالة">
              <input className={inputClass} value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="مثال: تم تأكيد حجزك مع هبة الشريف" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="نص الرسالة">
              <textarea className={`${inputClass} min-h-56`} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} placeholder="اكتبي النص العربي الرسمي للرسالة..." />
            </Field>
          </div>
          <div className="md:col-span-2">
            <AdminActionButton type="submit" disabled={saving} tone="gold">حفظ القالب</AdminActionButton>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="القوالب الحالية" description="تظهر فقط القوالب التي تم حفظها فعليًا.">
        {templates.length === 0 ? <EmptyState title="لا توجد قوالب محفوظة" description="ابدئي بحفظ أول قالب ليتم استخدامه لاحقًا في أتمتة البريد والإشعارات." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template) => (
              <article key={template.id} className="rounded-3xl border border-sand bg-cream/70 p-5 dark:border-gold/25 dark:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-black text-charcoal dark:text-ivory">{template.subject}</h3>
                  <StatusBadge meta={{ label: template.status === 'enabled' ? 'مفعل' : 'متوقف', description: '', tone: template.status === 'enabled' ? 'success' : 'muted' }} />
                </div>
                <p className="mt-3 line-clamp-3 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{template.body}</p>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
