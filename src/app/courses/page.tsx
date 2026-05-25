'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CourseCard from '@/components/courses/CourseCard'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandOrnament from '@/components/brand/BrandOrnament'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import { CourseCardSkeleton } from '@/components/ui/PremiumSkeleton'
import { getPublishedCourses } from '@/lib/firestore/courses'
import { formatEGP } from '@/lib/utils/formatters'
import type { Course } from '@/types'

const guideSteps = [
  {
    title: 'ابدئي بفهم الذات',
    description: 'اختاري رحلة تمنحك وضوحًا حول احتياجاتك وحدودك.',
  },
  {
    title: 'تعلمي على مهل',
    description: 'كل درس مصمم ليكون مساحة تفكير وتطبيق لا مجرد مشاهدة.',
  },
  {
    title: 'احفظي تقدمك',
    description: 'تابعي من حيث توقفتِ داخل لوحة رحلتك الشخصية.',
  },
  {
    title: 'اطلبي دعمًا أعمق',
    description: 'اجمعي بين الكورس والجلسة الخاصة عند الحاجة لتوجيه مباشر.',
  },
]

const learningPromises = [
  'محتوى عميق وعملي بعيد عن الوعود السريعة',
  'رحلات مصممة للمرأة العربية بلغة هادئة وواضحة',
  'وصول محمي ومنظم داخل حسابك بعد تأكيد الطلب',
  'تمارين وأسئلة تساعدك على نقل الوعي إلى ممارسة يومية',
]

