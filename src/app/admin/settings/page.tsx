export const dynamic = 'force-dynamic'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "الهوية والرسالة",
    description: "تثبيت شخصية البراند كما في Brand Kit: الهدوء، العمق، الثقة، والفخامة العربية.",
    fields: [
      {key: "brandNameAr", label: "اسم البراند بالعربي", type: "text", defaultValue: "هبة الشريف"},
      {key: "brandNameEn", label: "اسم البراند بالإنجليزية", type: "text", defaultValue: "Heba ElSherif"},
      {key: "tagline", label: "جملة قصيرة", type: "text", defaultValue: "رحلة هادئة نحو الوضوح العاطفي", wide: true},
      {key: "brandPromise", label: "وعد البراند", type: "textarea", defaultValue: "مساحة رقمية فاخرة وهادئة تساعد المرأة على فهم ذاتها، تهدئة داخلها، وبناء تحول شخصي ناضج.", wide: true},
      {key: "toneOfVoice", label: "نبرة الصوت", type: "select", options: [{label: "هادئة وواثقة",value: "calm-confident"},{label: "عميقة ومرشدة",value: "sage"},{label: "دافئة ومطمئنة",value: "caregiver"}], defaultValue: "calm-confident"},
      {key: "avoidLanguage", label: "لغة يجب تجنبها", type: "lines", defaultValue: "الاستعجال المزيف\nالبيع الصاخب\nالمبالغة التحفيزية\nالوعود غير الواقعية", wide: true}
    ],
  },
  {
    title: "الصفحة الرئيسية",
    description: "تحكم سريع في نصوص الـ Hero والأقسام الأساسية المعروضة للزوار.",
    fields: [
      {key: "homeHeroEyebrow", label: "Hero eyebrow", type: "text", defaultValue: "منصة عربية للتحول العاطفي"},
      {key: "homeHeroTitle", label: "عنوان Hero", type: "text", defaultValue: "رحلتك نحو حياة أكثر سلامًا ووعيًا وامتلاءً", wide: true},
      {key: "homeHeroDescription", label: "وصف Hero", type: "textarea", defaultValue: "كورسات، كتب رقمية، وجلسات خاصة تساعدك على فهم نفسك وبناء حدود صحية في تجربة فاخرة وهادئة ومحمية.", wide: true},
      {key: "primaryCtaLabel", label: "زر أساسي", type: "text", defaultValue: "استكشفي الكورسات"},
      {key: "secondaryCtaLabel", label: "زر ثانوي", type: "text", defaultValue: "احجزي جلستك الآن"},
      {key: "showTestimonials", label: "عرض التقييمات في الرئيسية", type: "toggle", defaultValue: true},
      {key: "showLeadMagnet", label: "عرض نموذج الاشتراك", type: "toggle", defaultValue: true}
    ],
  },
  {
    title: "أماكن الصور",
    description: "اتركيها فارغة حتى تتوفر روابط صور معتمدة من Drive أو CDN أو Firebase Storage.",
    fields: [
      {key: "heroImageUrl", label: "صورة Hero", type: "url", placeholder: "https://...", wide: true},
      {key: "aboutImageUrl", label: "صورة عن هبة", type: "url", placeholder: "https://...", wide: true},
      {key: "sessionImageUrl", label: "صورة الجلسات", type: "url", placeholder: "https://...", wide: true},
      {key: "defaultCourseImageUrl", label: "صورة افتراضية للكورسات", type: "url", placeholder: "https://...", wide: true},
      {key: "defaultBookImageUrl", label: "صورة افتراضية للكتب", type: "url", placeholder: "https://...", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="مركز التحكم"
      title="إعدادات البراند والموقع"
      description="كل النصوص الأساسية، نبرة البراند، أقسام الصفحة الرئيسية، وأماكن الصور يمكن التحكم بها من هنا بدون تعديل الكود."
    >
      <AdminSettingsConsole
        collectionName="site_settings"
        documentId="global"
        sections={sections}
      />
    </AdminPageShell>
  )
}
