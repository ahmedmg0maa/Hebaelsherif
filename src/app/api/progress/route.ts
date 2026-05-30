import { NextRequest } from 'next/server'
import { cleanText, jsonError, jsonSuccess, now, requireUser, trackEvent } from '@/lib/server/admin-guard'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    if (user instanceof Response) return user
    const { searchParams } = new URL(req.url)
    const courseId = cleanText(searchParams.get('courseId'), 180)
    if (!courseId) return jsonError('بيانات الكورس غير صحيحة.', 400)
    const snap = await user.db.collection('course_progress').doc(`${user.uid}_${courseId}`).get()
    return jsonSuccess({ progress: snap.exists ? snap.data() : null })
  } catch (error) {
    console.error('Progress GET error:', error)
    return jsonError('تعذر تحميل التقدم الآن.', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    if (user instanceof Response) return user
    const body = (await req.json()) as { courseId?: unknown; lessonId?: unknown; completed?: unknown; totalLessons?: unknown }
    const courseId = cleanText(body.courseId, 180)
    const lessonId = cleanText(body.lessonId, 180)
    const totalLessons = Math.max(1, Number(body.totalLessons || 1))
    if (!courseId || !lessonId) return jsonError('بيانات الدرس غير مكتملة.', 400)

    const ref = user.db.collection('course_progress').doc(`${user.uid}_${courseId}`)
    const snap = await ref.get()
    const before = snap.exists ? snap.data() || {} : {}
    const completedLessonIds = new Set<string>(Array.isArray(before.completedLessonIds) ? before.completedLessonIds.map(String) : [])
    if (body.completed === false) completedLessonIds.delete(lessonId)
    else completedLessonIds.add(lessonId)
    const completedIds = Array.from(completedLessonIds)
    const progressPercent = Math.min(100, Math.round((completedIds.length / totalLessons) * 100))

    await ref.set(
      {
        userId: user.uid,
        courseId,
        completedLessonIds: completedIds,
        lastLessonId: lessonId,
        progressPercent,
        lastViewedAt: now(),
        updatedAt: now(),
        createdAt: before.createdAt || now(),
      },
      { merge: true },
    )
    await trackEvent({ db: user.db, userId: user.uid, name: 'complete_lesson', source: 'dashboard', properties: { courseId, lessonId, progressPercent } })
    return jsonSuccess({ progressPercent, completedLessonIds: completedIds })
  } catch (error) {
    console.error('Progress POST error:', error)
    return jsonError('تعذر تحديث التقدم الآن.', 500)
  }
}