const sortOptions = [
  { label: 'الأحدث', value: 'newest' },
  { label: 'الأعلى تقييمًا', value: 'rating' },
  { label: 'الأقل سعرًا', value: 'price-low' },
]

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('الكل')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true)
        setError('')
        const publishedCourses = await getPublishedCourses()
        setCourses(publishedCourses)
      } catch (loadError) {
        console.error('Courses page error:', loadError)
        setCourses([])
        setError('')
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  const categories = useMemo(() => {
    const values = courses.map((course) => course.category).filter(Boolean) as string[]
    return ['الكل', ...Array.from(new Set(values))]
  }, [courses])

  const featuredCourse = courses[0]

  const filteredCourses = useMemo(() => {
    const searchTerm = query.trim().toLowerCase()

    const filtered = courses.filter((course) => {
      const matchesSearch =
        !searchTerm ||
        course.title.toLowerCase().includes(searchTerm) ||
        course.description.toLowerCase().includes(searchTerm) ||
        course.emotionalPromise?.toLowerCase().includes(searchTerm)

      const matchesCategory = activeCategory === 'الكل' || course.category === activeCategory

      return matchesSearch && matchesCategory
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
      if (sortBy === 'price-low') return a.price - b.price
      return 0
    })
  }, [activeCategory, courses, query, sortBy])

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="relative overflow-hidden border-b border-sand/80">
          <div className="ambient-orb ambient-orb-gold right-0 top-16 h-72 w-72" />
          <div className="ambient-orb ambient-orb-petrol bottom-0 left-10 h-72 w-72" />

          <div className="container-premium relative grid gap-10 py-14 lg:grid-cols-[1fr_390px] lg:items-center">
            <div>
              <p className="mini-label mb-4">الكورسات</p>
              <h1 className="max-w-4xl text-balance text-4xl font-black leading-tight text-charcoal md:text-6xl dark:text-ivory">
                اختاري مسارًا يعيدك إلى ذاتك بهدوء ووعي.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-9 text-warm-gray">
                كورسات مصممة كرحلات تعليمية عميقة، تجمع بين المعرفة، التطبيق، والأسئلة التي تساعدك على فهم نفسك وعلاقاتك بصورة أكثر اتزانًا.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PremiumButton href={featuredCourse ? `/courses/${featuredCourse.slug}` : '/start-here'} size="lg">
                  {featuredCourse ? 'ابدئي بأول مسار مناسب' : 'ابدئي من دليل البداية'}
                </PremiumButton>
                <PremiumButton href="/booking" variant="outline" size="lg">
                  أحتاج توجيهًا خاصًا
                </PremiumButton>
              </div>

              <div className="mt-9 grid max-w-3xl gap-3 sm:grid-cols-3">
                <HeroMetric value="محمي" label="يفتح المحتوى بعد تأكيد الطلب" />
                <HeroMetric value="متدرج" label="تعلم على مهل وبخطوات واضحة" />
                <HeroMetric value="خاص" label="مسار يناسب مرحلتك الحالية" />
              </div>
            </div>

            <aside className="premium-glow-border rounded-[2.25rem] border border-sand bg-ivory/86 p-6 shadow-premium backdrop-blur-md dark:bg-deep-teal/60">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-gold">دليل البداية</p>
                  <h2 className="mt-2 text-2xl font-black text-petrol">مسار مقترح لكِ</h2>
                </div>
                <BrandOrnament className="scale-75" />
              </div>

              <div className="mt-6 space-y-4">
                {guideSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-4 rounded-3xl border border-sand bg-cream/65 p-4 dark:bg-deep-teal/45">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/18 text-sm font-black text-petrol">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-charcoal dark:text-ivory">{step.title}</h3>
                      <p className="mt-1 text-xs leading-6 text-warm-gray">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <PremiumButton href="/booking" variant="burgundy" className="mt-6 w-full">
                ساعديني أختار مساري
              </PremiumButton>
            </aside>
          </div>
        </section>

        <section className="container-premium py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-8 rounded-[2rem] border border-sand bg-ivory/86 p-5 shadow-soft backdrop-blur-md dark:bg-deep-teal/50">
                <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px]">
                  <label className="relative block">
                    <span className="sr-only">البحث في الكورسات</span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="ابحثي عن كورس، مهارة، أو موضوع..."
                      className="premium-input h-12 pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-petrol">⌕</span>
                  </label>

                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="premium-input h-12">
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)} className="premium-input h-12">
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const active = category === activeCategory
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(category)}
                        className={`rounded-full px-4 py-2 text-xs font-black transition ${
                          active
                            ? 'bg-petrol text-ivory shadow-soft'
                            : 'border border-sand bg-cream/75 text-warm-gray hover:border-petrol/35 hover:text-petrol'
                        }`}
                      >
                        {category}
                      </button>
                    )
                  })}
                </div>
              </div>

              {loading ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <CourseCardSkeleton />
                  <CourseCardSkeleton />
                  <CourseCardSkeleton />
                  <CourseCardSkeleton />
                </div>
              ) : null}

              {!loading && error ? (
                <PremiumEmptyState icon="✦" title="قريبًا" description="نجهّز مسارات تعليمية مختارة بعناية. يمكنكِ البدء من جلسة خاصة أو دليل البداية لحين فتح المسارات." actionLabel="ابدئي من هنا" actionHref="/start-here" />
              ) : null}

              {!loading && !error && courses.length === 0 ? (
                <PremiumEmptyState
                  icon="✦"
                  title="قريبًا: مسارات وعي جديدة"
                  description="نجهّز رحلات تعليمية هادئة تساعدك على الفهم والتطبيق بخطوات واضحة. ابدئي الآن بدليل البداية أو جلسة خاصة لحين فتح المسارات."
                  actionLabel="ابدئي من هنا"
                  actionHref="/start-here"
                />
              ) : null}

              {!loading && !error && courses.length > 0 ? (
                <>
                  {featuredCourse ? (
                    <FeaturedCourse course={featuredCourse} />
                  ) : null}

                  <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                      <p className="mini-label mb-2">المكتبة التعليمية</p>
                      <h2 className="text-3xl font-black text-charcoal dark:text-ivory">كل الكورسات</h2>
                    </div>
                    <p className="text-xs font-black text-warm-gray">{filteredCourses.length} نتيجة</p>
                  </div>

                  {filteredCourses.length > 0 ? (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      {filteredCourses.map((course, index) => (
                        <CourseCard key={course.id} course={course} featured={course.id === featuredCourse?.id || index === 0} />
                      ))}
                    </div>
                  ) : (
                    <PremiumEmptyState
                      className="mt-6"
                      icon="⌕"
                      title="لا توجد نتائج مطابقة"
                      description="جرّبي كلمة بحث مختلفة أو اختاري تصنيفًا آخر."
                    />
                  )}
                </>
              ) : null}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
              <div className="rounded-[2rem] border border-sand bg-ivory/86 p-6 shadow-soft backdrop-blur-md dark:bg-deep-teal/55">
                <p className="text-sm font-black text-burgundy">لماذا تتعلمين معنا؟</p>
                <div className="mt-5 space-y-4">
                  {learningPromises.map((promise) => (
                    <div key={promise} className="flex gap-3 rounded-2xl bg-cream/65 p-4 dark:bg-deep-teal/40">
                      <span className="text-gold">✦</span>
                      <p className="text-sm font-bold leading-7 text-charcoal dark:text-ivory">{promise}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-sand bg-petrol text-ivory shadow-premium">
                <ImageSlot
                  ratio="square"
                  variant="brand"
                  label="مساحة صورة ملهمة"
                  hint="تكوين بصري من هوية هبة الشريف."
                  className="rounded-none border-0 shadow-none"
                />
                <div className="p-6">
                  <h3 className="text-2xl font-black">لا تعرفين من أين تبدأين؟</h3>
                  <p className="mt-3 text-sm leading-7 text-ivory/75">
                    احجزي جلسة قصيرة لتحديد المسار الأنسب لكِ قبل شراء أي محتوى.
                  </p>
                  <PremiumButton href="/booking" variant="gold" className="mt-5 w-full">
                    احجزي توجيهًا خاصًا
                  </PremiumButton>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[1.5rem] border border-sand bg-ivory/72 p-4 text-center shadow-soft backdrop-blur-sm dark:bg-deep-teal/45">
      <strong className="block text-2xl font-black text-petrol">{value}</strong>
      <span className="mt-1 block text-xs font-bold text-warm-gray">{label}</span>
    </div>
  )
}

function FeaturedCourse({ course }: { course: Course }) {
  return (
    <div className="premium-glow-border relative overflow-hidden rounded-[2.5rem] border border-sand bg-ivory/88 p-5 shadow-premium backdrop-blur-md dark:bg-deep-teal/55">
      <div className="ambient-orb ambient-orb-gold left-6 top-6 h-44 w-44" />
      <div className="relative grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <ImageSlot
          src={course.heroImageUrl || course.coverImageUrl}
          alt={course.title}
          ratio="video"
          variant="course"
          label="صورة مسار مقترح"
          hint="غلاف كبير للمسار التعليمي."
        />

        <div className="p-2 lg:p-6">
          <PremiumBadge variant="gold">مسار مقترح</PremiumBadge>
          <h2 className="mt-5 text-3xl font-black leading-tight text-charcoal md:text-4xl dark:text-ivory">
            {course.title}
          </h2>
          <p className="mt-4 text-sm leading-8 text-warm-gray">
            {course.emotionalPromise || course.description}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {course.lessonsCount ? <InfoPill label="الدروس" value={`${course.lessonsCount} درس`} /> : null}
            {course.duration ? <InfoPill label="المدة" value={course.duration} /> : null}
            {course.rating ? <InfoPill label="التقييم" value={`★ ${course.rating}`} /> : null}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PremiumButton href={`/courses/${course.slug}`}>استكشفي الكورس</PremiumButton>
            <Link href={`/courses/${course.slug}`} className="text-sm font-black text-burgundy hover:text-petrol">
              عرض المنهج والتفاصيل ←
            </Link>
            {Number(course.price) > 0 ? <span className="sm:mr-auto text-xl font-black text-petrol">{formatEGP(course.price)}</span> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/75 px-4 py-3 dark:bg-deep-teal/35">
      <span className="block text-[11px] font-black text-warm-gray">{label}</span>
      <strong className="mt-1 block text-sm font-black text-charcoal dark:text-ivory">{value}</strong>
    </div>
  )
}
