export const dynamic = 'force-dynamic'

import { AdminPageHeader, AdminPanel, EmptyState, MetricCard } from '@/components/admin/OperationsUI'

const metrics = [{ label: 'Revenue', value: 'شهري', hint: 'V8 OS' },{ label: 'LMS', value: 'progress', hint: 'V8 OS' },{ label: 'Offers', value: 'performance', hint: 'V8 OS' }]
const actions = ['تقرير الإيرادات حسب المنتج','تقرير إتمام الدروس','تقرير أداء العروض والكوبونات']

export default function AdminReportsPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader title="التقارير والذكاء التشغيلي" description="صحة الإيرادات، تقدم التعلم، أداء المنتجات، والكوبونات في مكان واحد." />
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
