import { getServerClient, getServiceClient } from '@/lib/supabase/server'
import { isUuid, privateJson, privateRedirect, requestFingerprint } from '@/lib/delivery/security'

type Admission = {
  status?: unknown
  bucket?: unknown
  path?: unknown
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  if (!isUuid(id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return privateJson('التسجيل غير متاح.', 404)

  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return privateRedirect(new URL('/auth/login', request.url).toString())

  const service = getServiceClient()
  const { data, error } = await service.rpc('authorize_customer_protected_delivery', {
    p_actor_id: user.id,
    p_delivery_kind: 'workshop_recording',
    p_entity_id: id,
    p_scope_slug: slug,
    p_request_fingerprint: requestFingerprint(request),
  })
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    return privateJson('تعذّر التحقق من صلاحية التسجيل.', 500)
  }
  const admission = data as Admission
  if (admission.status === 'rate_limited') {
    return privateJson('وصلتِ إلى حد تجهيز هذا التسجيل اليومي. حاولي بعد 24 ساعة.', 429)
  }
  if (admission.status !== 'allowed') return privateJson('التسجيل غير متاح لهذا الحساب.', 403)
  if (admission.bucket !== 'workshop-recordings' || typeof admission.path !== 'string') {
    return privateJson('تعذّر تجهيز التسجيل.', 500)
  }

  const { data: signed, error: signError } = await service.storage
    .from(admission.bucket)
    .createSignedUrl(admission.path, 90)
  if (signError || !signed?.signedUrl) return privateJson('تعذّر تجهيز التسجيل.', 500)
  return privateRedirect(signed.signedUrl)
}
