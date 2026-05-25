'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { formatArabicDate, formatEGP } from '@/lib/utils/formatters'
import type { Course, PublishStatus } from '@/types'

const statusFilters: { label: string; value: 'all' | PublishStatus }[] = [
  { label: 'كل الكورسات', value: 'all' },
  { label: 'منشور', value: 'published' },
  { label: 'مسودة', value: 'draft' },
]

function getCreatedAtTime(course: Course) {
  if (!course.createdAt) return 0
  if (course.createdAt instanceof Date) return course.createdAt.getTime()
  if ('toDate' in course.createdAt) return course.createdAt.toDate().getTime()
  return 0
}

export default function AdminCoursesPage() {
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [activeStatus, setActiveStatus] = useState<'all' | PublishStatus>('all')
  const [updatingId, setUpdatingId] = useState('')
  const [deletingId, setDeletingId] = useState('')

  async function loadCourses() {
    setLoading(true)

    const coursesSnap = await getDocs(collection(db, 'courses'))

    const loadedCourses = coursesSnap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as Course[]

    loadedCourses.sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a))

    setCourses(loadedCourses)
    setLoading(false)
  }

  useEffect(() => {
    loadCourses().catch((error) => {
      console.error('Admin courses load error:', error)
      setLoading(false)
    })
  }, [])

  const filteredCourses = useMemo(() => {
    if (activeStatus === 'all') return courses
    return courses.filter((course) => course.status === activeStatus)
  }, [activeStatus, courses])

  async function updateCourseStatus(courseId: string, status: PublishStatus) {
    setUpdatingId(courseId)

    try {
      await updateDoc(doc(db, 'courses', courseId), {
        status,
        updatedAt: serverTimestamp(),
      })

      setCourses((current) =>
        current.map((course) =>
          course.id === courseId
            ? {
                ...course,
                status,
              }
            : course,
        ),
      )
    } catch (error) {
      console.error('Update course status error:', error)
    } finally {
      setUpdatingId('')
    }
  }

  async function deleteCourse(course: Course) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الكورس "${course.title}"؟ هذا الحذف نهائي وقد يؤثر على طلبات مرتبطة بها.`,
    )

    if (!confirmed) return

    setDeletingId(course.id)

    try {
      await deleteDoc(doc(db, 'courses', course.id))
      setCourses((current) => current.filter((item) => item.id !== course.id))
    } catch (error) {
      console.error('Delete course error:', error)
    } finally {
      setDeletingId('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PremiumSkeleton className="h-36" />
        <PremiumSkeleton className="h-36" />
        <PremiumSkeleton className="h-36" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold text-gold">إدارة الكورسات</p>
          <h2 className="text-3xl font-black text-charcoal">الكورسات التعليمية</h2>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
            من هنا يمكنك إضافة الكورسات، تعديل بياناتها العامة، ونشرها أو تحويلها لمسودة.
          </p>
        </div>

        <PremiumButton href="/admin/courses/new">إضافة كورس جديدة</PremiumButton>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveStatus(filter.value)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              activeStatus === filter.value
                ? 'bg-petrol text-cream'
                : 'border border-sand bg-ivory text-warm-gray hover:text-petrol'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredCourses.length === 0 ? (
        <PremiumEmptyState
          icon="📚"
          title="لا توجد كورسات"
          description="ابدأ بإضافة أول كورس من زر إضافة كورس جديدة."
          actionLabel="إضافة كورس"
          actionHref="/admin/courses/new"
        />
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => (
            <article
              key={course.id}
              className="rounded-3xl border border-sand bg-ivory p-5 shadow-soft"
            >
              <div className="grid gap-5 lg:grid-cols-[220px_1fr_220px] lg:items-center">
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-sand">
                  {course.coverImageUrl ? (
                    <Image
                      src={course.coverImageUrl}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="220px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-warm-gray">
                      صورة الكورس
                    </div>
                  )}
                </div>

                <div>
                  <PremiumBadge variant={course.status === 'published' ? 'olive' : 'neutral'}>
                    {course.status === 'published' ? 'منشور' : 'مسودة'}
                  </PremiumBadge>

                  <h3 className="mt-4 text-xl font-black text-charcoal">{course.title}</h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-warm-gray">
                    {course.emotionalPromise || course.description}
                  </p>

                  <div className="mt-4 grid gap-2 text-sm text-warm-gray sm:grid-cols-2">
                    <p>
                      السعر: <strong className="text-petrol">{formatEGP(course.price)}</strong>
                    </p>

                    <p>
                      الدروس:{' '}
                      <strong className="text-charcoal">{course.lessonsCount} درس</strong>
                    </p>

                    <p>
                      المدة: <strong className="text-charcoal">{course.duration}</strong>
                    </p>

                    <p>
                      الإنشاء:{' '}
                      <strong className="text-charcoal">{formatArabicDate(course.createdAt)}</strong>
                    </p>
                  </div>

                  <p className="mt-3 text-xs text-warm-gray" dir="ltr">
                    /courses/{course.slug}
                  </p>
                </div>

                <div className="grid gap-2">
                  <PremiumButton href={`/admin/courses/${course.id}`} size="sm" className="w-full">
                    تعديل
                  </PremiumButton>

                  <PremiumButton href={`/courses/${course.slug}`} size="sm" variant="outline" className="w-full">
                    عرض
                  </PremiumButton>

                  {course.status === 'published' ? (
                    <PremiumButton
                      type="button"
                      size="sm"
                      variant="gold"
                      className="w-full"
                      disabled={updatingId === course.id}
                      onClick={() => updateCourseStatus(course.id, 'draft')}
                    >
                      تحويل لمسودة
                    </PremiumButton>
                  ) : (
                    <PremiumButton
                      type="button"
                      size="sm"
                      variant="gold"
                      className="w-full"
                      disabled={updatingId === course.id}
                      onClick={() => updateCourseStatus(course.id, 'published')}
                    >
                      نشر
                    </PremiumButton>
                  )}

                  <PremiumButton
                    type="button"
                    size="sm"
                    variant="danger"
                    className="w-full"
                    disabled={deletingId === course.id}
                    onClick={() => deleteCourse(course)}
                  >
                    حذف
                  </PremiumButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}