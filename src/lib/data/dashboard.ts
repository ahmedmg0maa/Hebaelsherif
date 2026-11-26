import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'

export type MyPayment = {
  currency:string
  id: string
  orderId: string
  method: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded'
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
  orderStatus: string
  orderExpiresAt: string | null
  productTitles: string[]
}

export type MyProfile = { id: string; fullName: string; email: string; phone: string | null }

export type MyCourse = {
  slug: string
  title: string
  percent: number
  lessonsCount: number
  durationMinutes: number
}

export type MyBook = { slug: string; title: string; pagesCount: number | null; grantedAt: string }

export type MyWorkshop = {
  slug: string
  title: string
  startsAt: string
  endsAt: string
  status: string
  locationKind: string
  meetingUrl: string | null
  resources: { id: string; title: string; kind: string }[]
  recordings: { id: string; title: string }[]
}

export type MyBooking = {
  id: string
  serviceId: string
  serviceTitle: string
  startsAt: string
  endsAt: string
  status: string
  meetingUrl: string | null
  customerNotes: string | null
  requestedPrice?: number | null
  requestedCurrency?: string | null
  requestExpiresAt?: string | null
  events: { id: string; event: string; createdAt: string }[]
  rescheduleRequests: { id: string; proposedStartsAt: string; status: string; reason: string; createdAt: string }[]
}

export type MyOrder = {
  currency:string
  id: string
  status: string
  total: number
  createdAt: string
  expiresAt: string | null
  productTitles: string[]
  products: { id: string; title: string }[]
}

export type MyNotification = {
  id: string
  title: string
  body: string
  kind: string
  link: string | null
  readAt: string | null
  createdAt: string
}

const hasEnv = hasSupabasePublicConfig

const DASHBOARD_READ_ERROR = 'CUSTOMER_DASHBOARD_READ_UNAVAILABLE'

function dashboardReadError(): never {
  throw new Error(DASHBOARD_READ_ERROR)
}

function safeHttpsUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

function safeDashboardLink(value: string | null | undefined) {
  if (!value || !(value === '/dashboard' || value.startsWith('/dashboard/') || value.startsWith('/dashboard?')) || value.startsWith('//') || /[\r\n]/.test(value)) return null
  return value
}

export async function withUser<T>(fallback: T, fn: (supabase: Awaited<ReturnType<typeof getServerClient>>, userId: string) => Promise<T>): Promise<T> {
  if (!hasEnv()) return fallback
  try {
    const supabase = await getServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError) dashboardReadError()
    if (!user) return fallback
    return await fn(supabase, user.id)
  } catch {
    dashboardReadError()
  }
}

export async function getMyProfile(): Promise<MyProfile | null> {
  return withUser<MyProfile | null>(null, async (supabase, userId) => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, phone').eq('id', userId).maybeSingle()
    if (error) dashboardReadError()
    return data ? { id: data.id, fullName: data.full_name, email: data.email, phone: data.phone } : null
  })
}

export async function getMyCourses(page?: number): Promise<MyCourse[]> {
  return withUser<MyCourse[]>([], async (supabase, userId) => {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('courses!inner(slug, title, duration_minutes), course_id')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false })
      .order('course_id', { ascending: false })
      .range(page ? (page-1)*20 : 0, page ? page*20-1 : 199)
    if (error) dashboardReadError()
    if (!data) return []
    const courseIds = data.map((row) => row.course_id)
    const [progressResponse, moduleResponse] = courseIds.length > 0
      ? await Promise.all([
        supabase.from('course_progress').select('course_id, percent').eq('user_id', userId).in('course_id', courseIds).limit(200),
        supabase.from('course_modules').select('id, course_id').in('course_id', courseIds).limit(2000),
      ])
      : [
        { data: [], error: null },
        { data: [], error: null },
      ]
    if (progressResponse.error || moduleResponse.error) dashboardReadError()
    const moduleIds = (moduleResponse.data ?? []).map((module) => module.id)
    const { data: lessons, error: lessonError } = moduleIds.length > 0
      ? await supabase.from('course_lessons').select('id, module_id').in('module_id', moduleIds).limit(5000)
      : { data: [], error: null }
    if (lessonError) dashboardReadError()
    const progress = progressResponse.data
    const pct = new Map((progress ?? []).map((p) => [p.course_id, Number(p.percent)]))
    const courseByModule = new Map((moduleResponse.data ?? []).map((module) => [module.id, module.course_id]))
    const lessonCountByCourse = new Map<string, number>()
    for (const lesson of lessons ?? []) {
      const courseId = courseByModule.get(lesson.module_id)
      if (courseId) lessonCountByCourse.set(courseId, (lessonCountByCourse.get(courseId) ?? 0) + 1)
    }
    return data.map((e) => {
      const c = Array.isArray(e.courses) ? e.courses[0] : e.courses
      return {
        slug: c?.slug ?? '',
        title: c?.title ?? '',
        percent: pct.get(e.course_id) ?? 0,
        lessonsCount: lessonCountByCourse.get(e.course_id) ?? 0,
        durationMinutes: c?.duration_minutes ?? 0,
      }
    })
  })
}

