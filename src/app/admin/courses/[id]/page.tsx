'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import type { Course } from '@/types'
import CourseForm, { CourseFormValues } from '../_components/CourseForm'

export default function EditCoursePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const courseId = params.id

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<Course | null>(null)

  useEffect(() => {
    if (!courseId) return

    async function loadCourse() {
      setLoading(true)

      const courseSnap = await getDoc(doc(db, 'courses', courseId))

      if (!courseSnap.exists()) {
        setCourse(null)
        setLoading(false)
        return
      }

      setCourse({
        id: courseSnap.id,
        ...courseSnap.data(),
      } as Course)

      setLoading(false)
    }

    loadCourse().catch((error) => {
      console.error('Edit course load error:', error)
      setLoading(false)
    })
  }, [courseId])

  async function handleUpdateCourse(values: CourseFormValues) {
    const duplicateSlugSnap = await getDocs(
      query(collection(db, 'courses'), where('slug', '==', values.slug)),
    )

    const duplicateDoc = duplicateSlugSnap.docs.find((docItem) => docItem.id !== courseId)

    if (duplicateDoc) {
      throw new Error('Slug already exists')
    }

    await updateDoc(doc(db, 'courses', courseId), {
      ...values,
      updatedAt: serverTimestamp(),
    })

    router.push('/admin/courses')
    router.refresh()
  }

  if (loading) {
    return (
      <div>
        <PremiumSkeleton className="mb-8 h-10 w-72" />
        <PremiumSkeleton className="h-[720px]" />
      </div>
    )
  }

  if (!course) {
    return (
      <PremiumEmptyState
        icon="📚"
        title="الدورة غير موجودة"
        description="قد تكون الدورة حُذفت أو أن الرابط غير صحيح."
        actionLabel="العودة للدورات"
        actionHref="/admin/courses"
      />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">تعديل دورة</p>
        <h2 className="text-3xl font-black text-charcoal">{course.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
          عدل بيانات الدورة العامة التي تظهر في صفحة الدورة وقائمة الدورات.
        </p>
      </div>

      <CourseForm
        submitLabel="حفظ التعديلات"
        initialValues={{
          title: course.title,
          slug: course.slug,
          description: course.description,
          emotionalPromise: course.emotionalPromise,
          outcomes: course.outcomes,
          targetAudience: course.targetAudience,
          duration: course.duration,
          lessonsCount: course.lessonsCount,
          price: course.price,
          status: course.status,
          coverImageUrl: course.coverImageUrl,
        }}
        onSubmit={handleUpdateCourse}
      />
    </div>
  )
}