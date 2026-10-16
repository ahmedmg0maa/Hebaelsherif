import 'server-only'
import { requirePermission } from '@/lib/auth/permissions'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'

export type SecurityCheckStatus = 'verified-live' | 'verified-local' | 'configured' | 'unverified' | 'failed'
export type SecurityCenterState = 'verified-live' | 'migration-required' | 'unconfigured' | 'unavailable'

export type SecurityCheck = {
  id: string
  title: string
  detail: string
  status: SecurityCheckStatus
}

export type SecurityEvent = { id: string; event: string; created_at: string }

export type SecurityCenter = {
  state: SecurityCenterState
  checkedAt: string | null
  checks: SecurityCheck[]
  metrics: { activeSessions: number | null; activeLockouts: number | null; failedLogins24h: number | null; events7d: number | null }
  events: SecurityEvent[]
  eventsAvailable: boolean
}

type ReadinessRow = {
  public_table_count?: unknown
  rls_enabled_count?: unknown
  rls_missing_tables?: unknown
  admin_assurance_policy?: unknown
  payment_proof_policy?: unknown
  protected_storage_policy?: unknown
  private_delivery_buckets?: unknown
  protected_delivery_contract?: unknown
  atomic_session_revocation?: unknown
  active_sessions?: unknown
  active_lockouts?: unknown
  failed_logins_24h?: unknown
  security_events_7d?: unknown
  checked_at?: unknown
}

const numberOrNull = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
const migrationMissing = (code?: string, message?: string) => code === 'PGRST202' || Boolean(message?.includes('get_admin_security_readiness'))

function unavailableChecks(state: 'unconfigured' | 'migration-required' | 'unavailable'): SecurityCheck[] {
  const reason = state === 'unconfigured'
    ? 'لا توجد تهيئة خادم كاملة في هذه البيئة، لذلك لم يُفحص هذا الضابط على قاعدة بيانات.'
    : state === 'migration-required'
      ? 'يلزم تطبيق migration 056 على Staging المصرح به قبل إثبات هذا الضابط حيًا.'
      : 'تعذّر فحص هذا الضابط على قاعدة الهدف، لذلك لم يُفترض نجاحه.'
  return [
    { id: 'rls', title: 'RLS على جداول التطبيق العامة', detail: reason, status: 'unverified' },
    { id: 'admin-aal2', title: 'سياسة الدخول والصلاحيات الإدارية', detail: reason, status: 'unverified' },
    { id: 'private-storage', title: 'خصوصية إثباتات الدفع والمحتوى المحمي', detail: reason, status: 'unverified' },
    { id: 'delivery', title: 'عقد التسليم المحمي 043', detail: reason, status: 'unverified' },
    { id: 'session-revocation', title: 'إلغاء جلسات الإدارة الذري', detail: reason, status: 'unverified' },
    { id: 'server-secret', title: 'تهيئة مفتاح الخادم', detail: hasSupabaseServerSecret() ? 'اسم متغير مفتاح الخادم مهيأ؛ لا تُقرأ أو تُعرض قيمته.' : 'اسم متغير مفتاح الخادم غير مهيأ في هذه البيئة.', status: hasSupabaseServerSecret() ? 'configured' : 'unverified' },
    { id: 'source-boundaries', title: 'حواجز التطبيق المصدرية', detail: 'فحص المصدر يثبت إعادة التحقق من السعر والصلاحية ومنع تسريب مفاتيح الخادم في حزمة المتصفح؛ هذا دليل محلي وليس اختبار مزود حيًا.', status: 'verified-local' },
  ]
}

