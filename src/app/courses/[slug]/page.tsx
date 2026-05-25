'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandOrnament from '@/components/brand/BrandOrnament'
import PurchaseRequestButton from '@/components/products/PurchaseRequestButton'
import ReviewSection from '@/components/reviews/ReviewSection'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { getCourseBySlug, getCourseLessons } from '@/lib/firestore/courses'
import { formatEGP } from '@/lib/utils/formatters'
import type { Course, Lesson } from '@/types'

type CourseTab = 'about' | 'curriculum' | 'reviews' | 'faq'

const courseFaq = [
  {
    question: 'هل أحتاج خبرة سابقة قبل البدء؟',
    answer: 'لا. الكورس مصمم ليبدأ معكِ من نقطة واضحة وبخطوات هادئة، مع أسئلة وتمارين تساعدك على التطبيق.'
  },
  {
    question: 'متى يفتح المحتوى بعد الشراء؟',
    answer: 'بعد إرسال طلب الشراء وتأكيد الدفع من الإدارة، يتم فتح الوصول تلقائيًا داخل حسابك.'
  },
  {
    question: 'هل يمكنني الرجوع للمحتوى بعد فتح الوصول؟',
    answer: 'نعم. بعد تأكيد الوصول يبقى المحتوى داخل لوحة رحلتك ويمكنكِ المتابعة من حيث توقفتِ.'
  },
  {
    question: 'هل الكورس بديل عن الجلسات؟',
    answer: 'الكورس مساحة تعليمية وتطبيقية، والجلسات مناسبة إذا كنتِ تحتاجين دعمًا شخصيًا أعمق لحالتك.'
  },
]

const trustItems = [
  { title: 'وصول محمي', description: 'يفتح المحتوى بعد تأكيد الطلب من الإدارة.' },
  { title: 'محتوى منظم', description: 'فصول ودروس تظهر عند إضافتها من لوحة الإدارة.' },
  { title: 'متابعة داخل الحساب', description: 'يمكنكِ العودة للمحتوى من لوحة رحلتك.' },
  { title: 'دعم عند الحاجة', description: 'يمكنكِ حجز جلسة خاصة لتوجيه أعمق.' },
]

