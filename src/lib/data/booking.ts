import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { getPaymentSettings, type PaymentSettings } from './checkout'
import { bookingCalendarDates } from '@/lib/booking/cairo-time'
import { arabicDigits } from '@/lib/format'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { createPreviewBookingExperience, isPreviewExperienceEnabled } from '@/lib/preview/experience'

export type BookingRule = {
  weekday: number
  startTime: string
  endTime: string
  timezone: string
}

export type BookingException = {
  date: string
  isClosed: boolean
  startTime: string | null
  endTime: string | null
  kind: 'closed' | 'custom' | 'holiday' | 'blackout'
}

export type BookingService = {
  id: string | null
  productId: string | null
  slug: string
  title: string
  description: string
  durationMinutes: number
  price: number
  currency: string
  paymentMode: 'payment_required' | 'free'
  bookingPolicyNote: string
  policy: { slotInterval: number; bufferBefore: number; bufferAfter: number; minimumNotice: number; horizonDays: number; holdMinutes: number }
  rules: BookingRule[]
  exceptions: BookingException[]
  occupied: { startsAt: string; endsAt: string }[]
  availableSlots: Record<string, string[]>
}

export type BookingExperience = {
  services: BookingService[]
  paymentSettings: PaymentSettings
  calendarDates: string[]
  credits: { subscriptionId: string; planTitle: string; balance: number; endsAt: string; eligibleServiceIds: string[] }[]
  policy: { slotInterval: number; bufferBefore: number; bufferAfter: number; minimumNotice: number; horizonDays: number }
  runtime: { status: 'ready' | 'preview' | 'unconfigured' | 'migration-required' | 'unknown'; detail: string }
}

const defaultPolicy = { slotInterval: 30, bufferBefore: 0, bufferAfter: 0, minimumNotice: 30, horizonDays: 30 }

const hasPublicEnv = hasSupabasePublicConfig

