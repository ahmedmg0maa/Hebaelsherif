import type { Metadata } from 'next'
import { listBooks } from '@/lib/data/catalog'
import { PageHero } from '@/components/catalog/PageHero'
import { CTARibbon } from '@/components/catalog/CTARibbon'
import { BookLibrary } from '@/components/catalog/BookLibrary'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = {
  title: 'الكتب الرقمية',
  description: 'إصدارات رقمية منشورة مع تفاصيل واضحة للوصول والمحتوى.',
}

export const revalidate = 300

export default async function BooksPage() {
  const books = await listBooks()

  return (
    <main>
      <PageHero
        eyebrow="الكتب الرقمية"
        title="كتب تُقرأ بالقلم، لا بالعين فقط"
        lead="اختاري قراءة على إيقاعكِ. تعرفي على موضوع كل كتاب ومحتواه وطريقة الوصول إليه قبل الشراء."
      />

      <Section eyebrow="المكتبة" title="إصداراتنا">
        {books.length === 0 && (
          <EmptyState
            title="المكتبة قيد التجهيز"
            description="لا توجد كتب متاحة حاليًا. يمكنكِ البدء بالمقالات أو استكشاف المسارات الأخرى."
            actionLabel="اقرئي المقالات"
            actionHref="/articles"
          />
        )}
        {books.length > 0 && <BookLibrary books={books} />}
      </Section>

      <CTARibbon
        title="تفضّلين التعلم بالفيديو؟"
        lead="استكشفي دوراتنا التدريبية المعمقة."
        ctaLabel="تصفّحي الدورات"
        ctaHref="/courses"
      />
    </main>
  )
}
