import Link from 'next/link'
import { AdminPageHeader, AdminPanel, EmptyState } from '@/components/admin/OperationsUI'

export const dynamic = 'force-dynamic'

export default function AdminRetiredSectionPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="قسم غير مفعل في مركز التشغيل"
        description="تم إخفاء الصفحات العامة أو الافتراضية من الأدمن لأن النسخة الحالية تركز فقط على الأدوات التشغيلية الحقيقية."
      />
      <AdminPanel title="لماذا تم إخفاء هذه الصفحة؟" description="الأدمن الجديد لا يعرض واجهات لا تملك أثرًا تشغيليًا واضحًا.">
        <EmptyState
          title="هذه الصفحة مؤجلة"
          description="تم نقل الوظائف الأساسية إلى الطلبات، الحجوزات، الكورسات، الكتب، المحتوى المحمي، العملاء، الرسائل، التحليلات، السجلات، والإعدادات."
          action={<Link href="/admin" className="rounded-full bg-gold px-5 py-3 text-xs font-black text-deepTeal">العودة إلى لوحة التشغيل</Link>}
        />
      </AdminPanel>
    </div>
  )
}
