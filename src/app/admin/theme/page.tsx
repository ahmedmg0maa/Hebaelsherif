import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [{ title: 'ألوان وهوية', description: 'تخصيص الإحساس العام.', fields: [{ key: 'activePalette', label: 'لوحة الألوان', type: 'select', options: [{label: 'Brand Kit', value: 'brand'},{label: 'Warm editorial', value: 'editorial'},{label: 'Deep calm', value: 'deep'}], defaultValue: 'brand' }, { key: 'defaultTheme', label: 'الوضع الافتراضي', type: 'select', options: [{label: 'فاتح', value: 'light'},{label: 'داكن', value: 'dark'},{label: 'حسب الجهاز', value: 'system'}], defaultValue: 'light' }, { key: 'enableAmbientMotion', label: 'حركة الخلفية', type: 'toggle', defaultValue: true }, { key: 'enableCardMotion', label: 'حركة الكروت', type: 'toggle', defaultValue: true }, { key: 'grainIntensity', label: 'قوة الملمس', type: 'number', defaultValue: 18 }, { key: 'sectionDensity', label: 'كثافة المساحات', type: 'select', options: [{label: 'واسعة', value: 'spacious'},{label: 'متوسطة', value: 'balanced'},{label: 'مضغوطة', value: 'compact'}], defaultValue: 'spacious' }] }, { title: 'أماكن الصور', description: 'روابط الصور التي يمكن تغييرها لاحقًا.', fields: [{ key: 'homeHeroImage', label: 'Hero image', type: 'url', wide: true }, { key: 'aboutPortrait', label: 'About portrait', type: 'url', wide: true }, { key: 'sessionVisual', label: 'Session visual', type: 'url', wide: true }, { key: 'courseDefaultCover', label: 'Course default cover', type: 'url', wide: true }, { key: 'bookDefaultCover', label: 'Book default cover', type: 'url', wide: true }, { key: 'ogDefaultImage', label: 'OG default image', type: 'url', wide: true }] }] satisfies AdminControlSection[]

export default function AdminGeneratedPage() {
  return (
    <AdminPageShell eyebrow='الثيم والهوية' title='تحكمات بصرية لا تحتاج تعديل كود' description="تحكمات قابلة للحفظ في Firestore حتى يمكن تعديل التجربة بدون الرجوع للكود.">
      <AdminSettingsConsole collectionName="admin_theme_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
