import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'

export type LearnResource = { id: string; title: string; kind: string; sizeBytes: number | null }

export type LearnLesson = {
  id: string
  title: string
  description: string
  durationSeconds: number
  isPreview: boolean
  hasVideo: boolean
  completed: boolean
}

export type LearnModule = { id: string; title: string; lessons: LearnLesson[] }

export type LearnNote = { id: string; lessonId: string; content: string; updatedAt: string }

export type LearnData = {
  courseId: string
  slug: string
  title: string
  enrolled: boolean
  percent: number
  modules: LearnModule[]
  resources: Record<string, LearnResource[]> // keyed by lessonId
  notes: LearnNote[]
}

const hasEnv = hasSupabasePublicConfig

export async function getLearnData(slug: string): Promise<LearnData | null> {
  if (!hasEnv()) return null
  try {
    const supabase = await getServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(
        'id, slug, title, course_modules(id, title, sort, course_lessons(id, title, description, video_path, duration_seconds, sort, is_preview, lesson_resources(id, title, kind, size_bytes)))',
      )
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()
    if (courseError) throw new Error('LEARNING_COURSE_READ_UNAVAILABLE')
    if (!course) return null

    const lessonIds = (course.course_modules ?? []).flatMap((module) => (module.course_lessons ?? []).map((lesson) => lesson.id))
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .maybeSingle()
    if (enrollmentError) throw new Error('LEARNING_ENROLLMENT_READ_UNAVAILABLE')
    if (!enrollment) {
      return {
        courseId: course.id, slug: course.slug, title: course.title, enrolled: false,
        percent: 0, modules: [], resources: {}, notes: [],
      }
    }

    const [progressResponse, lessonProgressResponse, notesResponse] = await Promise.all([
      supabase.from('course_progress').select('percent').eq('user_id', user.id).eq('course_id', course.id).maybeSingle(),
      lessonIds.length > 0
        ? supabase.from('lesson_progress').select('lesson_id, completed_at').eq('user_id', user.id).in('lesson_id', lessonIds)
        : Promise.resolve({ data: [], error: null }),
      lessonIds.length > 0
        ? supabase.from('course_notes').select('id, lesson_id, content, updated_at').eq('user_id', user.id).in('lesson_id', lessonIds).order('updated_at', { ascending: false }).limit(500)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (progressResponse.error || lessonProgressResponse.error || notesResponse.error) {
      throw new Error('LEARNING_STATE_READ_UNAVAILABLE')
    }
    const progress = progressResponse.data
    const lessonProgress = lessonProgressResponse.data
    const notes = notesResponse.data

    const completedSet = new Set((lessonProgress ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id))
    const resources: Record<string, LearnResource[]> = {}

    const modules: LearnModule[] = (course.course_modules ?? [])
      .sort((a, b) => a.sort - b.sort)
      .map((m) => ({
        id: m.id,
        title: m.title,
        lessons: (m.course_lessons ?? [])
          .sort((a, b) => a.sort - b.sort)
          .map((l) => {
            resources[l.id] = (l.lesson_resources ?? []).map((r) => ({
              id: r.id,
              title: r.title,
              kind: r.kind,
              sizeBytes: r.size_bytes,
            }))
            return {
              id: l.id,
              title: l.title,
              description: l.description,
              durationSeconds: l.duration_seconds,
              isPreview: l.is_preview,
              hasVideo: Boolean(l.video_path),
              completed: completedSet.has(l.id),
            }
          }),
      }))

    return {
      courseId: course.id,
      slug: course.slug,
      title: course.title,
      enrolled: true,
      percent: progress ? Number(progress.percent) : 0,
      modules,
      resources,
      notes: (notes ?? []).map((n) => ({ id: n.id, lessonId: n.lesson_id, content: n.content, updatedAt: n.updated_at })),
    }
  } catch {
    throw new Error('LEARNING_STATE_UNAVAILABLE')
  }
}
