'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { collection, doc, getDoc, getDocs, query, where } from '@/lib/supabase/data-client-compat'
import CoursePlayerShell from '@/components/courses/CoursePlayerShell'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { db } from '@/lib/supabase/client-compat'
import { useAuth } from '@/hooks/useAuth'
import type { Course, CourseProgress, Lesson, Order } from '@/types'

interface LearnState {
  course: Course | null
  lessons: Lesson[]
  progress: CourseProgress | null
  hasAccess: boolean
}

export default function DashboardCourseLearnPage() {
  const params = useParams<{ slug: string }>()
  const slug = useMemo(() => decodeURIComponent(String(params?.slug || '')), [params?.slug])
  const { user, session, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<LearnState>({
    course: null,
    lessons: [],
    progress: null,
    hasAccess: false,
  })

  useEffect(() => {
    if (authLoading) return

    if (!user?.uid || !slug) {
      setLoading(false)
      return
    }

    const userId = user.uid

    async function loadLearningSpace() {
      setLoading(true)

      const coursesSnap = await getDocs(query(collection(db, 'courses'), where('slug', '==', slug)))
      const courseDoc = coursesSnap.docs[0]

      if (!courseDoc) {
        setState({ course: null, lessons: [], progress: null, hasAccess: false })
        setLoading(false)
        return
      }

      const course = { id: courseDoc.id, ...courseDoc.data() } as Course

      const ordersSnap = await getDocs(
        query(
          collection(db, 'orders'),
          where('userId', '==', userId),
          where('productId', '==', course.id),
          where('productType', '==', 'course'),
        ),
      )

      const hasPaidOrder = ordersSnap.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Order)
        .some((order) => order.status === 'paid' || order.status === 'access_granted')

      const accessSnap = await getDocs(
        query(
          collection(db, 'access_records'),
          where('userId', '==', userId),
          where('productId', '==', course.id),
          where('productType', '==', 'course'),
        ),
      )

      const hasManualAccess = accessSnap.docs.some((docItem) => String(docItem.data().status || 'active') === 'active')
      const hasAccess = hasPaidOrder || hasManualAccess

      if (!hasAccess) {
        setState({ course, lessons: [], progress: null, hasAccess: false })
        setLoading(false)
        return
      }

      const [lessonsSnap, progressSnap] = await Promise.all([
        getDocs(query(collection(db, 'course_lessons'), where('courseId', '==', course.id))),
        getDoc(doc(db, 'course_progress', `${userId}_${course.id}`)),
      ])

      const lessons = lessonsSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Lesson)
      const progress = progressSnap.exists() ? (progressSnap.data() as unknown as CourseProgress) : null

      setState({ course, lessons, progress, hasAccess })
      setLoading(false)
    }

    loadLearningSpace().catch((error) => {
      console.error('Learning page error:', error)
      setLoading(false)
    })
  }, [authLoading, slug, user?.uid])

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <PremiumSkeleton className="h-96" />
        <div className="grid gap-5 lg:grid-cols-3">
          <PremiumSkeleton className="h-72" />
          <PremiumSkeleton className="h-72" />
          <PremiumSkeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <PremiumEmptyState
        icon="◈"
        title="سجلي الدخول لمتابعة التعلم"
        description="مساحة التعلم محمية ولا تعرض أي محتوى مدفوع قبل تسجيل الدخول والتحقق من الوصول."
        actionLabel="تسجيل الدخول"
        actionHref={`/auth/login?next=/dashboard/courses/${slug}/learn`}
      />
    )
  }

  if (!state.course) {
    return (
      <PremiumEmptyState
        icon="☾"
        title="هذا الكورس غير متاح"
        description="لم نجد كورسًا بهذا الرابط داخل المنصة. تأكدي من الرابط أو عودي إلى كورساتك."
        actionLabel="العودة لكورساتي"
        actionHref="/dashboard/courses"
      />
    )
  }

  if (!state.hasAccess) {
    return (
      <PremiumEmptyState
        icon="◇"
        title="الوصول لهذا الكورس غير مفعل بعد"
        description="بعد تأكيد الدفع أو فتح الوصول من الأدمن، ستظهر هنا تجربة التعلم كاملة بدون بيانات وهمية."
        actionLabel="عرض كورساتي"
        actionHref="/dashboard/courses"
      />
    )
  }

  return (
    <CoursePlayerShell
      course={state.course}
      lessons={state.lessons}
      initialProgress={state.progress}
      accessToken={session?.access_token}
    />
  )
}
