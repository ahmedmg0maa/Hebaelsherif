export const dynamic = 'force-dynamic'

import { AdminPageHeader, AdminPanel, EmptyState, MetricCard } from '@/components/admin/OperationsUI'

const metrics = [{ label: 'Owner', value: 'محمي', hint: 'V8 OS' },{ label: 'Roles', value: 'granular', hint: 'V8 OS' },{ label: 'Audit', value: 'إجباري', hint: 'V8 OS' }]
const actions = ['owner فقط يعدل owner','viewer قراءة فقط','finance يراجع المدفوعات فقط']

export default function AdminRolesPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader title="الأدوار والصلاحيات" description="الأمان الحقيقي يبدأ من صلاحيات مفروضة من السيرفر وليس إخفاء الأزرار فقط." />
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone="gold" />)}
      </div>
      <AdminPanel title="خطة التشغيل" description="هذه الصفحة جزء من Admin OS V8؛ تعرض ما يجب إدارته وتمنع وجود أقسام غير مفهومة أو فارغة.">
        <div className="grid gap-4 md:grid-cols-3">
          {actions.map((action, index) => (
            <article key={action} className="rounded-2xl border border-sand bg-cream/70 p-5">
              <span className="latin-numerals flex h-9 w-9 items-center justify-center rounded-full bg-petrol text-sm font-black text-ivory">{index + 1}</span>
              <p className="mt-4 text-sm font-black leading-7 text-charcoal">{action}</p>
            </article>
          ))}
        </div>
      </AdminPanel>
      <AdminPanel title="حالة الربط" description="لا يتم عرض بيانات وهمية؛ عند ربط Supabase ستظهر البيانات التشغيلية في الجداول والتقارير.">
        <EmptyState title="جاهز للربط التشغيلي" description="البنية والواجهة جاهزتان. المرحلة التالية تربط الجداول والـ RPCs الخاصة بهذا القسم ضمن دورة التنفيذ المحددة." />
      </AdminPanel>
    </div>
  )
}