export async function getMyBooks(page?: number): Promise<MyBook[]> {
  return withUser<MyBook[]>([], async (supabase, userId) => {
    const { data, error } = await supabase
      .from('book_access')
      .select('granted_at, books!inner(slug, title, pages_count)')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false })
      .order('book_id', { ascending: false })
      .range(page ? (page-1)*20 : 0, page ? page*20-1 : 199)
    if (error) dashboardReadError()
    return (data ?? []).map((a) => {
      const b = Array.isArray(a.books) ? a.books[0] : a.books
      return { slug: b?.slug ?? '', title: b?.title ?? '', pagesCount: b?.pages_count ?? null, grantedAt: a.granted_at }
    })
  })
}

export async function getMyWorkshops(page?: number): Promise<MyWorkshop[]> {
  return withUser<MyWorkshop[]>([], async (supabase, userId) => {
    const { data, error } = await supabase
      .from('workshop_registrations')
      .select('workshop_id, status, workshops!inner(slug, title, starts_at, ends_at, location_kind)')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('workshop_id', { ascending: false })
      .range(page ? (page-1)*20 : 0, page ? page*20-1 : 99)
    if (error) dashboardReadError()
    const workshopIds = (data ?? []).map((row) => row.workshop_id)
    const [deliveryResponse, resourceResponse, recordingResponse] = workshopIds.length > 0
      ? await Promise.all([
        supabase.from('workshop_delivery').select('workshop_id, meeting_url').in('workshop_id', workshopIds).limit(100),
        supabase.from('workshop_resources').select('id, workshop_id, title, kind').in('workshop_id', workshopIds).is('archived_at', null).limit(500),
        supabase.from('workshop_recordings').select('id, workshop_id, title, published_at').in('workshop_id', workshopIds).is('archived_at', null).not('published_at', 'is', null).limit(500),
      ])
      : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ]
    if (deliveryResponse.error || resourceResponse.error || recordingResponse.error) dashboardReadError()
    const deliveryByWorkshop = new Map((deliveryResponse.data ?? []).map((row) => [row.workshop_id, safeHttpsUrl(row.meeting_url)]))
    const resourcesByWorkshop = new Map<string, { id: string; title: string; kind: string }[]>()
    for (const resource of resourceResponse.data ?? []) {
      const rows = resourcesByWorkshop.get(resource.workshop_id) ?? []
      rows.push({ id: resource.id, title: resource.title, kind: resource.kind })
      resourcesByWorkshop.set(resource.workshop_id, rows)
    }
    const recordingsByWorkshop = new Map<string, { id: string; title: string }[]>()
    for (const recording of recordingResponse.data ?? []) {
      const rows = recordingsByWorkshop.get(recording.workshop_id) ?? []
      rows.push({ id: recording.id, title: recording.title })
      recordingsByWorkshop.set(recording.workshop_id, rows)
    }
    return (data ?? []).map((r) => {
      const w = Array.isArray(r.workshops) ? r.workshops[0] : r.workshops
      return {
        slug: w?.slug ?? '',
        title: w?.title ?? '',
        startsAt: w?.starts_at ?? '',
        endsAt: w?.ends_at ?? '',
        status: r.status,
        locationKind: w?.location_kind ?? 'online',
        meetingUrl: deliveryByWorkshop.get(r.workshop_id) ?? null,
        resources: resourcesByWorkshop.get(r.workshop_id) ?? [],
        recordings: recordingsByWorkshop.get(r.workshop_id) ?? [],
      }
    })
  })
}

