import { getServerClient, getServiceClient } from '@/lib/supabase/server'
import { isUuid, privateJson, privateRedirect, requestFingerprint } from '@/lib/delivery/security'

type Admission = {
  status?: unknown
  bucket?: unknown
  path?: unknown
  title?: unknown
  externalUrl?: unknown
}

export async function GET(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params
  if (!isUuid(resourceId)) return privateJson('الملف غير متاح لهذا الحساب.', 404)

  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return privateJson('يلزم تسجيل الدخول.', 401)

  const service = getServiceClient()
  const { data, error } = await service.rpc('authorize_customer_protected_delivery', {
    p_actor_id: user.id,
    p_delivery_kind: 'course_resource',
    p_entity_id: resourceId,
    p_scope_slug: null,
    p_request_fingerprint: requestFingerprint(request),
  })
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    return privateJson('تعذّر التحقق من صلاحية التحميل.', 500)
  }
  const admission = data as Admission
  if (admission.status === 'rate_limited') {
    return privateJson('وصلتِ إلى حد تجهيز هذا الملف اليومي. حاولي بعد 24 ساعة.', 429)
  }
  if (admission.status !== 'allowed') return privateJson('الملف غير متاح لهذا الحساب.', 403)
  if (typeof admission.externalUrl === 'string') {
    let target: URL
    try {
      target = new URL(admission.externalUrl)
    } catch {
      return privateJson('رابط المورد غير صالح.', 500)
    }
    if (target.protocol !== 'https:') return privateJson('رابط المورد غير صالح.', 500)
    return privateRedirect(target.toString())
  }
  if (admission.bucket !== 'course-resources' || typeof admission.path !== 'string' || typeof admission.title !== 'string') {
    return privateJson('تعذّر تجهيز الملف.', 500)
  }

  const { data: signed, error: signError } = await service.storage
    .from(admission.bucket)
    .createSignedUrl(admission.path, 60, { download: admission.title.slice(0, 160) })
  if (signError || !signed?.signedUrl) return privateJson('تعذّر تجهيز الملف.', 500)
  return privateRedirect(signed.signedUrl)
}
