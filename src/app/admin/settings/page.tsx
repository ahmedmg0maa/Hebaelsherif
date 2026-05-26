export const dynamic = 'force-dynamic'

import { AdminPageHeader } from '@/components/admin/OperationsUI'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: 'بيانات الموقع الأساسية',
    description: 'إعدادات عامة لها أثر على هوية الموقع وروابطه الأساسية.',
    fields: [
      { key: 'brandNameAr', label: 'اسم البراند بالعربي', type: 'text', defaultValue: 'هبة الشريف' },
      { key: 'brandNameEn', label: 'اسم البراند بالإنجليزية', type: 'text', defaultValue: 'Heba ElSherif' },
      { key: 'siteUrl', label: 'رابط الموقع النهائي', type: 'url', placeholder: 'https://hebaelsherif.com', wide: true },
      { key: 'tagline', label: 'الجملة المختصرة', type: 'text', defaultValue: 'رحلة وعي تعيدك إلى ذاتك', wide: true },
      { key: 'brandPromise', label: 'وعد البراند', type: 'textarea', defaultValue: 'مساحة عربية هادئة للتعلم العاطفي والجلسات الفردية والكتب الرقمية.', wide: true },
    ],
  },
  {
    title: 'بيانات التواصل',
    description: 'البيانات التي يستخدمها فريق التشغيل للرد والمتابعة.',
    fields: [
      { key: 'supportEmail', label: 'بريد الدعم', type: 'email', placeholder: 'support@example.com' },
      { key: 'whatsappNumber', label: 'رقم WhatsApp', type: 'text', placeholder: '+20...' },
      { key: 'phoneNumber', label: 'رقم الهاتف', type: 'text', placeholder: '+20...' },
      { key: 'instagramUrl', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/...' },
      { key: 'facebookUrl', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/...' },
      { key: 'contactResponseTime', label: 'مدة الرد المتوقعة', type: 'text', defaultValue: 'خلال 24 إلى 48 ساعة عمل' },
    ],
  },
  {
    title: 'طرق الدفع اليدوي',
    description: 'تعليمات الدفع التي تظهر للعميلة أو يستخدمها فريق التشغيل عند مراجعة الطلبات.',
    fields: [
      { key: 'instapayHandle', label: 'Instapay', type: 'text', placeholder: 'name@instapay' },
      { key: 'walletNumber', label: 'محفظة إلكترونية', type: 'text', placeholder: '01xxxxxxxxx' },
      { key: 'bankTransferDetails', label: 'بيانات التحويل البنكي', type: 'textarea', placeholder: 'اسم الحساب / البنك / رقم الحساب', wide: true },
      { key: 'paymentInstructions', label: 'تعليمات الدفع', type: 'textarea', defaultValue: 'بعد الدفع، أرسلي مرجع العملية من صفحة الطلبات حتى يتم تأكيد الدفع وفتح المحتوى.', wide: true },
    ],
  },
  {
    title: 'إعدادات الحجز',
    description: 'إعدادات تشغيلية للجلسات تساعد الفريق على توحيد الرسائل والأسعار.',
    fields: [
      { key: 'bookingEnabled', label: 'تفعيل الحجز', type: 'toggle', defaultValue: true },
      { key: 'session60Price', label: 'سعر جلسة 60 دقيقة', type: 'number', defaultValue: 0 },
      { key: 'session90Price', label: 'سعر جلسة 90 دقيقة', type: 'number', defaultValue: 0 },
      { key: 'workingDays', label: 'أيام العمل', type: 'lines', defaultValue: `الأحد\nالإثنين\nالثلاثاء\nالأربعاء\nالخميس`, wide: true },
      { key: 'bookingConfirmationMessage', label: 'رسالة تأكيد الحجز', type: 'textarea', defaultValue: 'تم استلام طلب الحجز وسيتم مراجعته وتأكيد تفاصيل الجلسة قريبًا.', wide: true },
    ],
  },
  {
    title: 'SEO والظهور',
    description: 'إعدادات أساسية لا تغني عن metadata الديناميكية لكنها تضبط الافتراضيات العامة.',
    fields: [
      { key: 'defaultSeoTitle', label: 'عنوان SEO الافتراضي', type: 'text', defaultValue: 'هبة الشريف | رحلة وعي تعيدك إلى ذاتك', wide: true },
      { key: 'defaultSeoDescription', label: 'وصف SEO الافتراضي', type: 'textarea', defaultValue: 'منصة عربية هادئة للكوتشنج، التعلم العاطفي، الكتب الرقمية، والجلسات الفردية.', wide: true },
      { key: 'googleSiteVerification', label: 'Google Site Verification', type: 'text', placeholder: 'verification-code', wide: true },
      { key: 'showCourses', label: 'إظهار الكورسات', type: 'toggle', defaultValue: true },
      { key: 'showBooks', label: 'إظهار الكتب', type: 'toggle', defaultValue: true },
      { key: 'showBooking', label: 'إظهار الحجز', type: 'toggle', defaultValue: true },
      { key: 'maintenanceMode', label: 'وضع الصيانة', type: 'toggle', defaultValue: false },
    ],
  },
] satisfies AdminControlSection[]

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="الإعدادات التشغيلية"
        description="إعدادات قليلة لكنها مؤثرة: بيانات الموقع، التواصل، الدفع، الحجز، والـ SEO الأساسي. لا توجد إعدادات ديكور بلا أثر."
      />
      <AdminSettingsConsole collectionName="site_settings" documentId="operations" sections={sections} successMessage="تم حفظ إعدادات التشغيل بنجاح." />
    </div>
  )
}