export async function getBookingExperience(): Promise<BookingExperience> {
  const paymentSettings = await getPaymentSettings()
  let policy = defaultPolicy
  if (hasPublicEnv()) {
    try {
      const policyClient = await getServerClient()
      const { data: policyRow } = await policyClient.from('site_settings').select('value').eq('key', 'booking_policy').maybeSingle()
      const value = policyRow?.value as Record<string, unknown> | undefined
      policy = {
        slotInterval: Number(value?.slot_interval_minutes ?? 30), bufferBefore: Number(value?.buffer_before_minutes ?? 0),
        bufferAfter: Number(value?.buffer_after_minutes ?? 0), minimumNotice: Number(value?.minimum_notice_minutes ?? 30),
        horizonDays: Math.min(30, Number(value?.booking_horizon_days ?? 30)),
      }
    } catch {
      policy = defaultPolicy
    }
  }
  const calendarDates = bookingCalendarDates(new Date(), policy.horizonDays)
  if (!hasPublicEnv()) {
    if (isPreviewExperienceEnabled()) return createPreviewBookingExperience(calendarDates, policy)
    return { services: [], paymentSettings, calendarDates, credits: [], policy, runtime: { status: 'unconfigured', detail: 'لم تُهيأ قراءة Supabase في هذه البيئة.' } }
  }

  try {
    const supabase = await getServerClient()
    const { data: contract, error: contractError } = await supabase.rpc('booking_runtime_contract')
    if (contractError || (contract?.migration !== '044' || contract?.customerJourney !== '093' || contract?.coachCalendar !== '097')) {
      return { services: [], paymentSettings, calendarDates, credits: [], policy, runtime: { status: 'migration-required', detail: 'عقد الحجز واستعادة المحاولات 092–093 والتقويم المشترك 097 غير مكتمل. راجعي الترحيلات في المشروع الصحيح قبل نشر الحجز.' } }
    }
    const { data, error: servicesError } = await supabase
      .from('services')
      .select(
        'id, product_id, slug, title, description, duration_minutes, price, booking_payment_mode, buffer_before_minutes, buffer_after_minutes, minimum_notice_minutes, booking_window_days, hold_minutes, booking_policy_note, products!inner(currency, is_published), availability_rules(weekday, start_time, end_time, timezone), availability_exceptions(date, is_closed, start_time, end_time, kind)',
      )
      .eq('is_active', true)
      .eq('products.is_published', true)
      .order('price', { ascending: true })

    if (servicesError) return { services: [], paymentSettings, calendarDates, credits: [], policy, runtime: { status: 'migration-required', detail: 'حقول سياسة الحجز 044 غير متاحة أو لا يمكن قراءتها.' } }
    if (!data) return { services: [], paymentSettings, calendarDates, credits: [], policy, runtime: { status: 'ready', detail: 'عقد الحجز 044 قابل للقراءة، ولا توجد خدمات منشورة حاليًا.' } }
    const { data: { user } } = await supabase.auth.getUser()
    let credits: BookingExperience['credits'] = []
    if (user) {
      const { data: subscriptions, error: creditsError } = await supabase.from('subscriptions').select('id, ends_at, plan_snapshot, subscription_credit_ledger(delta)').eq('user_id', user.id).eq('status', 'active').lte('starts_at', new Date().toISOString()).gte('ends_at', new Date().toISOString())
      if (creditsError) return {services:[],paymentSettings,calendarDates,credits:[],policy,runtime:{status:'unknown',detail:'تعذّر تحميل رصيد الجلسات؛ لم نفترض انعدامه.'}}
      credits = (subscriptions ?? []).map((subscription) => {
        const plan = subscription.plan_snapshot as { title?: string; eligible_service_ids?: string[] } | null
        return { subscriptionId: subscription.id, planTitle: plan?.title ?? 'باقة جلسات', balance: (subscription.subscription_credit_ledger ?? []).reduce((sum, row) => sum + row.delta, 0), endsAt: subscription.ends_at, eligibleServiceIds: Array.isArray(plan?.eligible_service_ids) ? plan.eligible_service_ids : [] }
      }).filter((credit) => credit.balance > 0)
    }

    const from = new Date().toISOString()
    const until = new Date(Date.now() + 32 * 86_400_000).toISOString()
    const occupiedByService = new Map<string, { startsAt: string; endsAt: string }[]>()

    if (hasSupabaseServerSecret()) {
      const { data: occupied } = await getServiceClient()
        .from('bookings')
        .select('service_id, starts_at, ends_at')
        .in('status', ['pending', 'confirmed'])
        .gte('ends_at', from)
        .lte('starts_at', until)

      for (const row of occupied ?? []) {
        const current = occupiedByService.get(row.service_id) ?? []
        current.push({ startsAt: row.starts_at, endsAt: row.ends_at })
        occupiedByService.set(row.service_id, current)
      }
    }

    const slotRows = await Promise.all(data.map(async (service) => {
      const { data: calendar, error } = await supabase.rpc('available_booking_calendar', {
        p_service_id: service.id,
        p_from: calendarDates[0],
        p_to: calendarDates.at(-1),
      })
      return [service.id, calendar ?? [], error] as const
    }))
    if (slotRows.some(([, , error]) => error)) return { services: [], paymentSettings, calendarDates, credits, policy, runtime: { status: 'migration-required', detail: 'RPC تقويم الإتاحة 044 غير متاح. لا يمكن عرض مواعيد صحيحة.' } }
    const slotsByService = new Map(slotRows.map(([serviceId, rows]) => {
      const dates: Record<string, string[]> = {}
      for (const row of rows as { booking_date: string; slot_time: string }[]) {
        const date = String(row.booking_date)
        const time = String(row.slot_time).slice(0, 5)
        dates[date] = [...(dates[date] ?? []), time]
      }
      return [serviceId, dates] as const
    }))

    const services = data.map((service): BookingService => {
      const product = Array.isArray(service.products) ? service.products[0] : service.products
      const configuredRules = (service.availability_rules ?? []).map((rule) => ({
        weekday: rule.weekday,
        startTime: rule.start_time,
        endTime: rule.end_time,
        timezone: rule.timezone,
      }))
      return {
        id: service.id,
        productId: service.product_id,
        slug: service.slug,
        title: arabicDigits(service.title),
        description: service.description,
        durationMinutes: service.duration_minutes,
        price: Number(service.price),
        currency: product?.currency ?? 'EGP',
        paymentMode: service.booking_payment_mode === 'free' ? 'free' : 'payment_required',
        bookingPolicyNote: service.booking_policy_note ?? '',
        policy: {
          slotInterval: policy.slotInterval,
          bufferBefore: Number(service.buffer_before_minutes ?? policy.bufferBefore),
          bufferAfter: Number(service.buffer_after_minutes ?? policy.bufferAfter),
          minimumNotice: Number(service.minimum_notice_minutes ?? policy.minimumNotice),
          horizonDays: Number(service.booking_window_days ?? policy.horizonDays),
          holdMinutes: Number(service.hold_minutes ?? 10),
        },
        // A service without an admin-published availability rule is not bookable.
        // Never fabricate weekday or time windows as a fallback.
        rules: configuredRules,
        exceptions: (service.availability_exceptions ?? []).map((exception) => ({
          date: exception.date,
          isClosed: exception.is_closed,
          startTime: exception.start_time,
          endTime: exception.end_time,
          kind: exception.kind === 'custom' || exception.kind === 'holiday' || exception.kind === 'blackout' ? exception.kind : 'closed',
        })),
        occupied: occupiedByService.get(service.id) ?? [],
        availableSlots: slotsByService.get(service.id) ?? {},
      }
    }).filter((service) => Object.values(service.availableSlots).some((slots) => slots.length > 0))

    return { services, paymentSettings, calendarDates, credits, policy, runtime: { status: 'ready', detail: 'عقد الحجز 093 والتقويم المشترك 097 وإتاحة المواعيد قابلان للقراءة. يلزم اختبار حجز فعلي قبل استقبال العميلات.' } }
  } catch {
    return { services: [], paymentSettings, calendarDates, credits: [], policy, runtime: { status: 'unknown', detail: 'تعذّر فحص عقد الحجز؛ لم تُفترض الجاهزية.' } }
  }
}
