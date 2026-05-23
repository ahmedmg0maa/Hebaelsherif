import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "الهيدر",
    description: "روابط القائمة العلوية.",
    fields: [
      {key: "headerLinks", label: "روابط الهيدر", type: "lines", defaultValue: "الرئيسية | /\nالخدمات | /services\nالدورات | /courses\nالكتب | /books\nالجلسات | /booking\nالمقالات | /articles\nعن هبة | /about", wide: true},
      {key: "headerPrimaryCta", label: "زر الهيدر الأساسي", type: "text", defaultValue: "ابدئي رحلتك"},
      {key: "headerPrimaryHref", label: "رابط الزر الأساسي", type: "text", defaultValue: "/courses"}
    ],
  },
  {
    title: "الفوتر",
    description: "روابط الفوتر ومحتواه.",
    fields: [
      {key: "footerDescription", label: "وصف الفوتر", type: "textarea", defaultValue: "منصة عربية فاخرة للتحول العاطفي والنمو الشخصي.", wide: true},
      {key: "footerLinks", label: "روابط الفوتر", type: "lines", defaultValue: "سياسة الخصوصية | /privacy\nالشروط والأحكام | /terms\nسياسة الاسترجاع | /refund-policy\nسياسة الجلسات | /session-policy\nتواصل | /contact", wide: true},
      {key: "showFooterNewsletter", label: "عرض الاشتراك في الفوتر", type: "toggle", defaultValue: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="القوائم والروابط"
      title="تحكم في القوائم ونداءات الفعل"
      description="إدارة الروابط والنصوص التي تظهر في الهيدر والفوتر والـ CTA من مكان واحد."
    >
      <AdminSettingsConsole
        collectionName="navigation_settings"
        documentId="global"
        sections={sections}
      />
    </AdminPageShell>
  )
}
