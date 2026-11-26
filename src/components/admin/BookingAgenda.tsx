'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { calendarDays,moveCalendar,type CalendarView } from '@/lib/booking/admin-calendar'
import { AdminField,AdminSelect,AdminTextarea } from './AdminField'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'
import { resolveBookingReschedule } from '@/lib/actions/booking-admin'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export type AgendaBooking = {
  id: string
  startsAt: string
  endsAt: string
  status: string
  serviceTitle: string
  customerName: string
  customerNotes: string | null
  adminNotes: string
  events: { id: string; event: string; createdAt: string }[]
  requests: { id: string; proposedStartsAt: string; status: string; reason: string; createdAt: string }[]
}

const statusTone: Record<string, 'success' | 'pending' | 'sand' | 'danger'> = { pending: 'pending', confirmed: 'success', completed: 'sand', cancelled: 'danger', no_show: 'danger' }
const statusLabel: Record<string, string> = { pending: 'بانتظار التأكيد', confirmed: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي', no_show: 'تغيّب' }
const eventLabel: Record<string, string> = {
  'booking.created': 'أُنشئ الحجز', 'booking.free_confirmed': 'تأكّد الحجز المجاني', 'customer.cancelled': 'ألغت العميلة الحجز',
  'customer.reschedule_requested': 'طلبت العميلة تغيير الموعد', 'admin.reschedule_approved': 'وافقت الإدارة على تغيير الموعد', 'admin.reschedule_declined': 'رفضت الإدارة طلب التغيير',
}
const cairoDate = (value: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date(value))
const time = (value: string) => new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date(value))
const SAVED_FILTER_KEY = 'heba.admin.booking-agenda.v1'

function isAgendaView(value: unknown): value is 'day' | 'week' | 'month' {
  return value === 'day' || value === 'week' || value === 'month'
}

function isAgendaStatus(value: unknown): value is string {
  return value === 'all' || (typeof value === 'string' && value in statusLabel)
}

function RescheduleResolutionControls({ requestId, onResolved }: { requestId: string; onResolved: (message: string, ok: boolean) => void }) {
  const [note, setNote] = useState('')
  const {busy,feedback,run}=useAdminAction()
  async function resolve(approve: boolean) {
    const ok=await run(()=>resolveBookingReschedule(requestId,approve,note),approve?'نُقل الحجز وأُبلغت العميلة؛ لم يتغير الدفع.':'رُفض طلب التغيير وبقي الحجز الأصلي.')
    if(ok){setNote('');onResolved(approve?'نُقل الموعد وأُفرج عن الوقت السابق.':'بقي الموعد الأصلي كما هو.',true)}
  }
  return <div className="mt-2 space-y-2">
    <AdminTextarea label="ملاحظة داخلية" name="admin_notes" value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} rows={2}/>
    <p className="text-sm leading-6 text-text-soft">القبول ينقل الحجز بعد فحص التعارض ويُشعر العميلة. الرفض يحتفظ بالموعد الحالي. لا ينفّذ أي منهما رد مبلغ.</p>
    <ActionFeedback feedback={feedback}/>
    <div className="flex gap-2">
      <Button size="sm" disabled={busy} onClick={() => resolve(true)}>قبول</Button>
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => resolve(false)}>رفض</Button>
    </div>
  </div>
}

