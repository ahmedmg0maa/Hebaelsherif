import { AccountPagination } from '@/components/dashboard/AccountPagination'
import { accountPage } from '@/lib/customer-order-state'
import { getCollectionCount } from '@/lib/data/customer-account'
import type { Metadata } from 'next'
import { getMyBookings } from '@/lib/data/dashboard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CustomerBookingActions } from '@/components/booking/CustomerBookingActions'

export const metadata: Metadata = { title: 'حجوزاتي' }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })

const statusMap: Record<string, { label: string; tone: 'success' | 'pending' | 'sand' | 'danger' }> = {
  pending: { label: 'بانتظار التأكيد', tone: 'pending' },
  confirmed: { label: 'مؤكد', tone: 'success' },
  completed: { label: 'مكتملة', tone: 'sand' },
  cancelled: { label: 'ملغاة', tone: 'danger' },
  no_show: { label: 'لم يتم الحضور', tone: 'danger' },
}

export default async function MyBookingsPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const page=accountPage((await searchParams).page)
  const [bookings,total]=await Promise.all([getMyBookings(page),getCollectionCount('bookings')])

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold leading-snug text-deep-teal">حجوزاتي</h1>
        <p className="mt-1 text-text-soft">جلساتك الفردية القادمة والسابقة.</p>
      </header>

      {bookings.length === 0 ? (
        <EmptyState
          title="لا حجوزات بعد"
          description="تظهر حجوزاتك الفعلية هنا بعد تأكيدها، مع حالة الإلغاء أو طلب تغيير الموعد."
          actionLabel="احجزي جلستك الأولى"
          actionHref="/booking"
        />
      ) : (
        <div className="space-y-5">
          {bookings.map((b) => {
            const st = statusMap[b.status] ?? statusMap.pending
            return (
              <Card key={b.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-deep-teal">{b.serviceTitle}</h2>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <p className="tnum mt-1 text-sm text-taupe">{dateFmt.format(new Date(b.startsAt))}</p>
                  {b.customerNotes && <p className="mt-2 text-sm text-text-soft">ملاحظتك: {b.customerNotes}</p>}
                  {b.rescheduleRequests.length > 0 && <div className="mt-3 rounded-xl bg-ivory px-3 py-2 text-xs text-text-soft">{b.rescheduleRequests.map((request) => <p key={request.id}>طلب تغيير {request.status === 'pending' ? 'قيد المراجعة' : request.status === 'approved' ? 'تمت الموافقة عليه' : 'تم رفضه'} — {dateFmt.format(new Date(request.proposedStartsAt))}</p>)}</div>}
                  {b.events.length > 0 && <details className="mt-3 text-xs text-taupe"><summary className="cursor-pointer font-semibold text-deep-teal">سجل الحجز</summary><ol className="mt-2 space-y-1">{b.events.slice().sort((a, z) => z.createdAt.localeCompare(a.createdAt)).map((event) => <li key={event.id}>{dateFmt.format(new Date(event.createdAt))} — {event.event}</li>)}</ol></details>}
                </div>
                <div className="space-y-3">{b.status === 'confirmed' && b.meetingUrl && (
                  <Button href={b.meetingUrl} target="_blank" variant="secondary" size="sm" className="shrink-0">رابط الجلسة</Button>
                )}{['pending','confirmed'].includes(b.status) && <Button href={`/dashboard/bookings/${b.id}/calendar`} variant="ghost" size="sm" className="shrink-0">إضافة للتقويم</Button>}{['pending','confirmed'].includes(b.status)&&new Date(b.startsAt)>new Date()&&<CustomerBookingActions bookingId={b.id}/>}</div>
              </Card>
            )
          })}
        </div>
      )}
      <div className="mt-6"><AccountPagination page={page} total={total} base="/dashboard/bookings"/></div>
    </div>
  )
}
