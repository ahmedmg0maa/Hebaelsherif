import type { Metadata } from 'next'
import Link from 'next/link'
import { adminList } from '@/lib/data/cms'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { BookingEditor } from '@/components/admin/BookingEditor'
import { BookingAgenda } from '@/components/admin/BookingAgenda'

export const metadata: Metadata = { title: 'الحجوزات — الإدارة' }

type Row = {
  id: string
  starts_at: string
  ends_at: string
  status: string
  customer_notes: string | null
  meeting_url: string | null
  admin_notes: string
  services: { title: string } | { title: string }[] | null
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
  booking_events: { id: string; event: string; created_at: string }[]
  booking_reschedule_requests: { id: string; proposed_starts_at: string; status: string; reason: string; created_at: string }[]
}

const dateFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'short', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })

const statusMap: Record<string, { label: string; tone: 'success' | 'pending' | 'sand' | 'danger' }> = {
  pending: { label: 'بانتظار التأكيد', tone: 'pending' },
  confirmed: { label: 'مؤكد', tone: 'success' },
  completed: { label: 'مكتمل', tone: 'sand' },
  cancelled: { label: 'ملغي', tone: 'danger' },
  no_show: { label: 'تغيّب', tone: 'danger' },
}

export default async function AdminBookingsPage() {
  const bookings = await adminList<Row>('bookings', 'id, starts_at, ends_at, status, customer_notes, meeting_url, admin_notes, services(title), profiles(full_name), booking_events(id,event,created_at), booking_reschedule_requests(id,proposed_starts_at,status,reason,created_at)', {
      orderBy: 'starts_at',
      ascending: false,
    })
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">الحجوزات</h1>
        <p className="mt-1 text-text-soft">إدارة الخدمة والتوافر والحجوزات بتوقيت القاهرة. تُسجّل التغييرات في السجل التشغيلي.</p>
      </header>

      <Link href="/admin/services" className="inline-flex min-h-12 items-center rounded-xl border border-line px-5 font-semibold text-deep-teal">الخدمات والسياسات وإتاحة المواعيد</Link>

      <BookingAgenda bookings={bookings.map((booking) => { const service = Array.isArray(booking.services) ? booking.services[0] : booking.services; const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles; return { id: booking.id, startsAt: booking.starts_at, endsAt: booking.ends_at, status: booking.status, serviceTitle: service?.title ?? 'جلسة', customerName: profile?.full_name ?? '', customerNotes: booking.customer_notes, adminNotes: booking.admin_notes, events: (booking.booking_events ?? []).map((event) => ({ id: event.id, event: event.event, createdAt: event.created_at })), requests: (booking.booking_reschedule_requests ?? []).map((request) => ({ id: request.id, proposedStartsAt: request.proposed_starts_at, status: request.status, reason: request.reason, createdAt: request.created_at })) } })} />

      {bookings.length === 0 ? (
        <EmptyState title="لا حجوزات بعد" description="تظهر جلسات العميلات هنا فور حجزها لتأكيدها وإدارتها." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>الجلسة</TH>
              <TH>الموعد</TH>
              <TH>الحالة</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {bookings.map((b) => {
              const service = Array.isArray(b.services) ? b.services[0] : b.services
              const st = statusMap[b.status] ?? statusMap.pending
              return (
                <TR key={b.id}>
                  <TD>
                    <p className="font-semibold text-deep-teal">{service?.title ?? 'جلسة'}</p>
                    {b.customer_notes && <p className="max-w-56 truncate text-xs text-taupe">{b.customer_notes}</p>}
                  </TD>
                  <TD>{dateFmt.format(new Date(b.starts_at))}</TD>
                  <TD>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </TD>
                  <TD>
                    <BookingEditor booking={{ id: b.id, startsAt: b.starts_at, status: b.status, meetingUrl: b.meeting_url, customerNotes: b.customer_notes, adminNotes: b.admin_notes }} />
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}
    </div>
  )
}
