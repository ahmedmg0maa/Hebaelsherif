import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

interface RouteContext {
  params: { courseId: string }
}

interface LessonData {
  courseId?: string
  stageTitle?: string
  title?: string
  description?: string
  duration?: number
  contentUrl?: string
  resourceUrl?: string
  order?: number
  createdAt?: unknown
  updatedAt?: unknown
}

async function hasPaidAccess(req: NextRequest, courseId: string) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return false

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const snap = await getAdminDb()
      .collection('orders')
      .where('userId', '==', decoded.uid)
      .where('productId', '==', courseId)
      .where('productType', '==', 'course')
      .where('status', '==', 'paid')
      .limit(1)
      .get()

    return !snap.empty
  } catch (error) {
    console.error('Course lessons auth check error:', error)
    return false
  }
}

function serializeLesson(id: string, data: LessonData, includeProtected: boolean) {
  const lesson = {
    id,
    courseId: data.courseId || '',
    stageTitle: data.stageTitle || 'فصل تمهيدي',
    title: data.title || 'درس',
    description: data.description || '',
    duration: Number(data.duration || 0),
    order: Number(data.order || 0),
  } as LessonData & { id: string }

  if (includeProtected) {
    lesson.contentUrl = data.contentUrl || ''
    lesson.resourceUrl = data.resourceUrl || ''
  }

  return lesson
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const courseId = context.params.courseId
    if (!courseId) return NextResponse.json({ error: 'بيانات الكورس غير صحيحة.' }, { status: 400 })

    const db = getAdminDb()
    const courseSnap = await db.collection('courses').doc(courseId).get()

    if (!courseSnap.exists) {
      return NextResponse.json({ error: 'هذا المسار غير متاح حاليًا.' }, { status: 404 })
    }

    const courseData = courseSnap.data()
    const includeProtected = await hasPaidAccess(req, courseId)

    if (courseData?.status !== 'published' && !includeProtected) {
      return NextResponse.json({ lessons: [] })
    }

    const lessonsSnap = await db
      .collection('course_lessons')
      .where('courseId', '==', courseId)
      .orderBy('order', 'asc')
      .get()

    const lessons = lessonsSnap.docs.map((docItem) =>
      serializeLesson(docItem.id, docItem.data() as LessonData, includeProtected),
    )

    return NextResponse.json({ success: true, lessons, protected: includeProtected })
  } catch (error) {
    console.error('Course lessons API error:', error)
    return NextResponse.json({ error: 'المحتوى غير متاح الآن.' }, { status: 500 })
  }
}
