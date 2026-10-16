import { completeReportRead, reportMonths } from '@/lib/reports/integrity'
import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { cairoMonthRange } from '@/lib/time/cairo-periods'

export type RevenueReport = {
  byMonth: { label: string; revenue: number; orders: number }[]
  byType: { type: string; revenue: number; orders: number }[]
  total: number
}

export type EnrollmentReport = {
  courses: { title: string; enrollments: number; avgPercent: number; completions: number }[]
  total: number
}

export type BookingsReport = {
  byStatus: { status: string; count: number }[]
  total: number
}

export type MembershipReport = {
  active: number
  total: number
  byPlan: { title: string; active: number; total: number }[]
}

export type Snapshot = { id: string; kind: string; periodStart: string; periodEnd: string; createdAt: string }

export type ReportsBundle = {
  state: 'ready' | 'unconfigured' | 'error'
  revenue: RevenueReport
  enrollments: EnrollmentReport
  bookings: BookingsReport
  memberships: MembershipReport
  snapshots: Snapshot[]
}

const empty: ReportsBundle = {
  state: 'ready',
  revenue: { byMonth: [], byType: [], total: 0 },
  enrollments: { courses: [], total: 0 },
  bookings: { byStatus: [], total: 0 },
  memberships: { active: 0, total: 0, byPlan: [] },
  snapshots: [],
}

const hasEnv = hasSupabasePublicConfig

const monthFmt = new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' })

export async function getReports(monthsInput = 12): Promise<ReportsBundle> {
  if (!hasEnv()) return { ...empty, state: 'unconfigured' }
  try {
    const supabase = await getServerClient()
    const now = new Date()
    const months = reportMonths(monthsInput)
    const yearAgo = cairoMonthRange(now, 1 - months).start

    const [ordersRes, itemsRes, coursesRes, progressRes, bookingsRes, snapshotsRes, plansRes, enrollmentsRes, subscriptionsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, created_at', { count: 'exact' })
        .eq('status', 'paid')
        .gte('created_at', yearAgo.toISOString()).lte('created_at', now.toISOString()).range(0, 4999),
      // order_items has no created_at — filtered against year-scoped paid order ids below
      supabase.from('order_items').select('order_id, total, products!inner(type), orders!inner(status,created_at)', { count: 'exact' }).eq('orders.status', 'paid').gte('orders.created_at', yearAgo.toISOString()).lte('orders.created_at', now.toISOString()).range(0, 4999),
      supabase.from('courses').select('id, title', { count: 'exact' }).range(0, 4999),
      supabase.from('course_progress').select('course_id, percent', { count: 'exact' }).range(0, 4999),
      supabase.from('bookings').select('status', { count: 'exact' }).range(0, 4999),
      supabase
        .from('report_snapshots')
        .select('id, kind, period_start, period_end, created_at')
        .order('created_at', { ascending: false })
        .limit(12),
      supabase.from('subscription_plans').select('id, title', { count: 'exact' }).range(0, 4999),
      supabase.from('course_enrollments').select('course_id', { count: 'exact' }).range(0, 4999),
      supabase.from('subscriptions').select('plan_id, status', { count: 'exact' }).range(0, 4999),
    ])

    if (snapshotsRes.error || [ordersRes, itemsRes, coursesRes, progressRes, bookingsRes, plansRes, enrollmentsRes, subscriptionsRes].some(result => !completeReportRead(result))) {
      return { ...empty, state: 'error' }
    }

    const paidOrders = ordersRes.data ?? []
    const paidIds = new Set(paidOrders.map((o) => o.id))
    const total = paidOrders.reduce((s, o) => s + Number(o.total), 0)

    const byMonth = Array.from({ length: months }, (_, i) => {
      const { start: m, end: next } = cairoMonthRange(now, i + 1 - months)
      const slice = paidOrders.filter((o) => o.created_at >= m.toISOString() && o.created_at < next.toISOString())
      return {
        label: monthFmt.format(m),
        revenue: slice.reduce((s, o) => s + Number(o.total), 0),
        orders: slice.length,
      }
    })

    const typeAgg = new Map<string, { revenue: number; orders: number }>()
    for (const item of itemsRes.data ?? []) {
      if (!paidIds.has(item.order_id)) continue
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      const type = product?.type ?? 'other'
      const agg = typeAgg.get(type) ?? { revenue: 0, orders: 0 }
      agg.revenue += Number(item.total)
      agg.orders += 1
      typeAgg.set(type, agg)
    }
    const byType = [...typeAgg.entries()]
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.revenue - a.revenue)

    const progressByCourse = new Map<string, number[]>()
    for (const p of progressRes.data ?? []) {
      const arr = progressByCourse.get(p.course_id) ?? []
      arr.push(Number(p.percent))
      progressByCourse.set(p.course_id, arr)
    }
    const courses = (coursesRes.data ?? [])
      .map((c) => {
        const percents = progressByCourse.get(c.id) ?? []
        return {
          title: c.title,
          enrollments: (enrollmentsRes.data ?? []).filter(enrollment => enrollment.course_id === c.id).length,
          avgPercent: percents.length ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : 0,
          completions: percents.filter((p) => p >= 100).length,
        }
      })
      .sort((a, b) => b.enrollments - a.enrollments)

    const statusAgg = new Map<string, number>()
    for (const b of bookingsRes.data ?? []) statusAgg.set(b.status, (statusAgg.get(b.status) ?? 0) + 1)
    const membershipByPlan = (plansRes.data ?? []).map((plan) => {
      const rows = (subscriptionsRes.data ?? []).filter(subscription => subscription.plan_id === plan.id)
      return { title: plan.title, active: rows.filter((row) => row.status === 'active').length, total: rows.length }
    })

    return {
      state: 'ready',
      revenue: { byMonth, byType, total },
      enrollments: { courses, total: courses.reduce((s, c) => s + c.enrollments, 0) },
      bookings: {
        byStatus: [...statusAgg.entries()].map(([status, count]) => ({ status, count })),
        total: bookingsRes.data?.length ?? 0,
      },
      memberships: {
        active: membershipByPlan.reduce((sum, plan) => sum + plan.active, 0),
        total: membershipByPlan.reduce((sum, plan) => sum + plan.total, 0),
        byPlan: membershipByPlan,
      },
      snapshots: (snapshotsRes.data ?? []).map((s) => ({
        id: s.id,
        kind: s.kind,
        periodStart: s.period_start,
        periodEnd: s.period_end,
        createdAt: s.created_at,
      })),
    }
  } catch {
    return { ...empty, state: 'error' }
  }
}
