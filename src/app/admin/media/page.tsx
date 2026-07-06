export const dynamic = 'force-dynamic'

import { AdminPageHeader, AdminPanel, EmptyState, MetricCard } from '@/components/admin/OperationsUI'

const metrics = [{ label: 'عام', value: 'public-media', hint: 'V8 OS' },{ label: 'خاص', value: 'protected buckets', hint: 'V8 OS' },{ label: 'ALT', value: 'مطلوب', hint: 'V8 OS' }]
const actions = ['تصنيف الصور','منع حذف ملف مستخدم','إضافة alt text لكل صورة مهمة']

export default function AdminMediaPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader title="مكتبة الوسائط" description="رفع وتنظيم الصور والملفات العامة مع حماية الملفات المدفوعة داخل Supabase Storage." />
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
