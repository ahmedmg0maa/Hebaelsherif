import type { Metadata } from 'next'
import { adminPagedList,type AdminPageQuery } from '@/lib/data/admin-pagination'
import { AdminListTools } from '@/components/admin/AdminListTools'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

export const metadata: Metadata = { title: 'سجل التدقيق — الإدارة' }

type Row = { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function tone(action: string): 'success' | 'danger' | 'pending' | 'cobalt' {
  if (/approved|created|granted|enabled|published/.test(action)) return 'success'
  if (/rejected|deleted|revoked|cancelled|refunded/.test(action)) return 'danger'
  if (/expired|disabled|unpublished/.test(action)) return 'pending'
  return 'cobalt'
}

export default async function AdminAuditLogsPage({searchParams}:{searchParams:Promise<AdminPageQuery>}) {
  const query=await searchParams
  const result=await adminPagedList<Row>('audit_logs','id,actor_id,action,entity_type,entity_id,created_at',query,{searchColumn:'action',statusColumn:'entity_type',statuses:['page','page_section','article','course','book','service','order','payment','media_asset','subscription']})
  const logs=result.rows

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">سجل التدقيق</h1>
        <p className="mt-1 text-text-soft">سجل العمليات محفوظ؛ تصفحي الأحداث القديمة أو ابحثي بنوع الإجراء.</p>
      </header>
      <AdminListTools result={result} query={query} label="سجل العمليات" searchLabel="بحث بنوع الإجراء" example="page.saved لعمليات حفظ الصفحات" statuses={[{value:'page',label:'صفحة'},{value:'page_section',label:'قسم صفحة'},{value:'article',label:'مقال'},{value:'course',label:'كورس'},{value:'book',label:'كتاب'},{value:'service',label:'خدمة'},{value:'order',label:'طلب'},{value:'payment',label:'دفعة'},{value:'media_asset',label:'وسائط'},{value:'subscription',label:'اشتراك'}]}/>

      {logs.length === 0 ? (
        <EmptyState title="السجل فارغ" description="تُسجَّل هنا الموافقات والرفض والمنح وكل تغييرات الإدارة تلقائيًا." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>الحدث</TH>
              <TH>الكيان</TH>
              <TH>الوقت</TH>
            </tr>
          </THead>
          <TBody>
            {logs.map((l) => (
              <TR key={l.id}>
                <TD>
                  <Badge tone={tone(l.action)}>
                    <span dir="ltr">{l.action}</span>
                  </Badge>
                </TD>
                <TD>
                  <span dir="ltr" className="text-xs text-taupe">
                    {l.entity_type}
                    {l.entity_id ? ` · ${l.entity_id.slice(0, 8)}…` : ''}
                  </span>
                </TD>
                <TD>{dateFmt.format(new Date(l.created_at))}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
