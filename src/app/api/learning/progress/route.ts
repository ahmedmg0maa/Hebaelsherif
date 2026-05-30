import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { getBearerToken } from '@/lib/server/admin-auth'
import { safeObject, text } from '@/lib/server/sanitize'

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 })
    const decoded = await getAdminAuth().verifyIdToken(token)
    const body = safeObject(await req.json())
    const courseId = text(body.courseId)
    const lessonId = text(body.lessonId)
    const mode = text(body.mode) || 'complete'
    if (!courseId) return NextResponse.json({ error: 'معرف الكورس مطلوب.' }, { status: 400 })

    const db = getAdminDb()
    const progressId = `${decoded.uid}_${courseId}`
    const ref = db.collection('course_progress').doc(progressId)
    const snap = await ref.get()
    const before = snap.data() || {}
    const completed = Array.isArray(before.completedLessonIds) ? before.completedLessonIds.map(String) : []
    const nextCompleted = lessonId && mode === 'complete' && !completed.includes(lessonId) ? [...completed, lessonId] : completed
    await ref.set(
      {
        userId: decoded.uid,
        courseId,
        completedLessonIds: nextCompleted,
        lastLessonId: lessonId || before.lastLessonId || '',
        progressPercent: Number(body.progressPercent || before.progressPercent || 0),
        lastViewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return NextResponse.json({ success: true, completedLessonIds: nextCompleted })
  } catch (error) {
    console.error('Progress API error:', error)
    return NextResponse.json({ error: 'تعذر تحديث التقدم.' }, { status: 500 })
  }
}
