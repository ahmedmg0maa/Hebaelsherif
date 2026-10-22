import { requireFreshAdminAssurance } from '@/lib/auth/permissions'
import { getAdminLoginHistory } from '@/lib/data/admin-login-history'
import { getServiceClient } from '@/lib/supabase/server'

function csv(value: unknown) {
  const raw = String(value ?? '')
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  const text = neutralized.replaceAll('"', '""')
  return `"${text}"`
}

export async function GET(request: Request) {
  const admin = await requireFreshAdminAssurance('audit.view')
  if (!admin?.userId) return new Response('Fresh MFA required', { status: 403 })
  const url = new URL(request.url)
  const history = await getAdminLoginHistory({
    event: url.searchParams.get('event') ?? undefined,
    outcome: url.searchParams.get('outcome') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    limit: 5_000,
  })
  if (history.state !== 'ready') return new Response('Login history unavailable', { status: 503 })
  const headings = ['event_id','admin_name','admin_email','roles','event','outcome','device','aal','session_reference','fingerprint_reference','request_id','reason','created_at_utc']
  const lines = [headings.map(csv).join(','), ...history.rows.map((row) => [
    row.id, row.actorName, row.actorEmail, row.actorRoles.join('|'), row.event, row.outcome, row.deviceLabel, row.aal,
    row.sessionReference, row.fingerprintReference, row.requestId, row.reason, row.createdAt,
  ].map(csv).join(','))]
  const { error } = await getServiceClient().from('audit_logs').insert({
    actor_id: admin.userId,
    action: 'admin_login_history.exported',
    entity_type: 'admin_security_event',
    entity_id: null,
    meta: { rowCount: history.rows.length, truncated: history.total > history.rows.length, pii: true },
  })
  if (error) return new Response('Audit confirmation unavailable', { status: 503 })
  return new Response(`\uFEFF${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="admin-login-history-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
