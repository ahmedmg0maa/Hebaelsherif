import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "الشخصية والنبرة",
    description: "اجعلي المساعد مرشدًا هادئًا وليس bot بيعي.",
    fields: [
      {key: "assistantName", label: "اسم المساعد", type: "text", defaultValue: "مرشد الرحلة"},
      {key: "assistantIntro", label: "مقدمة المساعد", type: "textarea", defaultValue: "أنا هنا لأساعدك بهدوء على اختيار بداية مناسبة: كورس، كتاب، أو جلسة.", wide: true},
      {key: "assistantTone", label: "نبرة المساعد", type: "select", options: [{label: "هادئة",value: "calm"},{label: "عميقة",value: "deep"},{label: "مطمئنة",value: "reassuring"}], defaultValue: "calm"},
      {key: "safetyDisclaimer", label: "رسالة الأمان", type: "textarea", defaultValue: "هذا التوجيه لا يقدم تشخيصًا أو علاجًا نفسيًا، لكنه يساعدك على اختيار المسار المناسب داخل المنصة.", wide: true}
    ],
  },
  {
    title: "الأسئلة الجاهزة",
    description: "كل سؤال في سطر.",
    fields: [
      {key: "starterQuestions", label: "أسئلة البداية", type: "lines", defaultValue: "لا أعرف من أين أبدأ\nأحتاج جلسة أم كورس؟\nأبحث عن كتاب يناسب مرحلتي\nأريد فهم علاقة مرهقة\nأريد تهدئة داخلي الآن", wide: true},
      {key: "recommendationRules", label: "قواعد الترشيح", type: "lines", defaultValue: "علاقة مرهقة => جلسة عميقة + كورس الحدود\nبداية عامة => كتاب تمهيدي + كورس رحلة إلى الذات\nقلق وتشتت => جلسة وضوح\nقراءة هادئة => كتاب رقمي", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="AI Guide"
      title="مساعد التوجيه الهادئ"
      description="تخصيص الأسئلة الجاهزة، قواعد الترشيح، ونبرة المساعد بدون API خارجي."
    >
      <AdminSettingsConsole
        collectionName="ai_guide_settings"
        documentId="default"
        sections={sections}
      />
    </AdminPageShell>
  )
}
