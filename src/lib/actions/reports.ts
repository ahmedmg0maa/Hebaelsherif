'use server'

import { revalidatePath } from 'next/cache'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { getReports } from '@/lib/data/reports'
import { requirePermission } from '@/lib/auth/permissions'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { cairoDateKey, cairoMonthRange } from '@/lib/time/cairo-periods'

type ActionResult = { ok: true } | { ok: false; error: string }

const hasEnv = () => hasSupabasePublicConfig() && hasSupabaseServerSecret()

export async function saveReportSnapshot(): Promise<ActionResult> {
  const permission = await requirePermission('reports.snapshot')
  if (!permission?.userId) return { ok: false, error: 'لا تملكين صلاحية حفظ لقطات التقارير.' }
  if (!hasEnv()) return { ok: false, error: 'غير متاح في بيئة العرض التجريبية.' }

  const reports = await getReports()
  if (reports.state !== 'ready') return { ok: false, error: 'لا يمكن حفظ لقطة بينما مصدر التقارير غير مهيأ أو تعذّر قراءته.' }
  const now = new Date()
  const periodStart = cairoMonthRange(now, -11).start

  const { error } = await getServiceClient().from('report_snapshots').insert({
    kind: 'monthly_overview',
    period_start: cairoDateKey(periodStart),
    period_end: cairoDateKey(now),
    data: {
      revenue: reports.revenue,
      enrollments: reports.enrollments,
      bookings: reports.bookings,
      captured_by: permission.userId,
    },
  })
  if (error) return { ok: false, error: 'تعذّر حفظ اللقطة.' }
  revalidatePath('/admin/reports')
  return { ok: true }
}
