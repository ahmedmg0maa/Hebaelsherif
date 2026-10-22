'use client'

import { useMemo, useState } from 'react'
import type { CatalogCourse } from '@/lib/data/catalog'
import { formatDuration } from '@/lib/format'
import { lessonsLabel } from '@/lib/format'
import { normalizeArabicSearch } from '@/lib/search/normalize'
import { ProductCard } from './ProductCard'

const levelLabels: Record<string, string> = { all: 'كل المستويات', beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' }

export function CourseLibrary({ courses }: { courses: CatalogCourse[] }) {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [sort, setSort] = useState('featured')
  const filtered = useMemo(() => {
    const normalized = normalizeArabicSearch(query)
    return courses
      .filter((course) => (level === 'all' || course.level === level) && (!normalized || normalizeArabicSearch(`${course.title} ${course.subtitle} ${course.description}`).includes(normalized)))
      .toSorted((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : sort === 'duration' ? a.durationMinutes - b.durationMinutes : 0)
  }, [courses, level, query, sort])

  return <div className="mx-auto max-w-5xl">
    {courses.length > 1 && <div className="mb-8 grid gap-3 rounded-2xl border border-line bg-surface-raised p-4 shadow-card md:grid-cols-[1fr_180px_200px]">
      <label><span className="sr-only">البحث في الدورات</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحثي باسم الدورة أو موضوعها…" className="min-h-12 w-full rounded-xl border border-line bg-ivory px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt" /></label>
      <label><span className="sr-only">تصفية المستوى</span><select value={level} onChange={(event) => setLevel(event.target.value)} className="min-h-12 w-full rounded-xl border border-line bg-ivory px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"><option value="all">كل المستويات</option>{['beginner','intermediate','advanced'].map((value) => <option key={value} value={value}>{levelLabels[value]}</option>)}</select></label>
      <label><span className="sr-only">ترتيب الدورات</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-12 w-full rounded-xl border border-line bg-ivory px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"><option value="featured">الترتيب المقترح</option><option value="price-low">السعر: الأقل أولًا</option><option value="price-high">السعر: الأعلى أولًا</option><option value="duration">المدة: الأقصر أولًا</option></select></label>
    </div>}
    <p role="status" className="mb-4 text-sm text-text-soft">{filtered.length.toLocaleString('ar-EG')} نتيجة</p>
    {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-line bg-surface-raised p-10 text-center text-text-soft">لا توجد دورات منشورة مطابقة لهذه التصفية.<button type="button" className="mx-auto mt-4 block min-h-12 font-bold text-deep-teal underline" onClick={() => { setQuery(''); setSort('featured'); setLevel('all') }}>إعادة ضبط البحث والتصفية</button></div> : <div className="grid gap-8 md:grid-cols-2">{filtered.map((course) => <ProductCard
      key={course.slug}
      href={`/courses/${course.slug}`}
      title={course.title}
      subtitle={course.subtitle}
      description={course.description}
      price={course.price}
      compareAtPrice={course.compareAtPrice}
      coverKind="course"
      coverUrl={course.coverUrl}
      badge={course.isPreviewExperience ? { label: 'تجربة تفاعلية', tone: 'cobalt' } : course.compareAtPrice ? { label: 'سعر مخفّض', tone: 'burgundy' } : undefined}
      rating={{ value: course.rating, count: course.ratingCount }}
      meta={[levelLabels[course.level] ?? course.level, lessonsLabel(course.lessonsCount), formatDuration(course.durationMinutes), course.isPreviewExperience ? 'تقدّم مؤقت بلا حساب' : 'وصول محفوظ داخل حسابك']}
      priceLabel={course.isPreviewExperience ? 'تجربة مجانية' : undefined}
      ctaLabel={course.isPreviewExperience ? 'ابدئي الكورس' : undefined}
    />)}</div>}
  </div>
}
