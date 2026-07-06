export const dynamic = 'force-dynamic'

import { AdminPageHeader, AdminPanel, EmptyState, MetricCard } from '@/components/admin/OperationsUI'

const metrics = [{ label: 'الأنواع', value: 'Book / Course / Workshop / Session', hint: 'V8 OS' },{ label: 'الدفع', value: 'Checkout موحد', hint: 'V8 OS' },{ label: 'الوصول', value: 'Content Access محمي', hint: 'V8 OS' }]
const actions = ['إنشاء product record لكل عنصر قابل للبيع','ربط السعر والعرض والكوبون بنفس النظام','منع فتح المحتوى إلا بعد payment approved أو grant يدوي']

export default function AdminProductsPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader title="كتالوج المنتجات الموحد" description="كل الكتب والكورسات والورش والجلسات والباقات يجب أن تُدار من طبقة Product واحدة حتى لا يتكرر منطق الدفع والوصول." />
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