export async function getAdminSecurityCenter(): Promise<SecurityCenter> {
  const emptyMetrics = { activeSessions: null, activeLockouts: null, failedLogins24h: null, events7d: null }
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) {
    return { state: 'unconfigured', checkedAt: null, checks: unavailableChecks('unconfigured'), metrics: emptyMetrics, events: [], eventsAvailable: false }
  }

  const admin = await requirePermission('system.view')
  if (!admin?.userId) {
    return { state: 'unavailable', checkedAt: null, checks: unavailableChecks('unavailable'), metrics: emptyMetrics, events: [], eventsAvailable: false }
  }

  const service = getServiceClient()
  const [{ data, error }, eventResult] = await Promise.all([
    service.rpc('get_admin_security_readiness', { p_actor_id: admin.userId }),
    service.from('admin_security_events').select('id,event,created_at').order('created_at', { ascending: false }).limit(50),
  ])

  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    const state = migrationMissing(error?.code, error?.message) ? 'migration-required' : 'unavailable'
    return {
      state,
      checkedAt: null,
      checks: unavailableChecks(state),
      metrics: emptyMetrics,
      events: eventResult.data ?? [],
      eventsAvailable: !eventResult.error,
    }
  }

  const row = data as ReadinessRow
  const tableCount = numberOrNull(row.public_table_count)
  const rlsCount = numberOrNull(row.rls_enabled_count)
  const missingTables = Array.isArray(row.rls_missing_tables) ? row.rls_missing_tables.filter((name): name is string => typeof name === 'string') : []
  const rlsPass = tableCount !== null && rlsCount === tableCount && missingTables.length === 0
  const storagePass = row.payment_proof_policy === true && row.protected_storage_policy === true && row.private_delivery_buckets === true

  const checks: SecurityCheck[] = [
    {
      id: 'rls', title: 'RLS على جداول التطبيق العامة', status: rlsPass ? 'verified-live' : 'failed',
      detail: rlsPass ? `${rlsCount?.toLocaleString('ar-EG')} من ${tableCount?.toLocaleString('ar-EG')} جدولًا عامًا مفعّل عليها RLS في قاعدة الهدف.` : `وجد الفحص ${missingTables.length.toLocaleString('ar-EG')} جدولًا عامًا بلا RLS: ${missingTables.join('، ') || 'تعذّر تحديدها'}.`,
    },
    {
      id: 'admin-aal2', title: 'سياسة الدخول والصلاحيات الإدارية', status: row.admin_assurance_policy === true ? 'verified-live' : 'failed',
      detail: row.admin_assurance_policy === true ? 'السياسة المقيدة المطلوبة موجودة على admin_roles في قاعدة الهدف.' : 'لم يجد الفحص سياسة الدخول المقيدة المطلوبة على admin_roles.',
    },
    {
      id: 'private-storage', title: 'خصوصية إثباتات الدفع والمحتوى المحمي', status: storagePass ? 'verified-live' : 'failed',
      detail: storagePass ? 'الحاويات الخمس الخاصة وسياسات القراءة/الإدارة المطلوبة موجودة في قاعدة الهدف.' : 'حاوية خاصة أو سياسة Storage مطلوبة غير مثبتة على قاعدة الهدف.',
    },
    {
      id: 'delivery', title: 'عقد التسليم المحمي 043', status: row.protected_delivery_contract === true ? 'verified-live' : 'failed',
      detail: row.protected_delivery_contract === true ? 'جداول الفحص/الأحداث وRPC القبول موجودة في قاعدة الهدف.' : 'عقد 043 الكامل غير موجود على قاعدة الهدف؛ لا يُعاد تطبيق 043 على Production.',
    },
    {
      id: 'session-revocation', title: 'إلغاء جلسات الإدارة الذري', status: row.atomic_session_revocation === true ? 'verified-live' : 'failed',
      detail: row.atomic_session_revocation === true ? 'إلغاء الجلسة والتدقيق والحدث الأمني ينفذ داخل معاملة واحدة.' : 'تعذّر إثبات عقد الإلغاء الذري.',
    },
    { id: 'server-secret', title: 'تهيئة مفتاح الخادم', detail: 'اسم متغير مفتاح الخادم مهيأ؛ القيمة لا تُقرأ ولا تُعرض في مركز الأمان.', status: 'configured' },
    { id: 'source-boundaries', title: 'حواجز التطبيق المصدرية', detail: 'فحص المصدر يثبت إعادة التحقق من السعر والصلاحية ومنع تسريب مفاتيح الخادم في حزمة المتصفح؛ هذا دليل محلي مستقل عن المزود.', status: 'verified-local' },
  ]

  return {
    state: 'verified-live',
    checkedAt: typeof row.checked_at === 'string' ? row.checked_at : null,
    checks,
    metrics: {
      activeSessions: numberOrNull(row.active_sessions),
      activeLockouts: numberOrNull(row.active_lockouts),
      failedLogins24h: numberOrNull(row.failed_logins_24h),
      events7d: numberOrNull(row.security_events_7d),
    },
    events: eventResult.data ?? [],
    eventsAvailable: !eventResult.error,
  }
}
