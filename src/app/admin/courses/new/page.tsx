'use client'

export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import CourseForm, { CourseFormValues } from '../_components/CourseForm'

export default function NewCoursePage() {
  const router = useRouter()

  async function handleCreateCourse(values: CourseFormValues) {
    const duplicateSlugSnap = await getDocs(query(collection(db, 'courses'), where('slug', '==', values.slug)))

    if (!duplicateSlugSnap.empty) throw new Error('Slug already exists')

    const { lessons, driveFolderUrl, ...courseValues } = values

    const courseRef = await addDoc(collection(db, 'courses'), {
      ...courseValues,
      lessonsCount: values.lessonsCount || lessons.length,
      studentsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    if (driveFolderUrl) {
      await setDoc(doc(db, 'protected_content', `course_${courseRef.id}`), {
        productId: courseRef.id,
        productType: 'course',
        contentUrl: driveFolderUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    await Promise.all(
      lessons.map((lesson) =>
        addDoc(collection(db, 'course_lessons'), {
          ...lesson,
          courseId: courseRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      ),
    )

    router.push('/admin/courses')
    router.refresh()
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">إضافة كورس</p>
        <h2 className="text-3xl font-black text-charcoal">إنشاء كورس جديد</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
          أضيفي بيانات الكورس والفصول وروابط Google Drive في مكان واحد، ثم اربط المحتوى النهائي من صفحة المحتوى المحمي.
        </p>
      </div>
      <CourseForm submitLabel="حفظ الكورس" onSubmit={handleCreateCourse} />
    </div>
  )
}
