'use client'

export const dynamic = 'force-dynamic'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import type { AdminTask } from '@/types'
import { formatArabicDateTime, formatNumber } from '@/lib/utils/formatters'
import { toMillis } from '@/lib/admin/operations'
import { runAdminAction } from '@/lib/admin/client'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, StatusBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

function mapDocs<T>(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) as T[]
}

const statusMeta = {
  open: { label: 'مفتوحة', description: 'تحتاج تنفيذ', tone: 'warning' as const },
  in_progress: { label: 'قيد التنفيذ', description: 'يتم العمل عليها', tone: 'petrol' as const },
  done: { label: 'منتهية', description: 'تمت', tone: 'success' as const },
  archived: { label: 'مؤرشفة', description: 'خارج المتابعة', tone: 'muted' as const },
}

export default function AdminTasksPage() {
  const { firebaseUser } = useAuth()
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [filter, setFilter] = useState('open')
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal', relatedType: 'system', relatedId: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const snap = await getDocs(collection(db, 'admin_tasks'))
      setTasks(mapDocs<AdminTask>(snap).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)))
    } catch (loadError) {
      console.error('Tasks load error:', loadError)
      setError('تعذر تحميل المهام.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!form.title.trim()) {
      setError('عنوان المهمة مطلوب.')
      return
    }
    try {
      await runAdminAction(firebaseUser, { action: 'task_created', targetType: 'admin_tasks', values: form })
      setForm({ title: '', description: '', priority: 'normal', relatedType: 'system', relatedId: '' })
      setMessage('تم إنشاء المهمة.')
      await load()
    } catch (createError) {
      console.error('Create task error:', createError)
      setError(createError instanceof Error ? createError.message : 'تعذر إنشاء المهمة.')
    }
  }

  async function updateTask(task: AdminTask, action: string, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return
    setSavingId(task.id)
    setMessage('')
    setError('')
    try {
      const updated = (await runAdminAction(firebaseUser, { action, targetType: 'admin_tasks', targetId: task.id })) as Record<string, unknown>
      setTasks((current) => current.map((item) => (item.id === task.id ? ({ ...item, ...updated } as AdminTask) : item)))
      setMessage('تم تحديث المهمة.')
    } catch (updateError) {
      console.error('Task update error:', updateError)
      setError(updateError instanceof Error ? updateError.message : 'تعذر تحديث المهمة.')
    } finally {
      setSavingId('')
    }
  }

  const filtered = useMemo(() => tasks.filter((task) => filter === 'all' || task.status === filter), [filter, tasks])
  const stats = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter((task) => task.status === 'open').length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
  }), [tasks])

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="المهام والمتابعة" description="قائمة عمل داخلية تربط المتابعة اليومية بالطلبات والحجوزات والعملاء بدون الاعتماد على ملاحظات خارجية." />
      {message ? <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="كل المهام" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="مفتوحة" value={formatNumber(stats.open)} tone="warning" />
        <MetricCard label="قيد التنفيذ" value={formatNumber(stats.inProgress)} tone="petrol" />
        <MetricCard label="منتهية" value={formatNumber(stats.done)} tone="success" />
      </div>

      <AdminPanel title="إضافة مهمة" description="استخدمي المهام لمتابعة إثبات دفع، عميلة، حجز، رسالة، أو فحص نظام.">
        <form onSubmit={createTask} className="grid gap-4 md:grid-cols-2">
          <Field label="عنوان المهمة">
            <input className={inputClass} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="مثال: مراجعة إثبات دفع" />
          </Field>
          <Field label="الأولوية">
            <select className={inputClass} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
              <option value="normal">عادية</option>
              <option value="high">عالية</option>
              <option value="critical">حرجة</option>
              <option value="low">منخفضة</option>
            </select>
          </Field>
          <Field label="مرتبطة بـ">
            <select className={inputClass} value={form.relatedType} onChange={(event) => setForm((current) => ({ ...current, relatedType: event.target.value }))}>
              <option value="system">النظام</option>
              <option value="order">طلب</option>
              <option value="booking">حجز</option>
              <option value="user">عميلة</option>
              <option value="message">رسالة</option>
              <option value="course">كورس</option>
              <option value="book">كتاب</option>
            </select>
          </Field>
          <Field label="معرف اختياري">
            <input className={inputClass} value={form.relatedId} onChange={(event) => setForm((current) => ({ ...current, relatedId: event.target.value }))} placeholder="ID الطلب أو الحجز إن وجد" />
          </Field>
          <div className="md:col-span-2">
            <Field label="الوصف">
              <textarea className={`${inputClass} min-h-28`} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="تفاصيل المتابعة" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <AdminActionButton type="submit" tone="gold">إضافة المهمة</AdminActionButton>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="قائمة المهام" description="لا تظهر أي مهمة افتراضية؛ القائمة هنا مبنية على إدخالات التشغيل الفعلية.">
        <div className="mb-5 max-w-sm">
          <Field label="الحالة">
            <select className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="open">مفتوحة</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="done">منتهية</option>
              <option value="archived">مؤرشفة</option>
            </select>
          </Field>
        </div>
        {filtered.length === 0 ? <EmptyState title="لا توجد مهام" description="أضيفي مهمة متابعة أو غيّري الفلتر لعرض مهام أخرى." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((task) => (
              <article key={task.id} className="rounded-[1.75rem] border border-sand bg-cream/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-charcoal dark:text-ivory">{task.title}</h3>
                  <StatusBadge meta={statusMeta[task.status] || statusMeta.open} />
                </div>
                {task.description ? <p className="mt-3 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{task.description}</p> : null}
                <p className="mt-3 text-xs font-bold text-warm-gray dark:text-cream">أُنشئت: {formatArabicDateTime(task.createdAt)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {task.status !== 'done' ? <AdminActionButton disabled={savingId === task.id} tone="success" onClick={() => updateTask(task, 'task_done', 'تحديد المهمة كمنتهية؟')}>تمت</AdminActionButton> : null}
                  {task.status !== 'archived' ? <AdminActionButton disabled={savingId === task.id} tone="muted" onClick={() => updateTask(task, 'task_archived', 'أرشفة المهمة؟')}>أرشفة</AdminActionButton> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
