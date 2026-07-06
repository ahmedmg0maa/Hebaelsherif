'use client'

export const dynamic = 'force-dynamic'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { fetchAdminApi } from '@/lib/admin/client'
import { formatArabicDateTime, formatEGP, formatNumber } from '@/lib/utils/formatters'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, MetricCard, ToneBadge, inputClass } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface WorkshopRow {
  id: string
  slug: string
  title_ar: string
  kind: string
  price_egp: number
  capacity: number | null
  starts_at: string | null
  status: string
  registration_open: boolean
  created_at: string
}

interface RegistrationRow {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  status: string
  payment_status: string
  amount: number
  created_at: string
}

const kindLabels: Record<string, string> = {
  live: 'مباشرة',
  recorded: 'مسجلة',
  hybrid: 'مدمجة',
  webinar: 'لقاء تعريفي',
  group: 'مجموعة',
}

const regStatusMeta: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' | 'petrol' | 'danger' }> = {
  pending: { label: 'بانتظار الدفع', tone: 'warning' },
  payment_submitted: { label: 'إثبات مرفوع', tone: 'petrol' },
  confirmed: { label: 'مؤكد', tone: 'success' },
  waitlisted: { label: 'قائمة انتظار', tone: 'muted' },
  cancelled: { label: 'ملغي', tone: 'muted' },
  rejected: { label: 'مرفوض', tone: 'danger' },
  attended: { label: 'حضر', tone: 'success' },
}

const emptyForm = { slug: '', title_ar: '', kind: 'live', price_egp: '0', capacity: '', starts_at: '', description_ar: '' }

