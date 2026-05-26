'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Course } from '@/types'
import { formatArabicDateTime, formatEGP, formatNumber } from '@/lib/utils/formatters'
import { getReadiness, hasPrivateContentLeak, isPublishedProduct, productStatusMeta, toMillis } from '@/lib/admin/operations'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, ProgressBar, StatusBadge, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface CourseItem extends Course {
  isPublished?: boolean
  seoTitle?: string
  seoDescription?: string
}

function mapDocs<T>(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as T[]
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [protectedItems, setProtectedItems] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [coursesSnap, protectedSnap] = await Promise.all([
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'protected_content')),
      ])
      setCourses(mapDocs<CourseItem>(coursesSnap).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)))
      setProtectedItems(mapDocs<Record<string, unknown>>(protectedSnap))
    } catch (loadError) {
      console.error('Admin courses load error:', loadError)
      setError('تعذر تحميل الكورسات. راجع صلاحيات الأدمن واتصال Firebase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function writeLog(action: string, course: CourseItem, after: Record<string, unknown>) {
    try {
      await addDoc(collection(db, 'admin_logs'), {
        action,
        targetType: 'courses',
        targetId: course.id,
        before: { status: course.status },
        after,
        message: `${action} - ${course.title || course.slug}`,
        createdAt: serverTimestamp(),
      })
    } catch (logError) {
      console.warn('Course log failed:', logError)
    }
  }

  async function updateCourse(course: CourseItem, action: string, values: Record<string, unknown>, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return
    setSavingId(course.id)
    setMessage('')
    setError('')
    try {
      const nextValues = { ...values, updatedAt: serverTimestamp() }
      await updateDoc(doc(db, 'courses', course.id), nextValues)
      await writeLog(action, course, nextValues)
      setCourses((current) => current.map((item) => (item.id === course.id ? ({ ...item, ...values } as CourseItem) : item)))
      setMessage('تم تحديث الكورس بنجاح.')
    } catch (updateError) {
      console.error('Course update error:', updateError)
      setError('تعذر تحديث الكورس. تأكد من الصلاحيات وحاول مرة أخرى.')
    } finally {
      setSavingId('')
    }
  }

  function publishCourse(course: CourseItem) {
    const readiness = getReadiness('course', course, protectedItems)
    if (readiness.score < 100) {
      const ok = window.confirm(`جاهزية النشر ${readiness.score}%. الناقص: ${readiness.missing.join('، ')}. هل تريد المتابعة رغم ذلك؟`)
      if (!ok) return
    }
    updateCourse(course, 'course_published', { status: 'published', isPublished: true, publishedAt: serverTimestamp() }, 'نشر هذا الكورس؟')
  }

  const filteredCourses = useMemo(() => {
    const queryText = search.trim().toLowerCase()
    return courses.filter((course) => {
      const matchesStatus = statusFilter === 'all' || course.status === statusFilter
      const haystack = [course.title, course.slug, course.description, course.category].filter(Boolean).join(' ').toLowerCase()
      return matchesStatus && (!queryText || haystack.includes(queryText))
    })
  }, [courses, search, statusFilter])

  const stats = useMemo(() => ({
    total: courses.length,
    published: courses.filter(isPublishedProduct).length,
    draft: courses.filter((course) => course.status === 'draft').length,
    comingSoon: courses.filter((course) => course.status === 'coming_soon').length,
    leaked: courses.filter((course) => hasPrivateContentLeak(course as unknown as Record<string, unknown>)).length,
    needsContent: courses.filter((course) => isPublishedProduct(course) && getReadiness('course', course, protectedItems).missing.includes('محتوى محمي مربوط')).length,
  }), [courses, protectedItems])

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="محرك نشر الكورسات"
        description="إدارة الكورسات كمنتجات حقيقية: مسودات، قريبًا، نشر آمن، جاهزية، وربط محتوى محمي بدون روابط خاصة عامة."
        actions={<Link href="/admin/courses/new" className="rounded-full bg-gold px-5 py-3 text-xs font-black text-deepTeal shadow-soft">إضافة كورس</Link>}
      />

      {message ? <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="كل الكورسات" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="منشورة" value={formatNumber(stats.published)} tone="success" />
        <MetricCard label="مسودات" value={formatNumber(stats.draft)} tone="muted" />
        <MetricCard label="قريبًا" value={formatNumber(stats.comingSoon)} tone="gold" />
        <MetricCard label="تحتاج محتوى محمي" value={formatNumber(stats.needsContent)} tone={stats.needsContent ? 'danger' : 'success'} />
        <MetricCard label="روابط خاصة عامة" value={formatNumber(stats.leaked)} tone={stats.leaked ? 'danger' : 'success'} />
      </div>

      <AdminPanel title="فلترة الكورسات" description="تابع حالة النشر والجاهزية قبل الظهور للزائرات.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="الحالة">
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="review">مراجعة</option>
              <option value="coming_soon">قريبًا</option>
              <option value="published">منشور</option>
              <option value="hidden">مخفي</option>
              <option value="archived">مؤرشف</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="بحث">
              <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم الكورس، slug، التصنيف..." />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="قائمة الكورسات" description="كل كورس له جاهزية نشر واضحة قبل أن يصبح ظاهرًا ومتاحًا للبيع.">
        {filteredCourses.length === 0 ? (
          <EmptyState title="لا توجد كورسات مطابقة" description="أضيفي كورس كمسودة، ثم راجعي جاهزيته واربطى المحتوى المحمي قبل النشر." action={<Link href="/admin/courses/new" className="rounded-full bg-gold px-5 py-3 text-xs font-black text-deepTeal">إضافة كورس</Link>} />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredCourses.map((course) => {
              const readiness = getReadiness('course', course, protectedItems)
              const leaked = hasPrivateContentLeak(course as unknown as Record<string, unknown>)
              return (
                <article key={course.id} className="rounded-[1.75rem] border border-sand bg-cream/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-black text-charcoal dark:text-ivory">{course.title || 'كورس بدون عنوان'}</h3>
                    <StatusBadge meta={productStatusMeta[String(course.status || 'draft')]} fallback={String(course.status || 'draft')} />
                    {leaked ? <ToneBadge tone="danger">روابط خاصة عامة</ToneBadge> : <ToneBadge tone="success">لا روابط خاصة عامة</ToneBadge>}
                  </div>
                  <p className="line-clamp-2 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{course.description || 'لا يوجد وصف بعد.'}</p>
                  <div className="mt-4 grid gap-3 text-sm font-bold text-warm-gray dark:text-cream md:grid-cols-2">
                    <p>السعر: <span className="text-charcoal dark:text-ivory">{course.price ? formatEGP(course.price) : 'غير محدد'}</span></p>
                    <p>slug: <span className="text-charcoal dark:text-ivory">{course.slug || 'غير محدد'}</span></p>
                    <p>آخر تحديث: <span className="text-charcoal dark:text-ivory">{formatArabicDateTime(course.updatedAt || course.createdAt)}</span></p>
                    <p>الدروس: <span className="text-charcoal dark:text-ivory">{course.lessonsCount || 0}</span></p>
                  </div>
                  <div className="mt-5 rounded-2xl border border-sand bg-ivory/80 p-4 dark:border-gold/25 dark:bg-deepTeal/60">
                    <div className="mb-2 flex items-center justify-between text-xs font-black text-petrol dark:text-gold">
                      <span>جاهزية النشر</span>
                      <span>{readiness.score}%</span>
                    </div>
                    <ProgressBar value={readiness.score} />
                    {readiness.missing.length ? <p className="mt-3 text-xs font-bold text-burgundy dark:text-gold">الناقص: {readiness.missing.join('، ')}</p> : <p className="mt-3 text-xs font-bold text-olive dark:text-ivory">جاهز تشغيليًا.</p>}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href={`/admin/courses/${course.id}`} className="rounded-full border border-gold/35 px-4 py-2 text-xs font-black text-petrol dark:text-gold">تعديل</Link>
                    <AdminActionButton disabled={savingId === course.id} tone="success" onClick={() => publishCourse(course)}>نشر</AdminActionButton>
                    <AdminActionButton disabled={savingId === course.id} tone="gold" onClick={() => updateCourse(course, 'course_coming_soon', { status: 'coming_soon', isPublished: false }, 'تحويل الكورس إلى قريبًا؟')}>قريبًا</AdminActionButton>
                    <AdminActionButton disabled={savingId === course.id} tone="muted" onClick={() => updateCourse(course, 'course_hidden', { status: 'hidden', isPublished: false }, 'إخفاء الكورس؟')}>إخفاء</AdminActionButton>
                    <AdminActionButton disabled={savingId === course.id} tone="danger" onClick={() => updateCourse(course, 'course_archived', { status: 'archived', isPublished: false }, 'أرشفة الكورس؟')}>أرشفة</AdminActionButton>
                    <Link href="/admin/content" className="rounded-full bg-petrol px-4 py-2 text-xs font-black text-ivory">ربط محتوى</Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
