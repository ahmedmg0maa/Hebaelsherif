import { PageHero } from '@/components/catalog/PageHero'
import { ContactForm } from '@/components/contact/ContactForm'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { hasSupabaseServerSecret } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default function ContactPage() {
  const configured = hasSupabasePublicConfig() && hasSupabaseServerSecret()

  return (
    <main>
      <PageHero
        eyebrow="التواصل"
        title="نسمعك باهتمام"
        lead="اختاري غرض الرسالة بوضوح. تُحفظ في مركز المتابعة الآمن ولا نعد بزمن استجابة غير منشور."
      />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <ContactForm configured={configured} />
      </div>
    </main>
  )
}
