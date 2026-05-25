'use client'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandMark from '@/components/brand/BrandMark'
import BrandOrnament from '@/components/brand/BrandOrnament'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumProgressBar from '@/components/ui/PremiumProgressBar'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import {
  formatArabicDate,
  formatEGP,
  formatTime12h,
  getOrderStatusLabel,
  getTodayDateString,
} from '@/lib/utils/formatters'
import type { Booking, Order } from '@/types'

interface DashboardStats {
  paidCourses: number
  paidBooks: number
  upcomingSessions: number
  pendingOrders: number
  paidOrders: number
  totalInvestment: number
}

interface DashboardData {
  stats: DashboardStats
  orders: Order[]
  bookings: Booking[]
}

const defaultStats: DashboardStats = {
  paidCourses: 0,
  paidBooks: 0,
  upcomingSessions: 0,
  pendingOrders: 0,
  paidOrders: 0,
  totalInvestment: 0,
}

const journeyStages = [
  {
    title: 'اكتشاف',
    description: 'اختاري المسار الأقرب لما تعيشينه الآن.',
    href: '/services',
    icon: '✦',
  },
  {
    title: 'تعلم',
    description: 'افتحي كورسًا أو كتابًا وابدئي بخطوة صغيرة.',
    href: '/dashboard/courses',
    icon: '◈',
  },
  {
    title: 'تأمل',
    description: 'عودي للملاحظات والموارد وراقبي تقدمك.',
    href: '/dashboard/books',
    icon: '☾',
  },
  {
    title: 'لقاء',
    description: 'احجزي جلسة خاصة عندما تحتاجين وضوحًا أعمق.',
    href: '/booking',
    icon: '◌',
  },
]

