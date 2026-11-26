import { NextRequest } from 'next/server'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { requireFreshAdminAssurance, requirePermission } from '@/lib/auth/permissions'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'

const MAX_ROWS = 5_000
const MAX_DAYS = 366
const CAIRO_TIME_ZONE = 'Africa/Cairo'
const DATASETS = ['orders', 'bookings', 'payments', 'customers'] as const

type Dataset = (typeof DATASETS)[number]
type ExportRow = Record<string, unknown>

const headers = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'X-Content-Type-Options': 'nosniff',
}

function privateText(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function isDataset(value: string): value is Dataset {
  return DATASETS.includes(value as Dataset)
}

function parseCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day)
  const candidate = new Date(utc)
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) return null
  return { year, month, day, utc }
}

function cairoMidnightIso(value: { year: number; month: number; day: number }) {
  const desired = Date.UTC(value.year, value.month - 1, value.day)
  let guess = desired
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]))
    const represented = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    )
    guess += desired - represented
  }
  return new Date(guess).toISOString()
}

function addCalendarDay(value: { year: number; month: number; day: number }) {
  const next = new Date(Date.UTC(value.year, value.month - 1, value.day + 1))
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '""'
  const raw = value instanceof Date
    ? value.toISOString()
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value)
  const neutralized = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw
  return `"${neutralized.replaceAll('"', '""')}"`
}

function toCsv(columns: readonly string[], rows: ExportRow[]) {
  return `\ufeff${[columns, ...rows.map((row) => columns.map((column) => row[column]))]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')}`
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) {
    return privateText('مصدر التقارير غير مهيأ في هذه البيئة.', 503)
  }

  const requestUrl = new URL(request.url)
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  if ((origin && origin !== requestUrl.origin) || (fetchSite && fetchSite !== 'same-origin')) {
    return privateText('تعذّر التحقق من مصدر الطلب.', 403)
  }

  const assurance = await requireFreshAdminAssurance('reports.export')
  if (!assurance?.userId) {
    return privateText('يلزم تأكيد MFA حديث وصلاحية تصدير التقارير.', 403)
  }

  const form = await request.formData()
  const dataset = String(form.get('dataset') ?? '')
  const startInput = String(form.get('start') ?? '')
  const endInput = String(form.get('end') ?? '')
  if (!isDataset(dataset)) return privateText('نوع التقرير غير معتمد.', 400)

  const start = parseCalendarDate(startInput)
  const end = parseCalendarDate(endInput)
  if (!start || !end || end.utc < start.utc) return privateText('راجعي نطاق التاريخ.', 400)
  const calendarDays = Math.floor((end.utc - start.utc) / 86_400_000) + 1
  if (calendarDays > MAX_DAYS) return privateText('الحد الأقصى لنطاق التصدير 366 يومًا.', 400)

  if (dataset === 'customers') {
    const customerPermission = await requirePermission('users.view')
    if (!customerPermission?.userId) return privateText('لا تملكين صلاحية تصدير بيانات العميلات.', 403)
  }

  const service = getServiceClient()
  const startIso = cairoMidnightIso(start)
  const endExclusiveIso = cairoMidnightIso(addCalendarDay(end))
  let rows: ExportRow[] = []
  let columns: readonly string[] = []
  let queryError: { message: string } | null = null

  if (dataset === 'orders') {
    columns = ['id', 'status', 'subtotal', 'discount', 'total', 'currency', 'created_at', 'updated_at']
    const result = await service.from('orders').select('id,status,subtotal,discount,total,currency,created_at,updated_at')
      .gte('created_at', startIso).lt('created_at', endExclusiveIso)
      .order('created_at', { ascending: false }).limit(MAX_ROWS)
    rows = (result.data ?? []).map((row) => ({ ...row }))
    queryError = result.error
  } else if (dataset === 'bookings') {
    columns = ['id', 'service_id', 'order_id', 'status', 'starts_at', 'ends_at', 'created_at', 'updated_at']
    const result = await service.from('bookings').select('id,service_id,order_id,status,starts_at,ends_at,created_at,updated_at')
      .gte('starts_at', startIso).lt('starts_at', endExclusiveIso)
      .order('starts_at', { ascending: false }).limit(MAX_ROWS)
    rows = (result.data ?? []).map((row) => ({ ...row }))
    queryError = result.error
  } else if (dataset === 'payments') {
    columns = ['id', 'order_id', 'method', 'amount', 'status', 'reviewed_at', 'created_at']
    const result = await service.from('payments').select('id,order_id,method,amount,status,reviewed_at,created_at')
      .gte('created_at', startIso).lt('created_at', endExclusiveIso)
      .order('created_at', { ascending: false }).limit(MAX_ROWS)
    rows = (result.data ?? []).map((row) => ({ ...row }))
    queryError = result.error
  } else {
    columns = ['id', 'full_name', 'email', 'created_at']
    const result = await service.from('profiles').select('id,full_name,email,created_at')
      .gte('created_at', startIso).lt('created_at', endExclusiveIso)
      .order('created_at', { ascending: false }).limit(MAX_ROWS)
    rows = (result.data ?? []).map((row) => ({ ...row }))
    queryError = result.error
  }

  if (queryError) return privateText('تعذّر إعداد التقرير دون تغيير أي بيانات.', 500)

  const { error: auditError } = await service.from('audit_logs').insert({
    actor_id: assurance.userId,
    action: 'report.exported',
    entity_type: 'report_export',
    entity_id: dataset,
    meta: { dataset, start: startInput, end: endInput, row_count: rows.length, capped_at: MAX_ROWS },
  })
  if (auditError) return privateText('تعذّر تسجيل عملية التصدير؛ لم يُسلّم الملف.', 500)

  return new Response(toCsv(columns, rows), {
    status: 200,
    headers: {
      ...headers,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="heba-${dataset}-${startInput}-${endInput}.csv"`,
    },
  })
}
