'use client'

import { useRouter } from 'next/navigation'
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import CourseForm, { CourseFormValues } from '../_components/CourseForm'

export default function NewCoursePage() {
  const router = useRouter()

  async function handleCreateCourse(values: CourseFormValues) {
    const duplicateSlugSnap = await getDocs(
      query(collection(db, 'courses'), where('slug', '==', values.slug)),
    )

    if (!duplicateSlugSnap.empty) {
      throw new Error('Slug already exists')
    }

    await addDoc(collection(db, 'courses'), {
      ...values,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    router.push('/admin/courses')
    router.refresh()
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">إضافة دورة</p>
        <h2 className="text-3xl font-black text-charcoal">إنشاء دورة جديدة</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
          أضف بيانات الدورة التسويقية العامة. محتوى الدروس وروابط الوصول ستتم إدارتها لاحقًا من
          نظام المحتوى المحمي.
        </p>
      </div>

      <CourseForm submitLabel="حفظ الدورة" onSubmit={handleCreateCourse} />
    </div>
  )
}