export default function CourseDetailsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<CourseTab>('curriculum')
  const [openStage, setOpenStage] = useState(0)

  useEffect(() => {
    if (!slug) return

    async function loadCourse() {
      try {
        setLoading(true)
        setError('')

        const courseData = await getCourseBySlug(slug)

        if (!courseData) {
          setCourse(null)
          setLessons([])
          return
        }

        const lessonsData = await getCourseLessons(courseData.id)

        setCourse(courseData)
        setLessons(lessonsData)
      } catch (loadError) {
        console.error('Course details error:', loadError)
        setError('')
      } finally {
        setLoading(false)
      }
    }

    loadCourse()
  }, [slug])

  const lessonGroups = useMemo(() => {
    const grouped = new Map<string, Lesson[]>()

    lessons.forEach((lesson) => {
      const key = lesson.stageTitle || 'فصل تمهيدي'
      const current = grouped.get(key) || []
      current.push(lesson)
      grouped.set(key, current)
    })

    return Array.from(grouped.entries()).map(([title, items]) => ({
      title,
      lessons: items.sort((a, b) => a.order - b.order),
      totalDuration: items.reduce((sum, lesson) => sum + Number(lesson.duration || 0), 0),
    }))
  }, [lessons])

  const totalDuration = useMemo(
    () => lessons.reduce((sum, lesson) => sum + Number(lesson.duration || 0), 0),
    [lessons],
  )

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        {loading ? (
          <section className="container-premium py-12">
            <PremiumSkeleton className="mb-8 h-96" />
            <PremiumSkeleton className="mb-4 h-10 w-72" />
            <PremiumSkeleton className="h-5 w-full max-w-2xl" />
          </section>
        ) : null}

        {!loading && error ? (
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="!"
              title="قريبًا"
              description="هذا المسار غير متاح للعرض الآن. يمكنكِ العودة للمسارات أو البدء من دليل البداية."
              actionLabel="عرض المسارات"
              actionHref="/courses"
            />
          </section>
        ) : null}

        {!loading && !error && !course ? (
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="✦"
              title="هذا المسار قيد التحضير"
              description="نجهّز التجربة لتظهر بشكل كامل عندما تكون مناسبة للنشر."
              actionLabel="عرض كل الكورسات"
              actionHref="/courses"
            />
          </section>
        ) : null}

        {!loading && !error && course ? (
          <>
            <section className="relative overflow-hidden border-b border-sand/80">
              <div className="ambient-orb ambient-orb-gold right-0 top-10 h-72 w-72" />
              <div className="ambient-orb ambient-orb-petrol bottom-0 left-0 h-72 w-72" />

              <div className="container-premium relative grid gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <ImageSlot
                  src={course.heroImageUrl || course.coverImageUrl}
                  alt={course.title}
                  ratio="video"
                  variant="course"
                  label="صورة الكورس"
                  hint="مساحة فاخرة لغلاف الكورس أو صورة تعبيرية عنه."
                  priority
                  className="min-h-[320px]"
                />

                <div>
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <PremiumBadge variant="gold">كورس رقمي</PremiumBadge>
                    {course.category ? <PremiumBadge variant="petrol">{course.category}</PremiumBadge> : null}
                    {course.level ? <PremiumBadge variant="neutral">{course.level}</PremiumBadge> : null}
                  </div>

                  <p className="mb-3 text-sm font-black text-warm-gray">الرئيسية / الكورسات / {course.title}</p>
                  <h1 className="max-w-4xl text-balance text-4xl font-black leading-tight text-charcoal md:text-6xl dark:text-ivory">
                    {course.title}
                  </h1>

                  <p className="mt-6 max-w-2xl text-lg font-bold leading-9 text-burgundy">
                    {course.emotionalPromise || course.description}
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-4">
                    {course.duration ? <HeroPill label="المدة" value={course.duration} /> : null}
                    {course.lessonsCount || lessons.length ? <HeroPill label="الدروس" value={`${course.lessonsCount || lessons.length} درس`} /> : null}
                    {course.rating ? <HeroPill label="التقييم" value={`★ ${course.rating}`} /> : null}
                    {course.studentsCount ? <HeroPill label="المنضمات" value={`${course.studentsCount}`} /> : null}
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <PurchaseRequestButton
                      productId={course.id}
                      productType="course"
                      currentPath={`/courses/${course.slug}`}
                      paidRedirectHref={`/courses/${course.slug}/learn`}
                    />
                    <PremiumButton href={`/courses/${course.slug}/learn`} variant="outline">
                      الدخول بعد تأكيد الوصول
                    </PremiumButton>
                    <div className="sm:mr-auto text-right">
                      <span className="block text-xs font-black text-warm-gray">الاستثمار في الرحلة</span>
                      {Number(course.price) > 0 ? <strong className="text-3xl font-black text-petrol">{formatEGP(course.price)}</strong> : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="container-premium py-10">
              <div className="mb-8 grid gap-4 rounded-[2rem] border border-sand bg-ivory/80 p-4 shadow-soft backdrop-blur-md md:grid-cols-4 dark:bg-deep-teal/50">
                {trustItems.map((item) => (
                  <div key={item.title} className="rounded-3xl bg-cream/70 p-4 text-center dark:bg-deep-teal/35">
                    <span className="text-gold">✦</span>
                    <h3 className="mt-2 text-sm font-black text-charcoal dark:text-ivory">{item.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-warm-gray">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
                <div>
                  <div className="sticky top-20 z-20 mb-6 overflow-x-auto rounded-[2rem] border border-sand bg-ivory/88 p-2 shadow-soft backdrop-blur-xl dark:bg-deep-teal/70">
                    <div className="flex min-w-max gap-2">
                      <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')}>عن الكورس</TabButton>
                      <TabButton active={activeTab === 'curriculum'} onClick={() => setActiveTab('curriculum')}>محتوى الكورس</TabButton>
                      <TabButton active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}>التقييمات</TabButton>
                      <TabButton active={activeTab === 'faq'} onClick={() => setActiveTab('faq')}>الأسئلة الشائعة</TabButton>
                    </div>
                  </div>

                  {activeTab === 'about' ? (
                    <div className="space-y-6">
                      <article className="rounded-[2rem] border border-sand bg-ivory/88 p-7 shadow-soft backdrop-blur-md dark:bg-deep-teal/55">
                        <p className="mini-label mb-3">عن الرحلة</p>
                        <h2 className="text-3xl font-black text-charcoal dark:text-ivory">ما الذي ستختبرينه داخل هذا الكورس؟</h2>
                        <p className="mt-5 whitespace-pre-line text-sm leading-8 text-warm-gray">
                          {course.description}
                        </p>
                      </article>

                      {course.outcomes?.length ? (
                        <article className="rounded-[2rem] border border-sand bg-ivory/88 p-7 shadow-soft backdrop-blur-md dark:bg-deep-teal/55">
                          <p className="mini-label mb-3">النتائج المتوقعة</p>
                          <h2 className="text-3xl font-black text-charcoal dark:text-ivory">ماذا ستحصلين عليه؟</h2>
                          <div className="mt-6 grid gap-3 md:grid-cols-2">
                            {course.outcomes.map((outcome) => (
                              <div key={outcome} className="rounded-3xl border border-sand bg-cream/72 p-5 dark:bg-deep-teal/35">
                                <span className="text-gold">✦</span>
                                <p className="mt-2 text-sm font-bold leading-8 text-charcoal dark:text-ivory">{outcome}</p>
                              </div>
                            ))}
                          </div>
                        </article>
                      ) : null}

                      {course.targetAudience ? (
                        <article className="rounded-[2rem] border border-sand bg-ivory/88 p-7 shadow-soft backdrop-blur-md dark:bg-deep-teal/55">
                          <p className="mini-label mb-3">لمن يناسب؟</p>
                          <h2 className="text-3xl font-black text-charcoal dark:text-ivory">هل هذه الرحلة مناسبة لكِ؟</h2>
                          <p className="mt-5 text-sm leading-8 text-warm-gray">{course.targetAudience}</p>
                        </article>
                      ) : null}
                    </div>
                  ) : null}

                  {activeTab === 'curriculum' ? (
                    <article className="rounded-[2rem] border border-sand bg-ivory/88 p-6 shadow-premium backdrop-blur-md dark:bg-deep-teal/55">
                      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="mini-label mb-2">محتوى الكورس</p>
                          <h2 className="text-3xl font-black text-charcoal dark:text-ivory">الفصول والدروس</h2>
                          <p className="mt-2 text-sm leading-7 text-warm-gray">
                            {lessonGroups.length || 0} فصل · {lessons.length || 0} درس · {totalDuration || 0} دقيقة تقريبًا
                          </p>
                        </div>
                        <PremiumButton type="button" variant="soft" onClick={() => setOpenStage(openStage === -1 ? 0 : -1)}>
                          {openStage === -1 ? 'فتح أول فصل' : 'إغلاق الكل'}
                        </PremiumButton>
                      </div>

                      {lessonGroups.length > 0 ? (
                        <div className="space-y-4">
                          {lessonGroups.map((group, groupIndex) => {
                            const open = openStage === groupIndex
                            return (
                              <div key={group.title} className="overflow-hidden rounded-[1.75rem] border border-sand bg-cream/70 dark:bg-deep-teal/35">
                                <button
                                  type="button"
                                  onClick={() => setOpenStage(open ? -1 : groupIndex)}
                                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right"
                                  aria-expanded={open}
                                >
                                  <div>
                                    <h3 className="text-lg font-black text-burgundy">الفصل {groupIndex + 1}: {group.title}</h3>
                                    <p className="mt-1 text-xs font-bold text-warm-gray">
                                      {group.lessons.length} دروس · {group.totalDuration} دقيقة
                                    </p>
                                  </div>
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ivory text-petrol shadow-soft">
                                    {open ? '−' : '+'}
                                  </span>
                                </button>

                                {open ? (
                                  <div className="border-t border-sand bg-ivory/55 p-3 dark:bg-deep-teal/25">
                                    {group.lessons.map((lesson, lessonIndex) => (
                                      <div key={lesson.id} className="flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-cream dark:hover:bg-deep-teal/45">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-petrol/20 bg-petrol/10 text-xs font-black text-petrol">
                                          {lessonIndex + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <h4 className="text-sm font-black text-charcoal dark:text-ivory">{lesson.title}</h4>
                                          <p className="mt-1 line-clamp-2 text-xs leading-6 text-warm-gray">{lesson.description}</p>
                                        </div>
                                        <div className="hidden items-center gap-3 text-xs font-black text-warm-gray sm:flex">
                                          <span>{lesson.duration} دقيقة</span>
                                          <span>{'تفاصيل الدرس'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <PremiumEmptyState
                          icon="✦"
                          title="سيتم عرض المنهج هنا"
                          description="عند إضافة الفصول والدروس من لوحة الإدارة، سيظهر منهج الكورس هنا بشكل منظم."
                        />
                      )}
                    </article>
                  ) : null}

                  {activeTab === 'reviews' ? (
                    <ReviewSection productId={course.id} productType="course" />
                  ) : null}

                  {activeTab === 'faq' ? (
                    <article className="rounded-[2rem] border border-sand bg-ivory/88 p-7 shadow-soft backdrop-blur-md dark:bg-deep-teal/55">
                      <p className="mini-label mb-3">الأسئلة الشائعة</p>
                      <h2 className="text-3xl font-black text-charcoal dark:text-ivory">قبل أن تبدئي</h2>
                      <div className="mt-6 space-y-3">
                        {courseFaq.map((item) => (
                          <details key={item.question} className="group rounded-3xl border border-sand bg-cream/70 p-5 dark:bg-deep-teal/35">
                            <summary className="cursor-pointer list-none text-sm font-black text-charcoal dark:text-ivory">
                              {item.question}
                              <span className="float-left text-petrol group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-4 text-sm leading-8 text-warm-gray">{item.answer}</p>
                          </details>
                        ))}
                      </div>
                    </article>
                  ) : null}
                </div>

                <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
                  <div className="premium-glow-border rounded-[2rem] border border-sand bg-ivory/92 p-6 shadow-premium backdrop-blur-md dark:bg-deep-teal/65">
                    <p className="text-sm font-black text-gold">الاستثمار في الرحلة</p>
                    {Number(course.price) > 0 ? <strong className="mt-3 block text-4xl font-black text-petrol">{formatEGP(course.price)}</strong> : null}
                    <p className="mt-4 text-sm leading-7 text-warm-gray">
                      بعد إرسال طلب الشراء، يظهر الطلب داخل لوحة حسابك. عند تأكيد الدفع من الإدارة، يتم فتح محتوى الكورس تلقائيًا.
                    </p>
                    <PurchaseRequestButton
                      productId={course.id}
                      productType="course"
                      currentPath={`/courses/${course.slug}`}
                      paidRedirectHref={`/courses/${course.slug}/learn`}
                      className="mt-6 w-full"
                    />
                    <PremiumButton href="/booking" variant="outline" className="mt-3 w-full">
                      أحتاج جلسة قبل البدء
                    </PremiumButton>
                  </div>

                  <div className="rounded-[2rem] border border-sand bg-ivory/86 p-6 shadow-soft backdrop-blur-md dark:bg-deep-teal/55">
                    <BrandOrnament className="mb-4" />
                    <h3 className="text-2xl font-black text-charcoal dark:text-ivory">ماذا ستحصلين؟</h3>
                    <ul className="mt-5 space-y-3">
                      {[
                        'وصول منظم داخل حسابك',
                        'فصول ودروس مرتبة حسب الرحلة',
                        'إمكانية المتابعة من حيث توقفتِ',
                        'موارد وروابط إضافية عند توفرها',
                      ].map((item) => (
                        <li key={item} className="flex gap-3 text-sm font-bold leading-7 text-warm-gray">
                          <span className="text-gold">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="overflow-hidden rounded-[2rem] border border-sand bg-petrol text-ivory shadow-premium">
                    <ImageSlot
                      ratio="square"
                      variant="brand"
                      label="صورة المدربة"
                      hint="تكوين بصري من هوية هبة الشريف."
                      className="rounded-none border-0 shadow-none"
                    />
                    <div className="p-6">
                      <h3 className="text-xl font-black">مع هبة الشريف</h3>
                      <p className="mt-3 text-sm leading-7 text-ivory/75">
                        مساحة تعليمية عربية تساعدك على اكتشاف ذاتك وبناء علاقة أهدأ مع نفسك.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <BrandDivider className="my-12" />

              <div className="rounded-[2.5rem] border border-sand bg-ivory/86 p-8 text-center shadow-premium backdrop-blur-md dark:bg-deep-teal/55">
                <p className="mini-label mb-3">جاهزة للبدء؟</p>
                <h2 className="text-3xl font-black text-charcoal md:text-5xl dark:text-ivory">ابدئي رحلة التعلم من مكان هادئ وواضح.</h2>
                <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-warm-gray">
                  اختاري الكورس، أرسلي طلب الشراء، وبعد التأكيد سيظهر المحتوى داخل لوحة رحلتك.
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <PurchaseRequestButton
                    productId={course.id}
                    productType="course"
                    currentPath={`/courses/${course.slug}`}
                    paidRedirectHref={`/courses/${course.slug}/learn`}
                  />
                  <PremiumButton href="/courses" variant="outline">تصفحي كورسات أخرى</PremiumButton>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>

      <Footer />
    </>
  )
}

function HeroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-ivory/75 px-4 py-3 shadow-soft backdrop-blur-sm dark:bg-deep-teal/40">
      <span className="block text-[11px] font-black text-warm-gray">{label}</span>
      <strong className="mt-1 block text-sm font-black text-charcoal dark:text-ivory">{value}</strong>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-3 text-sm font-black transition ${
        active
          ? 'bg-petrol text-ivory shadow-soft'
          : 'text-warm-gray hover:bg-cream hover:text-petrol dark:hover:bg-deep-teal/45'
      }`}
    >
      {children}
    </button>
  )
}