export default function DashboardHomePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData>({ stats: defaultStats, orders: [], bookings: [] })

  useEffect(() => {
    const userId = user?.uid
    if (!userId) return

    async function loadDashboardData() {
      setLoading(true)

      const [ordersSnap, bookingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'bookings'), where('userId', '==', userId))),
      ])

      const orders = ordersSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })) as Order[]
      const bookings = bookingsSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })) as Booking[]
      const today = getTodayDateString()

      const stats: DashboardStats = {
        paidCourses: orders.filter((order) => order.productType === 'course' && order.status === 'paid').length,
        paidBooks: orders.filter((order) => order.productType === 'book' && order.status === 'paid').length,
        upcomingSessions: bookings.filter((booking) => booking.status !== 'cancelled' && booking.date >= today).length,
        pendingOrders: orders.filter((order) => order.status === 'pending' || order.status === 'payment_submitted').length,
        paidOrders: orders.filter((order) => order.status === 'paid').length,
        totalInvestment: orders
          .filter((order) => order.status === 'paid')
          .reduce((sum, order) => sum + Number(order.amount || 0), 0),
      }

      bookings.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      orders.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt))

      setData({ stats, orders, bookings })
      setLoading(false)
    }

    loadDashboardData().catch((error) => {
      console.error('Dashboard data error:', error)
      setLoading(false)
    })
  }, [user?.uid])

  const completionScore = useMemo(() => {
    const { paidCourses, paidBooks, upcomingSessions, paidOrders } = data.stats
    const raw = paidCourses * 24 + paidBooks * 18 + upcomingSessions * 24 + paidOrders * 8
    return Math.min(100, raw)
  }, [data.stats])

  const upcomingBookings = data.bookings
    .filter((booking) => booking.status !== 'cancelled' && booking.date >= getTodayDateString())
    .slice(0, 3)
  const recentOrders = data.orders.slice(0, 4)
  const hasAnyActivity =
    data.stats.paidCourses > 0 || data.stats.paidBooks > 0 || data.stats.upcomingSessions > 0 || data.stats.pendingOrders > 0

  if (loading) {
    return (
      <div className="space-y-6">
        <PremiumSkeleton className="h-80" />
        <div className="grid gap-4 md:grid-cols-4">
          <PremiumSkeleton className="h-32" />
          <PremiumSkeleton className="h-32" />
          <PremiumSkeleton className="h-32" />
          <PremiumSkeleton className="h-32" />
        </div>
        <PremiumSkeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="premium-glow-border botanical-frame paper-texture relative overflow-hidden rounded-[2.75rem] border border-sand bg-ivory/92 p-6 shadow-premium backdrop-blur-sm lg:p-8 xl:p-10">
        <div className="pointer-events-none absolute -left-28 top-0 h-80 w-80 rounded-full bg-gold/16 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-petrol/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-1/2 h-56 w-56 rounded-full bg-aqua/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1fr_420px] xl:items-stretch">
          <div className="flex min-h-[390px] flex-col justify-between">
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <BrandMark size="md" />
                <PremiumBadge variant="gold">لوحة رحلتك الخاصة</PremiumBadge>
                <PremiumBadge variant="aqua">تصميم V2</PremiumBadge>
              </div>

              <p className="mini-label mb-3">مساحة هادئة لتنظيم الوعي</p>
              <h2 className="max-w-4xl text-4xl font-black leading-tight text-petrol md:text-6xl">
                كل خطوة في رحلتك محفوظة، مرئية، وقابلة للاستكمال بهدوء.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-warm-gray md:text-base">
                هذه ليست لوحة أرقام فقط؛ إنها مساحة تجمع التعلم، القراءة، الجلسات، والطلبات في تجربة واحدة مصممة لتعيدك إلى مسارك دون تشتيت.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_280px] lg:items-end">
              <div className="flex flex-col gap-3 sm:flex-row">
                <PremiumButton href="/dashboard/courses" size="lg">
                  أكملي التعلم
                </PremiumButton>
                <PremiumButton href="/booking" variant="outline" size="lg">
                  احجزي جلسة خاصة
                </PremiumButton>
                <PremiumButton href="/services" variant="soft" size="lg">
                  اختاري مسارك
                </PremiumButton>
              </div>

              <div className="rounded-[1.7rem] border border-sand bg-cream/70 p-4 shadow-soft backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-warm-gray">مؤشر اكتمال الرحلة</span>
                  <strong className="latin-numerals text-2xl font-black text-petrol">{completionScore}%</strong>
                </div>
                <PremiumProgressBar value={completionScore} />
              </div>
            </div>
          </div>

          <aside className="grid gap-4 rounded-[2.25rem] border border-sand bg-cream/72 p-5 shadow-soft backdrop-blur-sm">
            <ImageSlot ratio="square" variant="brand" label="صورة رحلة المستخدم" hint="تكوين بصري هادئ من هوية الرحلة." showLabel />
            <div className="rounded-[1.7rem] border border-sand bg-ivory/74 p-5">
              <p className="text-xs font-black text-warm-gray">توصية اليوم</p>
              <h3 className="mt-2 text-xl font-black text-charcoal">ابدئي بخطوة واحدة فقط</h3>
              <p className="mt-3 text-sm leading-7 text-warm-gray">
                اختاري محتوى واحدًا، أو جلسة واحدة، ثم عودي لهذه اللوحة لمتابعة أثر الخطوة.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard icon="◈" label="كورسات مفتوحة" value={data.stats.paidCourses} href="/dashboard/courses" hint="مسارات تعليمية" />
        <DashboardStatCard icon="☾" label="كتب متاحة" value={data.stats.paidBooks} href="/dashboard/books" hint="قراءة رقمية" />
        <DashboardStatCard icon="◌" label="جلسات قادمة" value={data.stats.upcomingSessions} href="/dashboard/sessions" hint="مواعيدك الخاصة" />
        <DashboardStatCard icon="◇" label="طلبات قيد المراجعة" value={data.stats.pendingOrders} href="/dashboard/orders" hint="تأكيد الدفع" />
      </div>

      {!hasAnyActivity ? (
        <PremiumEmptyState
          icon="✦"
          title="رحلتك لم تبدأ بعد"
          description="عند شراء كورس أو كتاب أو حجز جلسة، سيظهر كل شيء هنا تلقائيًا بتصميم واضح ومنظم."
          actionLabel="استكشفي الكورسات"
          actionHref="/courses"
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <div className="space-y-6">
          <div className="rounded-[2.25rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm lg:p-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mini-label mb-2">خريطة الرحلة</p>
                <h3 className="text-3xl font-black text-charcoal">من أين أبدأ الآن؟</h3>
              </div>
              <PremiumButton href="/services" variant="soft" size="sm">
                عرض كل المسارات
              </PremiumButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {journeyStages.map((stage, index) => (
                <JourneyStageCard key={stage.title} index={index + 1} {...stage} />
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="الجلسات القادمة" eyebrow="مواعيدك" actionHref="/dashboard/sessions" actionLabel="كل الجلسات">
              {upcomingBookings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="rounded-3xl border border-sand bg-cream/70 p-4 transition hover:border-gold/40 hover:bg-ivory">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-charcoal">{booking.sessionType || 'جلسة فردية'}</p>
                          <p className="mt-2 text-xs font-bold text-warm-gray">
                            {booking.date} · {formatTime12h(booking.time)} · <span className="latin-numerals">{booking.duration}</span> دقيقة
                          </p>
                        </div>
                        <span className="rounded-full border border-petrol/20 bg-petrol/10 px-3 py-1 text-xs font-black text-petrol">
                          {booking.status === 'confirmed' ? 'مؤكدة' : 'قيد المراجعة'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-3xl border border-dashed border-sand bg-cream/60 p-5 text-sm leading-7 text-warm-gray">
                  لا توجد جلسات قادمة بعد. احجزي جلسة عندما تحتاجين مساحة أعمق للوضوح.
                </p>
              )}
            </Panel>

            <Panel title="آخر الطلبات" eyebrow="الطلبات" actionHref="/dashboard/orders" actionLabel="كل الطلبات">
              {recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="rounded-3xl border border-sand bg-cream/70 p-4 transition hover:border-gold/40 hover:bg-ivory">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-charcoal">{order.productType === 'course' ? 'كورس' : 'كتاب'}</p>
                          <p className="mt-2 text-xs font-bold text-warm-gray">{formatArabicDate(order.createdAt)}</p>
                        </div>
                        <div className="text-left">
                          <p className="latin-numerals text-sm font-black text-petrol">{formatEGP(order.amount)}</p>
                          <p className="mt-2 text-xs font-black text-gold">{getOrderStatusLabel(order.status)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-3xl border border-dashed border-sand bg-cream/60 p-5 text-sm leading-7 text-warm-gray">
                  لا توجد طلبات بعد. أي طلب شراء سيظهر هنا مع حالته وتفاصيل الدفع.
                </p>
              )}
            </Panel>
          </div>

          <section className="premium-glow-border overflow-hidden rounded-[2.25rem] border border-sand bg-petrol p-6 text-ivory shadow-premium lg:p-7">
            <div className="grid gap-6 lg:grid-cols-[1fr_270px] lg:items-center">
              <div>
                <p className="text-xs font-black tracking-[.22em] text-gold">لحظة مراجعة</p>
                <h3 className="mt-3 text-3xl font-black leading-tight">ما الذي تحتاجينه من نفسك هذا الأسبوع؟</h3>
                <p className="mt-4 text-sm leading-8 text-ivory/72">
                  استخدمي هذه المساحة كبداية: كورس واحد للفهم، كتاب واحد للتهدئة، أو جلسة واحدة للوضوح العميق.
                </p>
              </div>
              <div className="grid gap-2">
                <PremiumButton href="/articles" variant="gold" className="w-full">
                  اقرئي مقالًا قصيرًا
                </PremiumButton>
                <PremiumButton href="/booking" variant="outline" className="w-full border-ivory/40 text-ivory hover:bg-ivory hover:text-petrol">
                  اختاري موعد جلسة
                </PremiumButton>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <div className="premium-glow-border rounded-[2.25rem] border border-sand bg-ivory/92 p-6 shadow-premium backdrop-blur-sm">
            <div className="mb-5 flex items-center gap-3">
              <BrandMark size="sm" />
              <div>
                <p className="text-xs font-black text-warm-gray">بطاقة الرحلة</p>
                <h3 className="text-lg font-black text-charcoal">{user?.name || 'مساحتك الخاصة'}</h3>
              </div>
            </div>
            <BrandDivider className="mb-5" />
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="مدفوع" value={data.stats.paidOrders} />
              <MiniMetric label="قيد المراجعة" value={data.stats.pendingOrders} />
              <MiniMetric label="جلسات" value={data.stats.upcomingSessions} />
              <MiniMetric label="محتوى" value={data.stats.paidCourses + data.stats.paidBooks} />
            </div>
          </div>

          <div className="premium-glow-border rounded-[2.25rem] border border-sand bg-petrol p-6 text-ivory shadow-premium">
            <p className="text-xs font-black tracking-[.22em] text-gold">ملخص الاستثمار</p>
            <strong className="mt-4 block text-4xl font-black latin-numerals">{formatEGP(data.stats.totalInvestment)}</strong>
            <p className="mt-3 text-sm leading-7 text-ivory/72">
              إجمالي المحتوى المؤكد داخل رحلتك حتى الآن، ويشمل الكورسات والكتب المدفوعة.
            </p>
          </div>

          <div className="rounded-[2.25rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
            <p className="mini-label mb-3">مساعد هبة</p>
            <h3 className="text-2xl font-black text-charcoal">اختاري بناءً على احتياجك</h3>
            <div className="mt-5 grid gap-3">
              <GuideChoice title="أحتاج فهمًا" href="/courses" />
              <GuideChoice title="أحتاج تهدئة" href="/books" />
              <GuideChoice title="أحتاج وضوحًا شخصيًا" href="/booking" />
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

function DashboardStatCard({ icon, label, value, href, hint }: { icon: string; label: string; value: number; href: string; hint: string }) {
  return (
    <Link href={href} className="premium-glow-border group rounded-[2.1rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-premium">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-xl text-gold transition group-hover:scale-105">
          {icon}
        </span>
        <span className="text-xs font-black text-warm-gray">{hint}</span>
      </div>
      <strong className="mt-5 block text-5xl font-black text-petrol latin-numerals">{value}</strong>
      <p className="mt-2 text-sm font-black text-charcoal">{label}</p>
      <span className="mt-4 inline-block text-xs font-black text-gold">عرض التفاصيل ←</span>
    </Link>
  )
}

function JourneyStageCard({ index, title, description, href, icon }: { index: number; title: string; description: string; href: string; icon: string }) {
  return (
    <Link href={href} className="group relative overflow-hidden rounded-[1.9rem] border border-sand bg-cream/70 p-5 shadow-soft transition hover:-translate-y-1 hover:border-gold/40 hover:bg-ivory hover:shadow-premium">
      <span className="absolute left-5 top-5 latin-numerals text-5xl font-black text-gold/10">0{index}</span>
      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-petrol/10 text-lg text-petrol transition group-hover:bg-petrol group-hover:text-ivory">
        {icon}
      </span>
      <h4 className="relative mt-5 text-xl font-black text-charcoal">{title}</h4>
      <p className="relative mt-2 text-sm leading-7 text-warm-gray">{description}</p>
    </Link>
  )
}

function Panel({ title, eyebrow, actionHref, actionLabel, children }: { title: string; eyebrow: string; actionHref: string; actionLabel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2.25rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mini-label mb-2">{eyebrow}</p>
          <h3 className="text-2xl font-black text-charcoal">{title}</h3>
        </div>
        <Link href={actionHref} className="text-xs font-black text-gold transition hover:text-petrol">
          {actionLabel}
        </Link>
      </div>
      {children}
    </section>
  )
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-sand bg-cream/70 p-4 text-center">
      <strong className="latin-numerals block text-2xl font-black text-petrol">{value}</strong>
      <span className="mt-1 block text-xs font-black text-warm-gray">{label}</span>
    </div>
  )
}

function GuideChoice({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-2xl border border-sand bg-cream/70 px-4 py-3 text-sm font-black text-charcoal transition hover:border-gold/40 hover:bg-gold/10 hover:text-petrol">
      <span>{title}</span>
      <span className="text-gold">←</span>
    </Link>
  )
}

function getMillis(value: Order['createdAt']) {
  if (value instanceof Date) return value.getTime()
  if (value && typeof value === 'object' && 'toDate' in value) return value.toDate().getTime()
  return 0
}
