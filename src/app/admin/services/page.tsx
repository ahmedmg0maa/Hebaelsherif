import { CoachScheduleManager, type CoachSchedule } from '@/components/admin/CoachScheduleManager'
import { requirePermission } from '@/lib/auth/permissions'
import { getServiceClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { getPublicMediaOptions } from '@/lib/data/cms'
import { adminCatalogPage,type CatalogQuery } from '@/lib/data/admin-catalog'
import { CatalogListTools,CatalogPagination } from '@/components/admin/CatalogListTools'
import { CatalogCreatePanel,CatalogEditPanel } from '@/components/admin/CatalogManager'
import { AvailabilityManager } from '@/components/admin/AvailabilityManager'
import { Card,CardTitle } from '@/components/ui/Card'
export const metadata:Metadata={title:'الخدمات والسياسات — الإدارة'}
type ServiceRow = {
  id: string
  title: string
  slug: string
  description: string
  duration_minutes: number
  price: number
  request_enabled: boolean
  is_active: boolean
  booking_payment_mode: 'payment_required' | 'free'
  buffer_before_minutes: number | null
  buffer_after_minutes: number | null
  minimum_notice_minutes: number | null
  booking_window_days: number | null
  hold_minutes: number
  cancellation_notice_hours: number | null
  reschedule_notice_hours: number | null
  max_reschedules: number
  booking_policy_note: string
  products: { archived_at:string|null; compare_at_price: number | null; currency: string; subtitle: string | null; sort: number; cover_url: string | null } | { archived_at:string|null; compare_at_price: number | null; currency: string; subtitle: string | null; sort: number; cover_url: string | null }[]
  availability_rules: { id: string; weekday: number; start_time: string; end_time: string }[]
  availability_exceptions: { id: string; date: string; is_closed: boolean; start_time: string | null; end_time: string | null; kind: string; reason: string }[]
  booking_slot_overrides: { id: string; date: string; start_time: string; mode: 'open' | 'closed'; reason: string }[]
}

export default async function ServicesPage({searchParams}:{searchParams:Promise<CatalogQuery>}) {
  const [listing,media]=await Promise.all([adminCatalogPage<ServiceRow>('services',
'id, title, slug, description, duration_minutes, price, is_active, request_enabled, booking_payment_mode, buffer_before_minutes, buffer_after_minutes, minimum_notice_minutes, booking_window_days, hold_minutes, cancellation_notice_hours, reschedule_notice_hours, max_reschedules, booking_policy_note, products!inner(archived_at,compare_at_price, currency, subtitle, sort, cover_url), availability_rules(id, weekday, start_time, end_time), availability_exceptions(id, date, is_closed, start_time, end_time, kind, reason), booking_slot_overrides(id, date, start_time, mode, reason)',await searchParams),getPublicMediaOptions()])
  const serviceRows=listing.rows
  const actor=await requirePermission('availability.manage')
  let schedule:CoachSchedule|null=null
  if(actor){const {data,error}=await getServiceClient().rpc('admin_read_coach_schedule',{p_actor_id:actor.userId});if(error)throw new Error('COACH_SCHEDULE_READ_UNAVAILABLE');schedule=data as CoachSchedule}
  return <div className="mx-auto max-w-5xl space-y-8"><header><h1 className="font-heading text-3xl text-deep-teal">الخدمات والسياسات</h1><p className="mt-2 leading-loose text-text-soft">إضافة الخدمات وتعديلها وإيقافها، وسياسات الحجز وإتاحة المواعيد بتوقيت القاهرة.</p></header>
      {schedule&&<CoachScheduleManager schedule={schedule}/>}
      <CatalogListTools {...listing}/>
      <CatalogCreatePanel kind="service" media={media} />

      {serviceRows.length > 0 && <Card><CardTitle>الخدمات والسياسات</CardTitle><div className="mt-5 grid gap-4 md:grid-cols-2">{serviceRows.map((service) => {
        const product = Array.isArray(service.products) ? service.products[0] : service.products
        return <div key={service.id} className="rounded-xl border border-line bg-ivory/45 p-4"><div className="mb-3"><h3 className="font-bold text-deep-teal">{service.title}</h3><p className="text-sm text-text-soft">{Number(service.price).toLocaleString('ar-EG')} EGP · {service.duration_minutes.toLocaleString('ar-EG')} دقيقة · {service.request_enabled ? 'طلب موعد ومراجعة قبل الدفع' : service.booking_payment_mode === 'free' ? 'مجاني' : 'يتطلب دفعًا'}</p></div><CatalogEditPanel kind="service" media={media} item={{ id: service.id, title: service.title, slug: service.slug, description: service.description, price: Number(service.price), compareAtPrice: product?.compare_at_price, currency: product?.currency, subtitle: product?.subtitle, coverUrl: product?.cover_url, sort: product?.sort, archivedAt:product?.archived_at, isPublished: service.is_active, durationMinutes: service.duration_minutes, bookingPaymentMode: service.request_enabled ? 'request' : service.booking_payment_mode, bufferBeforeMinutes: service.buffer_before_minutes, bufferAfterMinutes: service.buffer_after_minutes, minimumNoticeMinutes: service.minimum_notice_minutes, bookingWindowDays: service.booking_window_days, holdMinutes: service.hold_minutes, cancellationNoticeHours: service.cancellation_notice_hours, rescheduleNoticeHours: service.reschedule_notice_hours, maxReschedules: service.max_reschedules, bookingPolicyNote: service.booking_policy_note }} /></div>
      })}</div></Card>}

      <CatalogPagination {...listing}/>
      <Card>
        <CardTitle>إتاحة الجلسات</CardTitle>
        <p className="mb-5 mt-1 text-sm text-text-soft">حددي أيام وساعات العمل، وأغلقي الأيام الاستثنائية من هنا. التوقيت: القاهرة.</p>
        <AvailabilityManager services={serviceRows.map((service) => ({ id: service.id, title: service.title, rules: service.availability_rules ?? [], exceptions: service.availability_exceptions ?? [], overrides: service.booking_slot_overrides ?? [] }))} />
      </Card>

</div>
}