export default function AdminWorkshopsPage() {
  const { sessionUser } = useAuth()
  const [workshops, setWorkshops] = useState<WorkshopRow[]>([])
  const [registrations, setRegistrations] = useState<Record<string, RegistrationRow[]>>({})
  const [expandedId, setExpandedId] = useState('')
  const [links, setLinks] = useState({ liveUrl: '', replayUrl: '' })
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    if (!sessionUser) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminApi<{ items: WorkshopRow[] }>(sessionUser, '/api/admin/v7/workshops')
      setWorkshops(data.items || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الورش.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionUser) load()
  }, [sessionUser])

  async function createWorkshop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      await fetchAdminApi(sessionUser, '/api/admin/v7/workshops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug,
          title_ar: form.title_ar,
          description_ar: form.description_ar,
          kind: form.kind,
          price_egp: Number(form.price_egp || 0),
          capacity: form.capacity ? Number(form.capacity) : null,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
          status: 'draft',
        }),
      })
      setForm(emptyForm)
      setMessage('تم إنشاء الورشة كمسودة. انشريها عندما تكون جاهزة.')
      await load()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'تعذر إنشاء الورشة.')
    }
  }

  async function updateWorkshop(workshop: WorkshopRow, patch: Record<string, unknown>, successMessage: string) {
    setSavingId(workshop.id)
    setMessage('')
    setError('')
    try {
      await fetchAdminApi(sessionUser, `/api/admin/v7/workshops/${workshop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      setWorkshops((current) => current.map((item) => (item.id === workshop.id ? { ...item, ...patch } : item)))
      setMessage(successMessage)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'تعذر تحديث الورشة.')
    } finally {
      setSavingId('')
    }
  }

  async function toggleRegistrations(workshop: WorkshopRow) {
    if (expandedId === workshop.id) {
      setExpandedId('')
      return
    }
    setExpandedId(workshop.id)
    setLinks({ liveUrl: '', replayUrl: '' })
    try {
      const [regs, linkData] = await Promise.all([
        fetchAdminApi<{ items: RegistrationRow[] }>(sessionUser, `/api/admin/v7-workshops/${workshop.id}/registrations`),
        fetchAdminApi<{ item: { live_url: string | null; replay_url: string | null } }>(sessionUser, `/api/admin/v7-workshops/${workshop.id}/links`),
      ])
      setRegistrations((current) => ({ ...current, [workshop.id]: regs.items || [] }))
      setLinks({ liveUrl: linkData.item?.live_url || '', replayUrl: linkData.item?.replay_url || '' })
    } catch (regError) {
      setError(regError instanceof Error ? regError.message : 'تعذر تحميل التسجيلات.')
    }
  }

  async function updateRegistration(workshopId: string, registration: RegistrationRow, status: string) {
    setSavingId(registration.id)
    setError('')
    try {
      await fetchAdminApi(sessionUser, `/api/admin/v7-workshops/${workshopId}/registrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: registration.id, status }),
      })
      setRegistrations((current) => ({
        ...current,
        [workshopId]: (current[workshopId] || []).map((item) => (item.id === registration.id ? { ...item, status } : item)),
      }))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'تعذر تحديث التسجيل.')
    } finally {
      setSavingId('')
    }
  }

  async function saveLinks(workshopId: string) {
    setSavingId(workshopId)
    setMessage('')
    setError('')
    try {
      await fetchAdminApi(sessionUser, `/api/admin/v7-workshops/${workshopId}/links`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(links),
      })
      setMessage('تم حفظ روابط الحضور. لا تظهر إلا للمسجلين المؤكدين.')
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'تعذر حفظ الروابط.')
    } finally {
      setSavingId('')
    }
  }

  const stats = useMemo(
    () => ({
      total: workshops.length,
      published: workshops.filter((workshop) => workshop.status === 'published').length,
      open: workshops.filter((workshop) => workshop.registration_open && workshop.status === 'published').length,
    }),
    [workshops],
  )

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="الورش واللقاءات"
        description="إنشاء الورش، متابعة التسجيلات والمقاعد، تأكيد الحضور، وحفظ روابط البث للمؤكدين فقط."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="إجمالي الورش" value={formatNumber(stats.total)} />
        <MetricCard label="ورش منشورة" value={formatNumber(stats.published)} />
        <MetricCard label="تسجيل مفتوح" value={formatNumber(stats.open)} />
      </div>

      <AdminPanel title="ورشة جديدة" description="تُنشأ كمسودة ولا تظهر للعملاء حتى النشر.">
        <form onSubmit={createWorkshop} className="grid gap-4 md:grid-cols-3">
          <Field label="المعرف في الرابط (slug)" hint="حروف إنجليزية صغيرة وأرقام وشرطات فقط">
            <input className={inputClass} dir="ltr" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="calm-boundaries-workshop" required />
          </Field>
          <Field label="عنوان الورشة">
            <input className={inputClass} value={form.title_ar} onChange={(event) => setForm({ ...form, title_ar: event.target.value })} required />
          </Field>
          <Field label="النوع">
            <select className={inputClass} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
              <option value="live">مباشرة</option>
              <option value="recorded">مسجلة</option>
              <option value="hybrid">مدمجة</option>
              <option value="webinar">لقاء تعريفي</option>
              <option value="group">مجموعة عمل</option>
            </select>
          </Field>
          <Field label="السعر (ج.م)" hint="صفر = مجانية">
            <input className={inputClass} type="number" min="0" value={form.price_egp} onChange={(event) => setForm({ ...form, price_egp: event.target.value })} />
          </Field>
          <Field label="عدد المقاعد (اختياري)">
            <input className={inputClass} type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
          </Field>
          <Field label="الموعد (اختياري)">
            <input className={inputClass} type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} />
          </Field>
          <Field label="الوصف">
            <textarea className={`${inputClass} min-h-[90px]`} value={form.description_ar} onChange={(event) => setForm({ ...form, description_ar: event.target.value })} />
          </Field>
          <div className="flex items-end md:col-span-2">
            <AdminActionButton type="submit">إنشاء الورشة</AdminActionButton>
          </div>
        </form>
        {message ? <p className="mt-4 text-sm font-black text-petrol">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-black text-burgundy">{error}</p> : null}
      </AdminPanel>

      <AdminPanel title="كل الورش" description="النشر يعرض الورشة في /workshops عندما تكون خاصية الورش مفعلة.">
        {workshops.length === 0 ? (
          <EmptyState title="لا توجد ورش" description="أنشئي أول ورشة من النموذج أعلاه." />
        ) : (
          <div className="grid gap-4">
            {workshops.map((workshop) => (
              <div key={workshop.id} className="rounded-[1.75rem] border border-sand bg-cream/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-charcoal">{workshop.title_ar}</h3>
                      <ToneBadge tone={workshop.status === 'published' ? 'success' : 'muted'}>
                        {workshop.status === 'published' ? 'منشورة' : workshop.status === 'draft' ? 'مسودة' : workshop.status}
                      </ToneBadge>
                      <ToneBadge tone="petrol">{kindLabels[workshop.kind] || workshop.kind}</ToneBadge>
                      {!workshop.registration_open ? <ToneBadge tone="warning">التسجيل مغلق</ToneBadge> : null}
                    </div>
                    <p className="latin-numerals mt-2 text-xs font-bold text-warm-gray">
                      {workshop.price_egp > 0 ? formatEGP(workshop.price_egp) : 'مجانية'}
                      {workshop.capacity ? ` • ${formatNumber(workshop.capacity)} مقعد` : ' • بدون حد مقاعد'}
                      {workshop.starts_at ? ` • ${formatArabicDateTime(workshop.starts_at)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {workshop.status !== 'published' ? (
                      <AdminActionButton type="button" tone="success" disabled={savingId === workshop.id} onClick={() => updateWorkshop(workshop, { status: 'published' }, 'تم نشر الورشة.')}>
                        نشر
                      </AdminActionButton>
                    ) : (
                      <AdminActionButton type="button" tone="warning" disabled={savingId === workshop.id} onClick={() => updateWorkshop(workshop, { status: 'hidden' }, 'تم إخفاء الورشة.')}>
                        إخفاء
                      </AdminActionButton>
                    )}
                    <AdminActionButton
                      type="button"
                      tone="muted"
                      disabled={savingId === workshop.id}
                      onClick={() => updateWorkshop(workshop, { registration_open: !workshop.registration_open }, 'تم تحديث حالة التسجيل.')}
                    >
                      {workshop.registration_open ? 'إغلاق التسجيل' : 'فتح التسجيل'}
                    </AdminActionButton>
                    <AdminActionButton type="button" tone="petrol" onClick={() => toggleRegistrations(workshop)}>
                      {expandedId === workshop.id ? 'إخفاء التفاصيل' : 'التسجيلات والروابط'}
                    </AdminActionButton>
                  </div>
                </div>

                {expandedId === workshop.id ? (
                  <div className="mt-5 space-y-5 border-t border-sand pt-5">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <Field label="رابط البث المباشر" hint="يظهر فقط للمسجلين المؤكدين">
                        <input className={inputClass} dir="ltr" value={links.liveUrl} onChange={(event) => setLinks({ ...links, liveUrl: event.target.value })} placeholder="https://..." />
                      </Field>
                      <Field label="رابط التسجيل/الإعادة">
                        <input className={inputClass} dir="ltr" value={links.replayUrl} onChange={(event) => setLinks({ ...links, replayUrl: event.target.value })} placeholder="https://..." />
                      </Field>
                      <div className="flex items-end">
                        <AdminActionButton type="button" tone="gold" disabled={savingId === workshop.id} onClick={() => saveLinks(workshop.id)}>
                          حفظ الروابط
                        </AdminActionButton>
                      </div>
                    </div>

                    {(registrations[workshop.id] || []).length === 0 ? (
                      <EmptyState title="لا توجد تسجيلات بعد" description="ستظهر التسجيلات هنا فور تسجيل العميلات." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-right text-sm">
                          <thead>
                            <tr className="border-b border-sand text-xs font-black text-warm-gray">
                              <th className="px-3 py-2">الاسم</th>
                              <th className="px-3 py-2">البريد</th>
                              <th className="px-3 py-2">الحالة</th>
                              <th className="px-3 py-2">إجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(registrations[workshop.id] || []).map((registration) => (
                              <tr key={registration.id} className="border-b border-sand/60">
                                <td className="px-3 py-3 font-black text-charcoal">{registration.customer_name || '—'}</td>
                                <td className="latin-numerals px-3 py-3 text-xs font-bold text-warm-gray">{registration.customer_email}</td>
                                <td className="px-3 py-3">
                                  <ToneBadge tone={(regStatusMeta[registration.status] || regStatusMeta.pending).tone}>
                                    {(regStatusMeta[registration.status] || regStatusMeta.pending).label}
                                  </ToneBadge>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    {registration.status !== 'confirmed' && registration.status !== 'attended' ? (
                                      <AdminActionButton type="button" tone="success" disabled={savingId === registration.id} onClick={() => updateRegistration(workshop.id, registration, 'confirmed')}>
                                        تأكيد
                                      </AdminActionButton>
                                    ) : null}
                                    {registration.status === 'confirmed' ? (
                                      <AdminActionButton type="button" tone="petrol" disabled={savingId === registration.id} onClick={() => updateRegistration(workshop.id, registration, 'attended')}>
                                        حضر
                                      </AdminActionButton>
                                    ) : null}
                                    {registration.status !== 'rejected' && registration.status !== 'cancelled' ? (
                                      <AdminActionButton type="button" tone="danger" disabled={savingId === registration.id} onClick={() => updateRegistration(workshop.id, registration, 'rejected')}>
                                        رفض
                                      </AdminActionButton>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