export async function getMyBookings(page?: number): Promise<MyBooking[]> {
  return withUser<MyBooking[]>([], async (supabase, userId) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, service_id, starts_at, ends_at, status, meeting_url, customer_notes, requested_price, requested_currency, request_expires_at, services!inner(title)')
      .eq('user_id', userId)
      .order('starts_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page ? (page-1)*20 : 0, page ? page*20-1 : 199)
    if (error) dashboardReadError()
    const bookingIds = (data ?? []).map((row) => row.id)
    const [eventResponse, rescheduleResponse] = bookingIds.length > 0
      ? await Promise.all([
        supabase.from('booking_events').select('id, booking_id, event, created_at').in('booking_id', bookingIds).order('created_at', { ascending: false }).limit(1000),
        supabase.from('booking_reschedule_requests').select('id, booking_id, proposed_starts_at, status, reason, created_at').in('booking_id', bookingIds).order('created_at', { ascending: false }).limit(500),
      ])
      : [
        { data: [], error: null },
        { data: [], error: null },
      ]
    if (eventResponse.error || rescheduleResponse.error) dashboardReadError()
    const eventsByBooking = new Map<string, MyBooking['events']>()
    for (const event of eventResponse.data ?? []) {
      const rows = eventsByBooking.get(event.booking_id) ?? []
      rows.push({ id: event.id, event: event.event, createdAt: event.created_at })
      eventsByBooking.set(event.booking_id, rows)
    }
    const reschedulesByBooking = new Map<string, MyBooking['rescheduleRequests']>()
    for (const request of rescheduleResponse.data ?? []) {
      const rows = reschedulesByBooking.get(request.booking_id) ?? []
      rows.push({ id: request.id, proposedStartsAt: request.proposed_starts_at, status: request.status, reason: request.reason, createdAt: request.created_at })
      reschedulesByBooking.set(request.booking_id, rows)
    }
    return (data ?? []).map((b) => {
      const s = Array.isArray(b.services) ? b.services[0] : b.services
      return {
        id: b.id,
        serviceId: b.service_id,
        serviceTitle: s?.title ?? '',
        startsAt: b.starts_at,
        endsAt: b.ends_at,
        status: b.status,
        meetingUrl: safeHttpsUrl(b.meeting_url),
        customerNotes: b.customer_notes,
        requestedPrice: b.requested_price == null ? null : Number(b.requested_price),
        requestedCurrency: b.requested_currency,
        requestExpiresAt: b.request_expires_at,
        events: eventsByBooking.get(b.id) ?? [],
        rescheduleRequests: reschedulesByBooking.get(b.id) ?? [],
      }
    })
  })
}

export async function getMyOrders(): Promise<MyOrder[]> {
  return withUser<MyOrder[]>([], async (supabase, userId) => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, currency, created_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) dashboardReadError()
    const orderIds = (data ?? []).map((row) => row.id)
    const { data: items, error: itemError } = orderIds.length > 0
      ? await supabase.from('order_items').select('order_id, products(id,title)').in('order_id', orderIds).limit(1000)
      : { data: [], error: null }
    if (itemError) dashboardReadError()
    const productsByOrder = new Map<string, { id: string; title: string }[]>()
    for (const item of items ?? []) {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      if (!product) continue
      const rows = productsByOrder.get(item.order_id) ?? []
      rows.push({ id: product.id, title: product.title })
      productsByOrder.set(item.order_id, rows)
    }
    return (data ?? []).map((o) => {
      const products = productsByOrder.get(o.id) ?? []
      return {
        id: o.id,
        status: o.status,
        total: Number(o.total),
        currency:o.currency,
        createdAt: o.created_at,
        expiresAt: o.expires_at,
        productTitles: products.map((product) => product.title),
        products,
      }
    })
  })
}

export type MyStreak = { days: boolean[]; count: number } // days: last 7, oldest first

export async function getMyStreak(): Promise<MyStreak> {
  return withUser<MyStreak>({ days: [false, false, false, false, false, false, false], count: 0 }, async (supabase, userId) => {
    const now = new Date()
    const since = cairoDayRange(now, -30).start
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('completed_at', since.toISOString())
      .limit(1000)
    if (error) dashboardReadError()

    const activeDays = new Set(
      (data ?? []).map((p) => cairoDateKey(new Date(p.completed_at as string))),
    )
    const days: boolean[] = []
    for (let i = 6; i >= 0; i--) {
      days.push(activeDays.has(shiftedCairoDateKey(now, -i)))
    }
    // streak = consecutive active days ending today (or yesterday)
    let count = 0
    for (let i = 0; i <= 30; i++) {
      if (activeDays.has(shiftedCairoDateKey(now, -i))) count++
      else if (i > 0) break
    }
    return { days, count }
  })
}

