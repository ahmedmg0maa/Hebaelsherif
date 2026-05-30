'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import type { Course, Lesson } from '@/types'
import CourseForm, { CourseFormValues } from '../_components/CourseForm'

export default function EditCoursePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const courseId = params.id

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [protectedContentUrl, setProtectedContentUrl] = useState('')

  useEffect(() => {
    if (!courseId) return

    async function loadCourse() {
      setLoading(true)
      const [courseSnap, lessonsSnap, protectedSnap] = await Promise.all([
        getDoc(doc(db, 'courses', courseId)),
        getDocs(query(collection(db, 'course_lessons'), where('courseId', '==', courseId))),
        getDoc(doc(db, 'protected_content', `course_${courseId}`)),
      ])

      if (!courseSnap.exists()) {
        setCourse(null)
        setLoading(false)
        return
      }

      setCourse({ id: courseSnap.id, ...courseSnap.data() } as Course)
      setLessons(lessonsSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Lesson).sort((a, b) => a.order - b.order))
      setProtectedContentUrl(protectedSnap.exists() ? String(protectedSnap.data().contentUrl || '') : '')
      setLoading(false)
    }

    loadCourse().catch((error) => {
      console.error('Edit course load error:', error)
      setLoading(false)
    })
  }, [courseId])

  async function handleUpdateCourse(values: CourseFormValues) {
    const duplicateSlugSnap = await getDocs(query(collection(db, 'courses'), where('slug', '==', values.slug)))
    const duplicateDoc = duplicateSlugSnap.docs.find((docItem) => docItem.id !== courseId)
    if (duplicateDoc) throw new Error('Slug already exists')

    const { lessons: nextLessons, driveFolderUrl, ...courseValues } = values

    await updateDoc(doc(db, 'courses', courseId), {
      ...courseValues,
      lessonsCount: values.lessonsCount || nextLessons.length,
      updatedAt: serverTimestamp(),
    })

    if (driveFolderUrl) {
      await setDoc(doc(db, 'protected_content', `course_${courseId}`), {
        productId: courseId,
        productType: 'course',
        contentUrl: driveFolderUrl,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    }

    const oldLessonsSnap = await getDocs(query(collection(db, 'course_lessons'), where('courseId', '==', courseId)))
    await Promise.all(oldLessonsSnap.docs.map((docItem) => deleteDoc(doc(db, 'course_lessons', docItem.id))))
    await Promise.all(
      nextLessons.map((lesson) =>
        addDoc(collection(db, 'course_lessons'), {
          ...lesson,
          courseId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      ),
    )

    router.push('/admin/courses')
    router.refresh()
  }

  if (loading) {
    return (
      <div>
        <PremiumSkeleton className="mb-8 h-10 w-72" />
        <PremiumSkeleton className="h-[760px]" />
      </div>
    )
  }

  if (!course) {
    return (
      <PremiumEmptyState icon="📚" title="الكورس غير موجود" description="قد يكون الكورس حُذف أو أن الرابط غير صحيح." actionLabel="العودة للكورسات" actionHref="/admin/courses" />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">تعديل كورس</p>
        <h2 className="text-3xl font-black text-charcoal">{course.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">عدّل بيانات الكورس والفصول. روابط المحتوى تحفظ فقط داخل protected_content.</p>
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
          driveFolderUrl: protectedContentUrl,
          previewVideoUrl: course.previewVideoUrl,
          level: course.level,
          lessons: lessons.map((lesson) => ({
            stageTitle: lesson.stageTitle,
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration,
            order: lesson.order,
          })),
        }}
        onSubmit={handleUpdateCourse}
      />
    </div>
  )
}
