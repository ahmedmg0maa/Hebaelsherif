'use server'

import { streamUid } from '@/lib/delivery/stream'
import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { sha256 } from '@/lib/delivery/security'

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

const NO_ENV = 'غير متاح في بيئة العرض التجريبية.'
const NOT_ALLOWED = 'ليس لديك وصول لهذا الدرس.'
const GENERIC = 'حدث خطأ — حاولي مرة أخرى.'

const hasEnv = () => hasSupabasePublicConfig() && hasSupabaseServerSecret()

async function requireUser() {
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

// Resolve a lesson's course + video path and verify the caller may access it.
async function checkLessonAccess(lessonId: string) {
  const { supabase, user } = await requireUser()
  if (!user) return null
  const { data: lesson } = await supabase
    .from('course_lessons')
    .select('id, video_path, is_preview, course_modules!inner(course_id)')
    .eq('id', lessonId)
    .maybeSingle()
  if (!lesson) return null
  const mod = Array.isArray(lesson.course_modules) ? lesson.course_modules[0] : lesson.course_modules
  const courseId = mod?.course_id as string
  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()
  if (!enrollment) return null
  return { user, courseId, videoPath: lesson.video_path as string | null }
}

export async function getLessonVideoUrl(lessonId: string): Promise<ActionResult<{ url: string; kind?: 'stream' | 'file' }>> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const access = await checkLessonAccess(lessonId)
  if (!access) return { ok: false, error: NOT_ALLOWED }
  if (!access.videoPath) return { ok: false, error: 'لم يُرفع فيديو هذا الدرس بعد.' }

  const cookieStore = await cookies()
  let deviceToken = cookieStore.get('heba_delivery_device')?.value
  if (!deviceToken) {
    deviceToken = randomBytes(32).toString('base64url')
    cookieStore.set('heba_delivery_device', deviceToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    })
  }

  const admissionToken = randomBytes(32).toString('base64url')
  const { data, error } = await getServiceClient().rpc('begin_video_admission', {
    p_user_id: access.user.id,
    p_lesson_id: lessonId,
    p_device_hash: sha256(deviceToken),
    p_token_hash: sha256(admissionToken),
  })
  const admission = Array.isArray(data) ? data[0] : data
  if (error || !admission) return { ok: false, error: GENERIC }
  if (admission.status === 'device_limit') {
    return { ok: false, error: 'وصل الحساب إلى الحد المسموح به: جهازان خلال آخر 30 يومًا.' }
  }
  if (admission.status !== 'allowed') return { ok: false, error: NOT_ALLOWED }

  cookieStore.set('heba_video_admission', admissionToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/dashboard/courses/lessons',
    maxAge: 60 * 60 * 4,
  })
  return { ok: true, data: { url: `/dashboard/courses/lessons/${lessonId}/video`, kind: streamUid(access.videoPath) ? 'stream' : 'file' } }
}

export async function getResourceUrl(resourceId: string): Promise<ActionResult<{ url: string }>> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: NOT_ALLOWED }

  // lesson_resources SELECT is already enrollment-gated by RLS.
  const { data: resource } = await supabase
    .from('lesson_resources')
    .select('id, file_path')
    .eq('id', resourceId)
    .maybeSingle()
  if (!resource) return { ok: false, error: NOT_ALLOWED }

  return { ok: true, data: { url: `/dashboard/courses/resources/${resource.id}/download` } }
}

export async function markLessonComplete(lessonId: string, completed: boolean): Promise<ActionResult<{ percent: number }>> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const { user } = await requireUser()
  if (!user) return { ok: false, error: NOT_ALLOWED }
  const { data, error } = await getServiceClient().rpc('set_customer_lesson_completion', {
    p_actor_id: user.id,
    p_lesson_id: lessonId,
    p_completed: completed,
  })
  if (error || typeof data?.percent !== 'number') {
    return { ok: false, error: error?.message.includes('learning_enrollment_required') ? NOT_ALLOWED : GENERIC }
  }
  return { ok: true, data: { percent: Number(data.percent) } }
}

export async function saveNote(lessonId: string, content: string, noteId?: string): Promise<ActionResult<{ id: string }>> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const { user } = await requireUser()
  if (!user) return { ok: false, error: NOT_ALLOWED }
  const trimmed = content.trim()
  if (!trimmed) return { ok: false, error: 'اكتبي ملاحظتك أولًا.' }
  if (trimmed.length > 5000) return { ok: false, error: 'الملاحظة طويلة جدًا؛ الحد الأقصى 5000 حرف.' }
  const { data, error } = await getServiceClient().rpc('save_customer_course_note', {
    p_actor_id: user.id,
    p_lesson_id: lessonId,
    p_content: trimmed,
    p_note_id: noteId ?? null,
  })
  if (error || !data?.noteId) {
    return { ok: false, error: error?.message.includes('learning_enrollment_required') ? NOT_ALLOWED : GENERIC }
  }
  return { ok: true, data: { id: String(data.noteId) } }
}

export async function deleteNote(noteId: string): Promise<ActionResult<null>> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const { user } = await requireUser()
  if (!user) return { ok: false, error: NOT_ALLOWED }
  const { error } = await getServiceClient().rpc('delete_customer_course_note', {
    p_actor_id: user.id,
    p_note_id: noteId,
  })
  if (error) return { ok: false, error: GENERIC }
  return { ok: true, data: null }
}