export type MyAchievement = { label: string; detail: string; earnedAt: string | null }

export async function getMyAchievements(): Promise<MyAchievement[]> {
  return withUser<MyAchievement[]>([], async (supabase, userId) => {
    const [certificateResponse, progressResponse] = await Promise.all([
      supabase.from('certificates').select('serial, issued_at, courses!inner(title)').eq('user_id', userId).order('issued_at', { ascending: false }).limit(100),
      supabase.from('course_progress').select('percent, updated_at, courses!inner(title)').eq('user_id', userId).order('updated_at', { ascending: false }).limit(100),
    ])
    if (certificateResponse.error || progressResponse.error) dashboardReadError()
    const certs = certificateResponse.data
    const progress = progressResponse.data
    const achievements: MyAchievement[] = []
    for (const c of certs ?? []) {
      const course = Array.isArray(c.courses) ? c.courses[0] : c.courses
      achievements.push({ label: 'شهادة إتمام 🎓', detail: course?.title ?? '', earnedAt: c.issued_at })
    }
    for (const p of progress ?? []) {
      const course = Array.isArray(p.courses) ? p.courses[0] : p.courses
      if (Number(p.percent) >= 100)
        achievements.push({ label: 'أتممتِ الدورة ✨', detail: course?.title ?? '', earnedAt: p.updated_at })
      else if (Number(p.percent) >= 50)
        achievements.push({ label: 'تجاوزتِ المنتصف 💪', detail: course?.title ?? '', earnedAt: null })
    }
    return achievements.slice(0, 6)
  })
}

export async function getMyNotifications(page?: number): Promise<MyNotification[]> {
  return withUser<MyNotification[]>([], async (supabase, userId) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, kind, link, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page ? (page-1)*20 : 0, page ? page*20-1 : 49)
    if (error) dashboardReadError()
    return (data ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      kind: n.kind,
      link: safeDashboardLink(n.link),
      readAt: n.read_at,
      createdAt: n.created_at,
    }))
  })
}

export async function getMyPayments(page?: number): Promise<MyPayment[]> {
  return withUser<MyPayment[]>([], async (supabase, userId) => {
    const { data, error } = await supabase
      .from('payments')
      .select('id, order_id, method, amount, status, reject_reason, created_at, reviewed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page ? (page-1)*20 : 0, page ? page*20-1 : 199)
    if (error) dashboardReadError()
    const orderIds = [...new Set((data ?? []).map((payment) => payment.order_id))]
    const [orderResponse, itemResponse] = orderIds.length > 0
      ? await Promise.all([
        supabase.from('orders').select('id, status, expires_at, currency').in('id', orderIds).limit(200),
        supabase.from('order_items').select('order_id, products(title)').in('order_id', orderIds).limit(1000),
      ])
      : [
        { data: [], error: null },
        { data: [], error: null },
      ]
    if (orderResponse.error || itemResponse.error) dashboardReadError()
    if ((orderResponse.data ?? []).length !== orderIds.length) dashboardReadError()
    const orderById = new Map((orderResponse.data ?? []).map((order) => [order.id, order]))
    const titlesByOrder = new Map<string, string[]>()
    for (const item of itemResponse.data ?? []) {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      if (!product?.title) continue
      const rows = titlesByOrder.get(item.order_id) ?? []
      rows.push(product.title)
      titlesByOrder.set(item.order_id, rows)
    }

    return (data ?? []).map((p) => {
      const order = orderById.get(p.order_id)
      return {
        id: p.id,
        orderId: p.order_id,
        method: p.method,
        amount: Number(p.amount),
        currency:order!.currency,
        status: p.status as MyPayment['status'],
        rejectReason: p.reject_reason,
        createdAt: p.created_at,
        reviewedAt: p.reviewed_at,
        orderStatus: order?.status ?? 'pending_payment',
        orderExpiresAt: order?.expires_at ?? null,
        productTitles: titlesByOrder.get(p.order_id) ?? [],
      }
    })
  })
}
import { cairoDateKey, cairoDayRange, shiftedCairoDateKey } from '@/lib/time/cairo-periods'
