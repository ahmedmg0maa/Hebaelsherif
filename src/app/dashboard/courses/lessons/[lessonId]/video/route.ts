import { signedStreamPlayer, streamUid } from '@/lib/delivery/stream'
import { cookies } from 'next/headers'
import { getServerClient, getServiceClient } from '@/lib/supabase/server'
import { privateJson, privateRedirect, sha256 } from '@/lib/delivery/security'

export async function GET(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return privateJson('يلزم تسجيل الدخول.', 401)

  const token = (await cookies()).get('heba_video_admission')?.value
  if (!token) return privateJson('انتهت جلسة المشاهدة. افتحي الدرس مرة أخرى.', 401)

  const service = getServiceClient()
  const { data: admitted, error: admissionError } = await service.rpc('validate_video_admission', {
    p_user_id: user.id,
    p_lesson_id: lessonId,
    p_token_hash: sha256(token),
  })
  if (admissionError || admitted !== true) {
    return privateJson('انتهت جلسة المشاهدة. افتحي الدرس مرة أخرى.', 403)
  }

  const { data: lesson } = await service
    .from('course_lessons')
    .select('video_path')
    .eq('id', lessonId)
    .maybeSingle()
  if (!lesson?.video_path) return privateJson('فيديو الدرس غير متاح.', 404)

  const uid = streamUid(lesson.video_path)
  if (uid) {
    try { const player = await signedStreamPlayer(uid); return player ? privateRedirect(player) : privateJson('تعذر تجهيز فيديو الدورة.', 503) }
    catch { return privateJson('خدمة الفيديو غير متاحة الآن.', 503) }
  }
  const { data, error } = await service.storage.from('course-videos').createSignedUrl(lesson.video_path, 120)
  if (error || !data?.signedUrl) return privateJson('تعذّر تجهيز الفيديو.', 500)
  // Stable same-origin URL: each seek rechecks entitlement and obtains a new
  // short-lived Storage URL, so a long lesson does not expire after 120 seconds.
  const range = _request.headers.get('range')
  if (range && !/^bytes=\d*-\d*$/.test(range)) return privateJson('نطاق غير صالح.', 416)
  // Limit time to response headers, not the duration of the streamed body.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  const upstream = await fetch(data.signedUrl, { headers: range ? {Range:range} : {}, cache:'no-store', signal:controller.signal }).catch(()=>null).finally(() => clearTimeout(timer))
  if (!upstream || ![200,206,416].includes(upstream.status)) return privateJson('تعذر تحميل الفيديو.', 502)
  const headers = new Headers({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'})
  for (const key of ['content-type','content-length','content-range','accept-ranges']) {const value=upstream.headers.get(key);if(value)headers.set(key,value)}
  return new Response(upstream.body,{status:upstream.status,headers})
}
