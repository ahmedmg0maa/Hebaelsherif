import { notFound } from 'next/navigation'
import { getServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/permissions'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Customer360Actions,
  CustomerNoteControl,
  CustomerTagControl,
} from '@/components/admin/Customer360Actions'
import { NotifyUser } from '@/components/admin/NotifyUser'

type Props = { params: Promise<{ id: string }> }
type Timed = { created_at: string }
type CustomerPayload = {
  profile: { id: string; fullName: string; email: string; phone: string | null; createdAt: string }
  orders: Array<Timed & { id: string; status: string; total: number }>
  payments: Array<Timed & { id: string; status: string; amount: number }>
  bookings: Array<{ id: string; status: string; starts_at: string; service_title: string | null }>
  subscriptions: Array<Timed & { id: string; status: string; starts_at: string; ends_at: string; plan_title: string | null }>
  notes: Array<Timed & { id: string; note: string; archived_at: string | null }>
  tags: Array<Timed & { id: string; tag: string }>
  notifications: Array<Timed & { id: string; title: string; kind: string }>
  counts: { orders: number; payments: number; bookings: number; subscriptions: number; notes: number }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const fmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

function isCustomerPayload(value: unknown): value is CustomerPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = value as Partial<CustomerPayload>
  return Boolean(payload.profile?.id && Array.isArray(payload.orders) && Array.isArray(payload.payments)
    && Array.isArray(payload.bookings) && Array.isArray(payload.subscriptions) && Array.isArray(payload.notes)
    && Array.isArray(payload.tags) && Array.isArray(payload.notifications) && payload.counts)
}

export default async function Customer360Page({ params }: Props) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const admin = await requirePermission('users.view', { redirectOnFailure: true })
  if (!admin?.userId) throw new Error('ADMIN_CUSTOMER_ACCESS_UNAVAILABLE')

  const service = getServiceClient()
  const [{ data, error }, managePermission, notifyPermission] = await Promise.all([
    service.rpc('get_admin_customer_360', { p_actor_id: admin.userId, p_customer_id: id }),
    service.rpc('has_permission', { permission_name: 'users.manage', uid: admin.userId }),
    service.rpc('has_permission', { permission_name: 'notifications.send', uid: admin.userId }),
  ])
  if (error?.code === 'P0002') notFound()
  if (error || !isCustomerPayload(data)) throw new Error('ADMIN_CUSTOMER_READ_UNAVAILABLE')
  const canManage = !managePermission.error && managePermission.data === true
  const canNotify = !notifyPermission.error && notifyPermission.data === true
  const activeNotes = data.notes.filter((note) => !note.archived_at)
  const archivedNotes = data.notes.filter((note) => note.archived_at)
  const events = [
    ...data.orders.map((row) => ({ at: row.created_at, label: `طلب ${row.status} — ${Number(row.total).toLocaleString('ar-EG')} EGP` })),
    ...data.payments.map((row) => ({ at: row.created_at, label: `دفعة ${row.status} — ${Number(row.amount).toLocaleString('ar-EG')} EGP` })),
    ...data.bookings.map((row) => ({ at: row.starts_at, label: `حجز ${row.status}${row.service_title ? ` — ${row.service_title}` : ''}` })),
    ...data.notifications.map((row) => ({ at: row.created_at, label: `إشعار: ${row.title}` })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-bold text-antique-gold">ملف العميلة 360° — وصول مسجّل</p>
        <h1 className="text-3xl font-bold text-deep-teal">{data.profile.fullName || 'عميلة'}</h1>
        <p dir="ltr" className="text-text-soft">{data.profile.email} · {data.profile.phone || '—'}</p>
        <p className="mt-1 text-xs text-text-soft">انضمت {fmt.format(new Date(data.profile.createdAt))} · تعرض القوائم أحدث ١٠٠ سجل، والإشعارات أحدث ٢٠.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.tags.map((tag) => canManage
            ? <CustomerTagControl key={tag.id} userId={id} tagId={tag.id} label={tag.tag} />
            : <Badge key={tag.id} tone="teal">{tag.tag}</Badge>)}
        </div>
      </header>

      {(canManage || canNotify) && <Card><div className="flex flex-wrap items-start justify-between gap-4">{canManage && <Customer360Actions userId={id} />}{canNotify && <NotifyUser userId={id} userName={data.profile.fullName || data.profile.email} />}</div></Card>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle>الاشتراكات ({Number(data.counts.subscriptions).toLocaleString('ar-EG')})</CardTitle>
          <div className="mt-4 space-y-3">
            {data.subscriptions.length === 0
              ? <EmptyState title="لا اشتراكات" description="لا توجد اشتراكات مرتبطة بهذه العميلة." />
              : data.subscriptions.map((row) => <div key={row.id} className="rounded-lg bg-ivory/50 p-3 text-sm"><b>{row.plan_title ?? 'باقة'}</b><p>{row.status} · {fmt.format(new Date(row.ends_at))}</p></div>)}
          </div>
        </Card>

        <Card>
          <CardTitle>الملاحظات الداخلية ({Number(data.counts.notes).toLocaleString('ar-EG')})</CardTitle>
          <div className="mt-4 space-y-3">
            {activeNotes.length === 0
              ? <EmptyState title="لا ملاحظات نشطة" description="تظهر الملاحظات التشغيلية هنا بعد إضافتها." />
              : activeNotes.map((row) => <div key={row.id} className="rounded-lg bg-ivory/50 p-3 text-sm"><p className="whitespace-pre-wrap">{row.note}</p><time className="text-xs text-taupe">{fmt.format(new Date(row.created_at))}</time>{canManage && <CustomerNoteControl userId={id} noteId={row.id} archived={false} />}</div>)}
          </div>
          {archivedNotes.length > 0 && <details className="mt-4 rounded-xl border border-line p-3"><summary className="cursor-pointer text-sm font-bold text-deep-teal">الملاحظات المؤرشفة ({archivedNotes.length.toLocaleString('ar-EG')})</summary><div className="mt-3 space-y-3">{archivedNotes.map((row) => <div key={row.id} className="rounded-lg bg-surface-muted p-3 text-sm opacity-80"><p className="whitespace-pre-wrap">{row.note}</p><time className="text-xs text-taupe">{fmt.format(new Date(row.created_at))}</time>{canManage && <CustomerNoteControl userId={id} noteId={row.id} archived />}</div>)}</div></details>}
        </Card>

        <Card>
          <CardTitle>الخط الزمني</CardTitle>
          <p className="mt-1 text-xs text-text-soft">طلبات {Number(data.counts.orders).toLocaleString('ar-EG')} · دفعات {Number(data.counts.payments).toLocaleString('ar-EG')} · حجوزات {Number(data.counts.bookings).toLocaleString('ar-EG')}</p>
          <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">
            {events.length === 0
              ? <EmptyState title="لا نشاط بعد" description="لا توجد أحداث تشغيلية مرتبطة بهذه العميلة." />
              : events.map((event, index) => <div key={`${event.at}-${index}`} className="border-s-2 border-antique-gold ps-3 text-sm"><p>{event.label}</p><time className="text-xs text-taupe">{fmt.format(new Date(event.at))}</time></div>)}
          </div>
        </Card>
      </div>
    </div>
  )
}