export function BookingAgenda({ bookings,anchor,initialView }: { bookings: AgendaBooking[];anchor:string;initialView:CalendarView }) {
  const router=useRouter()
  const days=calendarDays(anchor,initialView)
  const [layout,setLayout]=useState<'calendar'|'list'>('calendar')
  function navigate(date:string,nextView:CalendarView=initialView){router.push(`/admin/bookings?date=${date}&view=${nextView}`)}
  const view=initialView
  const setView=(v:CalendarView)=>navigate(anchor,v)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [message, setMessage] = useState<string | null>(null)
  function loadOperationalView() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SAVED_FILTER_KEY) ?? '{}') as { view?: unknown; status?: unknown }
      if (isAgendaView(saved.view)) setView(saved.view)
      if (isAgendaStatus(saved.status)) setStatus(saved.status)
      setMessage(isAgendaView(saved.view) || isAgendaStatus(saved.status) ? 'تم تحميل العرض المحفوظ على هذا الجهاز.' : 'لا يوجد عرض محفوظ على هذا الجهاز.')
    } catch {
      window.localStorage.removeItem(SAVED_FILTER_KEY)
      setMessage('تعذّر قراءة العرض المحفوظ؛ أُزيلت النسخة غير الصالحة.')
    }
  }

  function saveOperationalView() {
    try {
      // Deliberately omit `query`: customer names, emails and notes must never be persisted in browser storage.
      window.localStorage.setItem(SAVED_FILTER_KEY, JSON.stringify({ view, status }))
      setMessage('حُفظ عرض الفترة والحالة على هذا الجهاز فقط؛ لم يُحفظ بحث العميلة.')
    } catch {
      setMessage('تعذّر حفظ العرض في هذا المتصفح. لم تتغير بيانات الحجز.')
    }
  }

  function resetOperationalView() {
    window.localStorage.removeItem(SAVED_FILTER_KEY)
    setView('week')
    setStatus('all')
    setQuery('')
    setMessage('أُعيد عرض الأجندة الافتراضي.')
  }
  const today=cairoDate(new Date().toISOString())
  const visible=useMemo(()=>bookings.filter(booking=>{
    const q=query.trim().toLocaleLowerCase('ar-EG')
    return (status==='all'||booking.status===status)&&(!q||[booking.serviceTitle,booking.customerName,booking.customerNotes??'',booking.adminNotes].join(' ').toLocaleLowerCase('ar-EG').includes(q))
  }),[bookings,query,status])
  const groups = Map.groupBy(visible, (booking) => cairoDate(booking.startsAt))
  return <section className="rounded-2xl border border-line bg-surface-raised p-5 shadow-card">
    <header><h2 className="text-xl font-bold text-deep-teal">أجندة التشغيل</h2><p className="mt-2 text-sm leading-7 text-text-soft">كل المواعيد بتوقيت القاهرة. الفترة المعروضة من {days[0]} إلى {days.at(-1)}. اختاري تاريخًا للتنقل؛ تُجلب حجوزات الفترة من قاعدة البيانات.</p></header>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" onClick={()=>navigate(moveCalendar(anchor,view,-1))}>السابق</Button>
      <Button type="button" variant="ghost" onClick={()=>navigate(today)}>اليوم</Button>
      <Button type="button" variant="secondary" onClick={()=>navigate(moveCalendar(anchor,view,1))}>التالي</Button>
      {(['day','week','month'] as const).map(v=><Button key={v} type="button" aria-pressed={view===v} variant={view===v?'primary':'secondary'} onClick={()=>setView(v)}>{v==='day'?'يوم':v==='week'?'أسبوع':'شهر'}</Button>)}
      <Button type="button" aria-pressed={layout==='list'} variant="ghost" onClick={()=>setLayout(layout==='list'?'calendar':'list')}>{layout==='list'?'عرض التقويم':'عرض قائمة'}</Button>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">
      <AdminField name="date" label="الانتقال إلى تاريخ" type="date" required value={anchor} onChange={e=>{if(e.target.value)navigate(e.target.value)}}/>
      <AdminField name="query" label="بحث في حجوزات الفترة" aria-label="بحث الأجندة بالعميلة أو الخدمة" value={query} onChange={e=>setQuery(e.target.value)}/>
      <AdminSelect name="status" label="تصفية حسب الحالة" hint="فلترة للعرض فقط؛ لا تغيّر حالة أي حجز." example="المؤكد لعرض الحجوزات المؤكدة فقط" value={status} onChange={e=>setStatus(e.target.value)} options={[{value:'all',label:'كل الحالات'},...Object.entries(statusLabel).map(([value,label])=>({value,label}))]}/>
    </div>
    <div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" onClick={saveOperationalView}>حفظ العرض على الجهاز</Button><Button type="button" size="sm" variant="ghost" onClick={loadOperationalView}>تحميل المحفوظ</Button><Button type="button" size="sm" variant="ghost" onClick={resetOperationalView}>الافتراضي</Button></div>
    {layout==='calendar'&&<div className="mt-5 overflow-x-auto rounded-xl border border-line" tabIndex={0} aria-label="تقويم الحجوزات؛ يمكن التمرير أفقيًا على الهاتف">
      <div className={view==='day'?'min-w-0':"grid min-w-[49rem] grid-cols-7"}>
      {view==='month'&&Array.from({length:new Date(`${days[0]}T12:00:00Z`).getUTCDay()},(_,i)=><div key={`blank-${i}`} className="border-b border-e border-line bg-sand/10"/>)}
      {days.map(day=><section key={day} aria-label={day} className={`min-h-36 border-b border-e border-line p-3 ${day===today?'bg-antique-gold/10':'bg-ivory/30'}`}>
       <h3 className="text-sm font-bold text-deep-teal">{new Intl.DateTimeFormat('ar-EG',{weekday:'short',day:'numeric',month:'short',timeZone:'Africa/Cairo'}).format(new Date(`${day}T12:00:00Z`))}</h3>
       <div className="mt-2 space-y-2">{(groups.get(day)??[]).map(b=><a key={b.id} href={`#booking-${b.id}`} className="block min-h-12 rounded-lg border border-line bg-surface-raised p-2 text-sm text-deep-teal"><b>{time(b.startsAt)} – {time(b.endsAt)}</b><span className="block">{b.serviceTitle}</span><span className="block text-text-soft">{b.customerName} · {statusLabel[b.status]}</span></a>)}{!groups.has(day)&&<p className="text-sm text-text-soft">لا حجوزات</p>}</div>
      </section>)}
      </div></div>}
    <div className="mt-5 grid gap-4 lg:grid-cols-2">{groups.size === 0 ? <p className="text-sm text-text-soft">لا توجد حجوزات مطابقة لهذا العرض.</p> : [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([day, items]) => <section key={day} className="rounded-xl border border-line bg-ivory/40 p-4"><h3 className="font-bold text-deep-teal">{new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Cairo' }).format(new Date(`${day}T12:00:00Z`))}</h3><div className="mt-3 space-y-3">{items.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((booking) => <article id={`booking-${booking.id}`} key={booking.id} className="rounded-xl border border-line bg-surface-raised p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-deep-teal">{time(booking.startsAt)} — {booking.serviceTitle}</strong><p className="mt-1 text-xs text-text-soft">{booking.customerName || 'عميلة مسجلة'}</p></div><Badge tone={statusTone[booking.status] ?? 'pending'}>{statusLabel[booking.status] ?? booking.status}</Badge></div>{booking.customerNotes && <p className="mt-2 text-xs text-text-soft">ملاحظة العميلة: {booking.customerNotes}</p>}{booking.adminNotes && <p className="mt-2 text-xs font-semibold text-deep-teal">ملاحظة داخلية: {booking.adminNotes}</p>}<details className="mt-3 text-xs text-taupe"><summary className="cursor-pointer font-bold text-deep-teal">التفاصيل والسجل</summary><ol className="mt-2 space-y-1">{booking.events.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((event) => <li key={event.id}>{time(event.createdAt)} — {eventLabel[event.event] ?? event.event}</li>)}</ol></details>{booking.requests.filter((request) => request.status === 'pending').map((request) => <div key={request.id} className="mt-3 rounded-lg bg-antique-gold/10 p-3 text-xs"><p className="font-bold text-deep-teal">طلب تغيير إلى {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date(request.proposedStartsAt))}</p>{request.reason && <p className="mt-1 text-text-soft">{request.reason}</p>}<RescheduleResolutionControls requestId={request.id} onResolved={(resultMessage) => setMessage(resultMessage)} /></div>)}</article>)}</div></section>)}</div>
    {message && <p role="status" className="mt-4 rounded-xl bg-deep-teal/8 px-3 py-2 text-sm font-semibold text-deep-teal">{message}</p>}
  </section>
}
