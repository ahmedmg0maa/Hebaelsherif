'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandMark from '@/components/brand/BrandMark'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import PurchaseRequestButton from '@/components/products/PurchaseRequestButton'
import ReviewSection from '@/components/reviews/ReviewSection'
import { getBookBySlug } from '@/lib/firestore/books'
import { formatEGP } from '@/lib/utils/formatters'
import type { Book } from '@/types'

const tabs = [
  { id: 'about', label: 'عن الكتاب' },
  { id: 'journey', label: 'رحلة القراءة' },
  { id: 'reviews', label: 'التقييمات' },
  { id: 'faq', label: 'الأسئلة' },
] as const

type TabId = (typeof tabs)[number]['id']

export default function BookDetailsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('about')

  useEffect(() => {
    if (!slug) return

    async function loadBook() {
      try {
        setLoading(true)
        setError('')

        const bookData = await getBookBySlug(slug)
        setBook(bookData)
      } catch (loadError) {
        console.error('Book details error:', loadError)
        setError('')
      } finally {
        setLoading(false)
      }
    }

    loadBook()
  }, [slug])

  const readingPath = useMemo(
    () => [
      {
        title: 'تهيئة هادئة',
        description: 'ابدئي بقراءة المقدمة والأسئلة الأولى دون استعجال أو محاولة الوصول لإجابة نهائية.',
      },
      {
        title: 'قراءة واعية',
        description: 'دوّني الجمل التي تتحرك داخلك، واستخدمي الكتاب كمرآة لا كاختبار.',
      },
      {
        title: 'تطبيق بسيط',
        description: 'اختاري فكرة واحدة فقط وطبقيها في أسبوعك قبل الانتقال للجزء التالي.',
      },
    ],
    [],
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
              description="هذا الإصدار غير متاح للعرض الآن. يمكنكِ زيارة المكتبة أو قراءة المقالات لحين فتح الإصدارات."
              actionLabel="العودة للكتب"
              actionHref="/books"
            />
          </section>
        ) : null}

        {!loading && !error && !book ? (
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="📖"
              title="الكتاب غير موجود"
              description="قد يكون الكتاب غير منشور أو تم تغيير الرابط."
              actionLabel="عرض كل الكتب"
              actionHref="/books"
            />
          </section>
        ) : null}

        {!loading && !error && book ? (
          <>
            <section className="relative overflow-hidden border-b border-sand bg-ivory/60">
              <div className="ambient-orb ambient-orb-gold left-10 top-10 h-56 w-56" />
              <div className="ambient-orb ambient-orb-petrol bottom-0 right-10 h-64 w-64" />

              <div className="container-premium relative grid gap-10 py-12 lg:grid-cols-[1fr_420px] lg:items-center">
                <div>
                  <Link href="/books" className="mb-5 inline-flex text-sm font-black text-warm-gray transition hover:text-petrol">
                    ← العودة للمكتبة
                  </Link>

                  <div className="flex flex-wrap gap-2">
                    <PremiumBadge variant="olive">كتاب رقمي</PremiumBadge>
                    {book.category ? <PremiumBadge variant="gold">{book.category}</PremiumBadge> : null}
                    {book.rating ? <PremiumBadge variant="petrol">★ {book.rating}</PremiumBadge> : null}
                  </div>

                  <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-petrol md:text-6xl">
                    {book.title}
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-9 text-warm-gray">
                    {book.emotionalPromise || book.shortDescription || book.description}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <span className="rounded-full border border-sand bg-cream px-5 py-2 text-sm font-bold text-charcoal">
                      وصول محمي داخل حسابك
                    </span>
                    {book.pagesCount ? (
                      <span className="rounded-full border border-sand bg-cream px-5 py-2 text-sm font-bold text-charcoal">
                        {book.pagesCount} صفحة
                      </span>
                    ) : null}
                    <span className="rounded-full border border-gold/20 bg-gold/10 px-5 py-2 text-sm font-bold text-gold">
                      {Number(book.price) > 0 ? formatEGP(book.price) : 'يُعلن قريبًا'}
                    </span>
                  </div>
                </div>

                <div className="relative mx-auto w-full max-w-sm">
                  <ImageSlot
                    src={book.coverImageUrl}
                    alt={book.title}
                    ratio="book"
                    variant="book"
                    label="غلاف الكتاب"
                    hint="أضيفي غلاف الكتاب الحقيقي من لوحة الإدارة."
                    priority
                  />
                  <div className="absolute -bottom-6 left-4 right-4 rounded-[2rem] border border-gold/20 bg-ivory/90 p-4 text-center shadow-premium backdrop-blur-md">
                    <BrandMark className="mx-auto mb-2" />
                    <p className="text-xs font-black leading-6 text-charcoal">كتاب يُقرأ كرحلة، لا كمعلومة عابرة.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="container-premium grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
              <div className="space-y-8">
                <div className="sticky top-20 z-20 -mx-1 overflow-x-auto rounded-full border border-sand bg-ivory/90 p-1 shadow-soft backdrop-blur-xl lg:top-24">
                  <div className="flex min-w-max gap-1">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`rounded-full px-5 py-3 text-sm font-black transition ${
                          activeTab === tab.id ? 'bg-petrol text-cream shadow-soft' : 'text-warm-gray hover:bg-cream hover:text-petrol'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === 'about' ? (
                  <article className="rounded-[2rem] border border-sand bg-ivory/90 p-7 shadow-soft backdrop-blur-sm">
                    <p className="mini-label mb-3">عن هذا الكتاب</p>
                    <h2 className="text-2xl font-black text-charcoal">لماذا هذا الكتاب؟</h2>
                    <p className="mt-5 whitespace-pre-line text-sm leading-8 text-warm-gray">{book.description}</p>

                    {book.emotionalPromise ? (
                      <div className="mt-7 rounded-3xl border border-gold/20 bg-gold/10 p-5">
                        <p className="text-sm font-black text-gold">وعد الكتاب</p>
                        <p className="mt-3 text-sm leading-8 text-charcoal">{book.emotionalPromise}</p>
                      </div>
                    ) : null}
                  </article>
                ) : null}

                {activeTab === 'journey' ? (
                  <article className="rounded-[2rem] border border-sand bg-ivory/90 p-7 shadow-soft backdrop-blur-sm">
                    <p className="mini-label mb-3">رحلة القراءة</p>
                    <h2 className="text-2xl font-black text-charcoal">طريقة مقترحة لقراءة أهدأ</h2>
                    <div className="mt-6 grid gap-4">
                      {readingPath.map((item, index) => (
                        <div key={item.title} className="rounded-3xl border border-sand bg-cream/70 p-5">
                          <div className="flex gap-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-petrol text-sm font-black text-cream">{index + 1}</span>
                            <div>
                              <h3 className="text-base font-black text-charcoal">{item.title}</h3>
                              <p className="mt-2 text-sm leading-7 text-warm-gray">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-3xl border border-sand bg-paper p-5">
                      <p className="text-sm font-black text-petrol">ماذا يحدث بعد الشراء؟</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {['إرسال الطلب', 'تأكيد الإدارة', 'فتح الوصول'].map((label, index) => (
                          <div key={label} className="rounded-2xl border border-sand bg-ivory p-4 text-sm font-bold text-charcoal">
                            {index + 1}. {label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                ) : null}

                {activeTab === 'reviews' ? <ReviewSection productId={book.id} productType="book" /> : null}

                {activeTab === 'faq' ? (
                  <article className="rounded-[2rem] border border-sand bg-ivory/90 p-7 shadow-soft backdrop-blur-sm">
                    <p className="mini-label mb-3">أسئلة شائعة</p>
                    <h2 className="text-2xl font-black text-charcoal">قبل شراء الكتاب</h2>
                    <div className="mt-6 grid gap-4">
                      {[
                        ['هل أستطيع فتح الكتاب فورًا؟', 'بعد إرسال طلب الشراء وتأكيد الدفع من الإدارة، يظهر الكتاب داخل لوحة حسابك.'],
                        ['هل أحتاج جلسة قبل القراءة؟', 'ليس دائمًا، لكن الجلسة تساعدك لو كنتِ تحتاجين ترشيحًا أو قراءة أعمق حسب مرحلتك.'],
                        ['هل يمكن فتح الكتاب من الهاتف؟', 'نعم، تم تصميم صفحات القراءة لتعمل على الموبايل والكمبيوتر.'],
                      ].map(([question, answer]) => (
                        <div key={question} className="rounded-3xl border border-sand bg-cream/70 p-5">
                          <h3 className="text-sm font-black text-charcoal">{question}</h3>
                          <p className="mt-2 text-sm leading-7 text-warm-gray">{answer}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ) : null}
              </div>

              <aside className="h-fit rounded-[2rem] border border-sand bg-ivory/92 p-6 shadow-premium backdrop-blur-sm lg:sticky lg:top-28">
                <p className="text-sm font-bold text-gold">سعر الكتاب</p>

                <strong className="mt-3 block text-4xl font-black text-petrol">{Number(book.price) > 0 ? formatEGP(book.price) : 'يُعلن قريبًا'}</strong>

                <p className="mt-4 text-sm leading-7 text-warm-gray">
                  بعد إرسال طلب الشراء، ستظهر حالته داخل لوحة المستخدم. عند تأكيد الدفع من الإدارة يتم فتح الكتاب تلقائيًا.
                </p>

                <PurchaseRequestButton
                  productId={book.id}
                  productType="book"
                  currentPath={`/books/${book.slug}`}
                  paidRedirectHref={`/books/${book.slug}/read`}
                  className="mt-6"
                />

                <BrandDivider className="my-6" />

                <div className="space-y-3">
                  <div className="rounded-2xl border border-sand bg-cream/70 p-4">
                    <p className="text-xs font-bold text-warm-gray">نوع الوصول</p>
                    <p className="mt-1 text-sm font-black text-charcoal">قراءة محمية داخل الحساب</p>
                  </div>
                  {book.sampleUrl ? (
                    <PremiumButton href={book.sampleUrl} variant="outline" className="w-full">فتح عينة مجانية</PremiumButton>
                  ) : null}
                  <PremiumButton href="/booking" variant="ghost" className="w-full">أحتاج ترشيحًا قبل الشراء</PremiumButton>
                </div>
              </aside>
            </section>
          </>
        ) : null}
      </main>

      <Footer />
    </>
  )
}
