import type { Metadata } from 'next'
import { adminList } from '@/lib/data/cms'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { RevisionRestoreButton } from '@/components/admin/RevisionRestoreButton'

export const metadata: Metadata = { title: 'مراجعات المحتوى — الإدارة' }
type RevisionRow = { id: string; entity_type: string; entity_id: string; snapshot: unknown; created_at: string }
const labels: Record<string, string> = { page: 'صفحة', page_section: 'قسم صفحة', article: 'مقال' }
const dateFmt = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' })
const record = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

export default async function AdminRevisionsPage() {
  const rows = (await adminList<RevisionRow>('content_revisions', 'id,entity_type,entity_id,snapshot,created_at', { orderBy: 'created_at', limit: 200 }))
    .filter((row) => row.entity_type in labels)
  return <div className="mx-auto max-w-5xl space-y-8">
    <header><h1 className="text-3xl font-bold text-deep-teal">مراجعات المحتوى</h1><p className="mt-1 leading-loose text-text-soft">آخر النسخ السابقة للصفحات والمقالات والأقسام. الاستعادة محمية بإعادة تحقق MFA وتعود دائمًا كمسودة أو قسم مخفي.</p></header>
    {rows.length === 0 ? <EmptyState title="لا مراجعات قابلة للاستعادة" description="تظهر النسخ السابقة هنا بعد أول تعديل على صفحة أو مقال أو قسم." /> : <Table><THead><tr><TH>النوع والمحتوى</TH><TH>وقت الحفظ</TH><TH>الاستعادة</TH></tr></THead><TBody>{rows.map((row) => { const snapshot = record(row.snapshot); const title = String(snapshot.title ?? snapshot.name ?? snapshot.slug ?? 'نسخة محتوى'); return <TR key={row.id}><TD><Badge tone="cobalt">{labels[row.entity_type]}</Badge><p className="mt-2 max-w-md truncate font-semibold text-deep-teal">{title}</p><p dir="ltr" className="mt-1 text-xs text-taupe">{row.entity_id.slice(0, 8)}…</p></TD><TD>{dateFmt.format(new Date(row.created_at))}</TD><TD><RevisionRestoreButton id={row.id}/></TD></TR> })}</TBody></Table>}
  </div>
}

