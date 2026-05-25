'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumCard from '@/components/ui/PremiumCard'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import ProtectedContentNotice from '@/components/ui/ProtectedContentNotice'
import ContentProtection from '@/components/security/ContentProtection'
import { useAuth } from '@/hooks/useAuth'
import { getBookBySlug } from '@/lib/firestore/books'
import type { Book } from '@/types'
import type { User as FirebaseUser } from 'firebase/auth'

interface VerifyAccessResponse {
  hasAccess: boolean
  contentUrl?: string
  resourceUrl?: string
  error?: string
}

type ReaderMode = 'light' | 'sepia' | 'dark'

const readerModes: { label: string; value: ReaderMode }[] = [
  { label: 'فاتح', value: 'light' },
  { label: 'ورقي', value: 'sepia' },
  { label: 'داكن', value: 'dark' },
]

export default function BookReadPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const router = useRouter()

  const { user, firebaseUser, loading: authLoading } = useAuth()

  const [book, setBook] = useState<Book | null>(null)
  const [contentUrl, setContentUrl] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [readerMode, setReaderMode] = useState<ReaderMode>('light')
  const [fontScale, setFontScale] = useState(100)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!user || !firebaseUser) {
      router.push(`/auth/login?next=${encodeURIComponent(`/books/${slug}/read`)}`)
      return
    }

    async function loadProtectedBook(authUser: FirebaseUser) {
      try {
        setLoading(true)
        setAccessDenied(false)
        setError('')

        const bookData = await getBookBySlug(slug)

        if (!bookData) {
          setBook(null)
          return
        }

        const token = await authUser.getIdToken()

        const accessResponse = await fetch('/api/verify-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: bookData.id,
            productType: 'book',
          }),
        })

        const accessData = (await accessResponse.json()) as VerifyAccessResponse

        if (!accessResponse.ok || !accessData.hasAccess) {
          setBook(bookData)
          setAccessDenied(true)
          setError(accessData.error || 'لا يوجد وصول لهذا المحتوى.')
          return
        }

        setBook(bookData)
        setContentUrl(accessData.contentUrl || '')
        setResourceUrl(accessData.resourceUrl || '')
      } catch (loadError) {
        console.error('Book read load error:', loadError)
        setError('المحتوى غير متاح الآن. راجعي حالة الطلب من لوحة حسابك أو تواصلي معنا.')
      } finally {
        setLoading(false)
      }
    }

    loadProtectedBook(firebaseUser)
  }, [authLoading, firebaseUser, router, slug, user])

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <section className="container-premium py-12">
            <PremiumSkeleton className="mb-6 h-10 w-72" />
            <PremiumSkeleton className="h-[620px]" />
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (!book) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="📖"
              title="الكتاب غير موجود"
              description="قد يكون الكتاب غير منشور أو تم تغيير الرابط."
              actionLabel="عرض الكتب"
              actionHref="/books"
            />
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (accessDenied) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <ProtectedContentNotice
            productTitle={book.title}
            productType="book"
            description={error}
            purchaseHref={`/books/${book.slug}`}
            backHref="/dashboard/books"
          />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="paper-texture relative overflow-hidden border-b border-gold/15 bg-deepTeal text-ivory">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-gold/18 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-aqua/10 blur-3xl" />
          <div className="container-premium relative grid gap-8 py-10 lg:grid-cols-[1fr_260px] lg:items-center">
            <div>
              <Link
                href="/dashboard/books"
                className="mb-5 inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-bold text-ivory/75 transition hover:text-gold"
              >
                ← العودة لكتبي
              </Link>

              <PremiumBadge variant="gold">مكتبة خاصة</PremiumBadge>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">{book.title}</h1>
              <p className="mt-5 max-w-2xl text-sm font-bold leading-8 text-ivory/72">
                مساحة قراءة هادئة ومحمية، مصممة لتعودي للكتاب وتفتحي مرفقاته بدون تشتيت.
              </p>
            </div>

            <ImageSlot
              src={book.coverImageUrl}
              ratio="book"
              variant="book"
              label="غلاف الكتاب"
              hint="يمكن إضافة الغلاف الحقيقي من لوحة الإدارة."
              className="mx-auto w-full max-w-[220px] shadow-botanical"
            />
          </div>
        </section>

        <section className="container-premium grid gap-8 py-10 xl:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <PremiumCard className="overflow-hidden p-0">
              <div className="flex flex-col gap-4 border-b border-sand bg-cream/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mini-label">قارئ الكتاب</p>
                  <h2 className="brand-title mt-1 text-2xl font-black text-charcoal">{book.title}</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {readerModes.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setReaderMode(mode.value)}
                      className={`rounded-full px-4 py-2 text-xs font-black transition ${
                        readerMode === mode.value
                          ? 'bg-petrol text-ivory'
                          : 'border border-sand bg-ivory text-warm-gray hover:text-petrol'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-4 md:p-5 ${getReaderShellClass(readerMode)}`}>
                <ContentProtection userLabel={user?.email || user?.uid || 'حساب خاص'} productTitle={book.title} className="border border-sand bg-cream">
                  {contentUrl ? (
                    <iframe
                      src={contentUrl}
                      title={book.title}
                      className="w-full rounded-[2rem]"
                      style={{ height: '760px', fontSize: `${fontScale}%` }}
                      allow="fullscreen"
                    />
                  ) : (
                    <div className="flex h-[560px] items-center justify-center rounded-[2rem] border border-dashed border-sand bg-cream/70 px-6 text-center text-sm font-bold leading-7 text-warm-gray">
                      رابط الكتاب غير متاح حاليًا. يمكن للأدمن إضافة رابط Google Drive أو PDF من لوحة الإدارة.
                    </div>
                  )}
                </ContentProtection>
              </div>
            </PremiumCard>

            <div className="grid gap-4 md:grid-cols-3">
              <ReaderToolCard title="حجم القراءة" value={`${fontScale}%`}>
                <div className="mt-3 flex gap-2">
                  <PremiumButton type="button" size="sm" variant="outline" onClick={() => setFontScale((current) => Math.max(90, current - 10))}>
                    -
                  </PremiumButton>
                  <PremiumButton type="button" size="sm" variant="outline" onClick={() => setFontScale((current) => Math.min(130, current + 10))}>
                    +
                  </PremiumButton>
                </div>
              </ReaderToolCard>

              <ReaderToolCard title="آخر قراءة" value="يتم حفظ تقدم القراءة في إصدار لاحق." />
              <ReaderToolCard title="المرفقات" value={resourceUrl ? 'مرفقات متاحة لهذا الكتاب.' : 'لا توجد مرفقات مضافة.'} />
            </div>
          </div>

          <aside className="h-fit rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm xl:sticky xl:top-28">
            <p className="mini-label">ملخص الكتاب</p>
            <h3 className="brand-title mt-2 text-2xl font-black text-charcoal">رحلة قراءة واعية</h3>
            <BrandDivider className="mt-4 justify-start" />

            <div className="mt-5 space-y-3">
              <Info label="عدد الصفحات" value={book.pagesCount ? `${book.pagesCount} صفحة` : 'غير محدد'} />
              <Info label="التصنيف" value={book.category || 'وعي ذاتي'} />
              <Info label="التقييم" value={book.rating ? `${book.rating}/5` : 'قيد التجميع'} />
              <Info label="الوصول" value="شخصي ومحمي" />
            </div>

            <div className="mt-6 grid gap-3">
              {contentUrl ? (
                <PremiumButton href={contentUrl}>
                  فتح في نافذة مستقلة
                </PremiumButton>
              ) : null}

              {resourceUrl ? (
                <PremiumButton href={resourceUrl} variant="outline">
                  فتح المرفقات
                </PremiumButton>
              ) : null}

              <PremiumButton href="/dashboard/books" variant="ghost">
                العودة للمكتبة
              </PremiumButton>
            </div>

            <p className="mt-6 rounded-2xl border border-sand bg-cream/70 px-4 py-3 text-xs font-bold leading-6 text-warm-gray">
              الوصول لهذا المحتوى شخصي ومحمي، ولا يتم عرض الرابط المباشر داخل الواجهة حفاظًا على حقوق الملكية.
            </p>
          </aside>
        </section>
      </main>

      <Footer />
    </>
  )
}

function getReaderShellClass(mode: ReaderMode) {
  const classes: Record<ReaderMode, string> = {
    light: 'bg-ivory',
    sepia: 'bg-[#f3e8d7]',
    dark: 'bg-deepTeal',
  }

  return classes[mode]
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/70 px-4 py-3">
      <p className="text-[11px] font-bold text-warm-gray">{label}</p>
      <p className="mt-1 text-sm font-black text-charcoal">{value}</p>
    </div>
  )
}

function ReaderToolCard({ title, value, children }: { title: string; value: string; children?: React.ReactNode }) {
  return (
    <PremiumCard className="p-5">
      <p className="text-xs font-black text-gold">{title}</p>
      <p className="mt-3 text-sm font-bold leading-7 text-warm-gray">{value}</p>
      {children}
    </PremiumCard>
  )
}
