import { listCourses, listServices, formatPrice, formatDuration } from '@/lib/data/catalog'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CatalogCoverImage } from '@/components/catalog/CatalogCoverImage'

// Uses the same publication filters as the catalog. Admin edits, publication
// and hiding invalidate this page through revalidateCatalogMutation.
export async function PublishedCatalog() {
  const [services, courses] = await Promise.all([listServices(), listCourses()])
  const items = [
    ...services.slice(0, 2).map(s => ({ ...s, href: `/booking?service=${encodeURIComponent(s.slug)}`, label: 'اختاري موعد الجلسة', kind: 'جلسة فردية' })),
    ...courses.slice(0, 2).map(c => ({ ...c, href: `/courses/${c.slug}`, label: c.price === 0 ? 'ابدئي التعلّم مجانًا' : 'تفاصيل الدورة', kind: 'تعلّم بإيقاعك' })),
  ]
  if (!items.length) return null
  return <Section eyebrow="متاح الآن" title="خطوتك التالية تبدأ من هنا" lead="محتوى وجلسات منشورة يمكنكِ فتح تفاصيلها والبدء بها الآن.">
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map(item => <Card key={item.href} className="flex flex-col gap-4">
        <CatalogCoverImage url={item.coverUrl} title={item.title} className="aspect-[16/9] w-full" />
        <p className="text-sm font-semibold text-burgundy">{item.kind}</p>
        <h3 className="text-xl font-bold leading-relaxed text-deep-teal">{item.title}</h3>
        <p className="line-clamp-3 text-sm leading-loose text-text-soft">{item.description}</p>
        <p className="tnum mt-auto font-semibold text-deep-teal">{item.price === 0 ? 'مجاني' : formatPrice(item.price)} · {formatDuration(item.durationMinutes)}</p>
        <Button href={item.href} variant="secondary">{item.label}</Button>
      </Card>)}
    </div>
  </Section>
}
