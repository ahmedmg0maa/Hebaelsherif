'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/permissions'
import { sha256 } from '@/lib/delivery/security'
import { extensionOf, getUploadRule, inspectStoredObject, validateObservedFile } from '@/lib/delivery/file-validation.mjs'
import { getServiceClient } from '@/lib/supabase/server'

type Kind = 'book' | 'lesson-video' | 'lesson-resource' | 'workshop-resource' | 'workshop-recording'
type Result<T> = { ok: true; data: T } | { ok: false; error: string }
type Inspection = { mime?: string; size?: number }
type BindingResult = { id?: string; outcome?: string; replacedPath?: string | null }
type UploadAuthorization = { authorized?: boolean; outcome?: string; id?: string; declaredMime?: string; declaredSize?: number }

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'

async function externalScanVerdict(bucket: string, path: string) {
  const endpoint = process.env.PROTECTED_UPLOAD_SCAN_URL
  if (!endpoint) return 'not_configured' as const
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(process.env.PROTECTED_UPLOAD_SCAN_TOKEN ? { Authorization: `Bearer ${process.env.PROTECTED_UPLOAD_SCAN_TOKEN}` } : {}) },
    body: JSON.stringify({ bucket, path }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null)
  if (!response?.ok) return 'unavailable' as const
  const payload = await response.json().catch(() => null) as { verdict?: string } | null
  return payload?.verdict === 'clean' ? 'clean' as const : 'quarantined' as const
}

async function removePrivateObject(bucket: string, path: string) {
  const { error } = await getServiceClient().storage.from(bucket).remove([path])
  return !error
}

async function recordRejectedUpload(input: {
  actorId: string
  intentId: string
  observed?: Inspection | null
  outcome: 'rejected' | 'quarantined'
  reason: 'signed_upload_issue_failed' | 'direct_storage_upload_failed' | 'server_metadata_or_magic_mismatch' | 'configured_scanner_unavailable' | 'scanner_did_not_return_clean' | 'database_binding_failed' | 'operator_metadata_invalid'
  cleanupConfirmed: boolean
}) {
  return getServiceClient().rpc('record_protected_upload_rejection', {
    p_actor_id: input.actorId,
    p_intent_id: input.intentId,
    p_observed_mime: input.observed?.mime ?? '',
    p_observed_size: input.observed?.size ?? null,
    p_outcome: input.outcome,
    p_reason: input.reason,
    p_cleanup_confirmed: input.cleanupConfirmed,
  })
}

export async function beginProtectedUpload(kind: Kind, entityId: string, file: { name: string; type: string; size: number }): Promise<Result<{ bucket: string; path: string; token: string; intentId: string }>> {
  const admin = await requirePermission('learning.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة ملفات التسليم.' }
  const rule = getUploadRule(kind)
  const extension = extensionOf(file.name)
  const type = rule?.extensions[extension]
  if (!rule || !new RegExp(`^${UUID}$`, 'i').test(entityId) || !type || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > rule.max || !type.mimes.includes(file.type.toLowerCase())) return { ok: false, error: 'امتداد الملف أو نوعه أو حجمه غير مسموح.' }
  const path = `${kind}/${entityId}/${crypto.randomUUID()}.${extension}`
  const service = getServiceClient()
  const intent = await service.rpc('begin_protected_upload_intent', {
    p_actor_id: admin.userId,
    p_upload_kind: kind,
    p_entity_id: entityId,
    p_storage_path: path,
    p_path_hash: sha256(path),
    p_declared_mime: file.type.toLowerCase(),
    p_declared_size: file.size,
  })
  const intentId = typeof intent.data === 'string' ? intent.data : null
  if (intent.error || !intentId) return { ok: false, error: 'تعذّر إنشاء تصريح رفع مرتبط بالمحتوى.' }
  const { data, error } = await service.storage.from(rule.bucket).createSignedUploadUrl(path)
  if (error || !data) {
    await recordRejectedUpload({ actorId: admin.userId, intentId, outcome: 'rejected', reason: 'signed_upload_issue_failed', cleanupConfirmed: false })
    return { ok: false, error: 'تعذّر بدء الرفع الآمن.' }
  }
  return { ok: true, data: { bucket: rule.bucket, path, token: data.token, intentId } }
}

export async function abandonProtectedUpload(kind: Kind, entityId: string, input: { intentId: string; path: string }): Promise<Result<{ abandoned: boolean }>> {
  const admin = await requirePermission('learning.manage')
  const rule = getUploadRule(kind)
  if (!admin?.userId || !rule || !new RegExp(`^${UUID}$`, 'i').test(entityId) || !new RegExp(`^${UUID}$`, 'i').test(input.intentId)) return { ok: false, error: 'مرجع الرفع أو الصلاحية غير صالح.' }
  const authorization = await getServiceClient().rpc('authorize_protected_upload_finalization', {
    p_actor_id: admin.userId, p_intent_id: input.intentId, p_upload_kind: kind, p_entity_id: entityId, p_storage_path: input.path,
  })
  const authorized = authorization.data as UploadAuthorization | null
  if (authorized?.outcome === 'finalized') return { ok: false, error: 'هذا الملف مرتبط بالفعل. حدّثي الصفحة لإدارته من ملفات التسليم.' }
  // Rejection locks the intent again. If a concurrent binding won, it refuses.
  // No Storage deletion is allowed here, including after an ambiguous response.
  if (authorization.error || !authorized) return { ok: false, error: 'تعذّر تأكيد حالة الرفع؛ احتفظي بالمحاولة للتحقق مجددًا.' }
  if (authorized.outcome === 'expired') return { ok: true, data: { abandoned: true } }
  const result = await recordRejectedUpload({ actorId: admin.userId, intentId: input.intentId, outcome: 'rejected', reason: 'direct_storage_upload_failed', cleanupConfirmed: false })
  if (result.error || !result.data) return { ok: false, error: 'لم يتأكد إلغاء المحاولة؛ تحققي من حالة الملف قبل أي رفع جديد.' }
  return { ok: true, data: { abandoned: true } }
}

function refreshDelivery() {
 for (const path of ['/admin/books', '/admin/workshops', '/admin/courses', '/dashboard/books', '/dashboard/workshops', '/dashboard/courses', '/admin/delivery']) revalidatePath(path, 'layout')
}

export async function finalizeProtectedUpload(kind: Kind, entityId: string, input: { intentId: string; path: string; title: string; format?: string; published?: boolean }): Promise<Result<{ id: string }>> {
  const admin = await requirePermission('learning.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة ملفات التسليم.' }
  const rule = getUploadRule(kind)
  const match = input.path.match(new RegExp(`^${kind}/(${UUID})/(${UUID})\\.([a-z0-9]{2,8})$`, 'i'))
  const extension = match?.[3]?.toLowerCase() ?? ''
  const type = rule?.extensions[extension]
  if (!rule || !new RegExp(`^${UUID}$`, 'i').test(input.intentId) || !match || match[1].toLowerCase() !== entityId.toLowerCase() || !type) return { ok: false, error: 'تصريح الملف أو مساره غير صالح.' }

  const service = getServiceClient()
  const authorization = await service.rpc('authorize_protected_upload_finalization', {
    p_actor_id: admin.userId,
    p_intent_id: input.intentId,
    p_upload_kind: kind,
    p_entity_id: entityId,
    p_storage_path: input.path,
  })
  const authorized = authorization.data as UploadAuthorization | null
  if (authorization.error || !authorized) return { ok: false, error: 'تعذّر التحقق من تصريح هذا الملف.' }
  if (authorized.outcome === 'finalized' && authorized.id) { refreshDelivery(); return { ok: true, data: { id: authorized.id } } }
  if (!authorized.authorized || authorized.outcome !== 'authorized') return { ok: false, error: 'التصريح منتهٍ أو مرفوض. ألغِي المحاولة الحالية قبل رفع ملف جديد.' }
  const declaredMime = String(authorized.declaredMime ?? '').toLowerCase()
  const declaredSize = Number(authorized.declaredSize)
  if (!Number.isSafeInteger(declaredSize) || declaredSize <= 0 || declaredSize > rule.max || !type.mimes.includes(declaredMime)) return { ok: false, error: 'بيانات تصريح الرفع غير صالحة.' }
  const title = input.title.trim() || 'ملف محمي'
  const version = String(input.format || '1.0').trim()
  const invalidOperatorMetadata = kind === 'book'
    ? version.length < 1 || version.length > 30 || /[\u0000-\u001f\u007f]/.test(version)
    : title.length < 1 || title.length > 180 || /[\u0000-\u001f\u007f]/.test(title)
  if (invalidOperatorMetadata) {
    const cleanupConfirmed = false // Queue authority commits with the terminal intent; no direct deletion.
    const evidence = await recordRejectedUpload({ actorId: admin.userId, intentId: input.intentId, outcome: 'rejected', reason: 'operator_metadata_invalid', cleanupConfirmed })
    if (evidence.error) return { ok: false, error: 'رُفض الملف، لكن تعذّر حفظ دليل الفحص. راجعي سجل النظام.' }
    return { ok: false, error: kind === 'book' ? 'رقم الإصدار يجب ألا يتجاوز 30 حرفًا.' : 'عنوان الملف يجب ألا يتجاوز 180 حرفًا.' }
  }
  const inspected = await inspectStoredObject(service.storage, rule.bucket, input.path)
  const valid = validateObservedFile({ rule, type, declaredMime, declaredSize, observed: inspected })
  if (!inspected) return { ok: false, error: 'تعذّر قراءة الملف من التخزين. أعيدي التحقق من نفس المحاولة؛ لم يُحذف الملف.' }
  if (!valid) {
    const cleanupConfirmed = false // Queue authority commits with the terminal intent; no direct deletion.
    const evidence = await recordRejectedUpload({ actorId: admin.userId, intentId: input.intentId, observed: inspected, outcome: 'rejected', reason: 'server_metadata_or_magic_mismatch', cleanupConfirmed })
    if (evidence.error) return { ok: false, error: 'رُفض الملف، لكن تعذّر حفظ دليل الفحص. راجعي سجل النظام.' }
    return { ok: false, error: 'رُفض الملف لأن نوعه أو حجمه الفعلي لا يطابق البيانات المعلنة.' }
  }

  const scan = await externalScanVerdict(rule.bucket, input.path)
  if (scan === 'unavailable' || scan === 'quarantined') {
    const cleanupConfirmed = false // Queue authority commits with the terminal intent; no direct deletion.
    const evidence = await recordRejectedUpload({ actorId: admin.userId, intentId: input.intentId, observed: inspected, outcome: 'quarantined', reason: scan === 'unavailable' ? 'configured_scanner_unavailable' : 'scanner_did_not_return_clean', cleanupConfirmed })
    if (evidence.error) return { ok: false, error: 'حُجر الملف، لكن تعذّر حفظ دليل الفحص. راجعي سجل النظام.' }
    return { ok: false, error: 'لم يجتز الملف فحص الأمان، لذلك لم يُنشر.' }
  }

  const binding = await service.rpc('bind_validated_protected_upload', {
    p_actor_id: admin.userId,
    p_intent_id: input.intentId,
    p_title: title,
    p_version: version,
    p_observed_mime: inspected.mime,
    p_observed_size: inspected.size,
    p_validation_method: scan === 'clean' ? 'magic_bytes_and_external_scan' : 'magic_bytes_validation',
    p_published: input.published === true,
  })
  const bound = binding.data as BindingResult | null
  if (binding.error || !bound?.id) {
    // A transport error may follow a committed binding. NEVER delete or reject
    // on this branch. Retrying this same intent resolves through the DB ledger.
    return { ok: false, error: 'لم يتأكد ربط الملف. أعيدي التحقق من نفس المحاولة؛ الملف محفوظ ولم يُحذف.' }
  }
  // Replacement cleanup is queued by the same DB transaction, including on lost responses.
  refreshDelivery()
  return { ok: true, data: { id: bound.id } }
}

export async function archiveProtectedDelivery(kind: Kind, entityId: string, recordId: string, expectedHash?: string): Promise<Result<{ jobId: string }>> {
 const admin = await requirePermission('learning.manage')
 if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إزالة ملفات التسليم.' }
 const uuid = new RegExp(`^${UUID}$`, 'i')
 if (!getUploadRule(kind) || !uuid.test(entityId) || !uuid.test(recordId) || (kind === 'lesson-video' && !/^[0-9a-f]{64}$/.test(expectedHash ?? ''))) return { ok: false, error: 'مرجع ملف التسليم غير صالح.' }
 const { data, error } = await getServiceClient().rpc('archive_protected_delivery_v2', {
  p_actor_id: admin.userId, p_delivery_kind: kind, p_entity_id: entityId, p_record_id: recordId, p_expected_hash: expectedHash ?? null,
 })
 if (error || data?.outcome !== 'archived' || !data?.jobId) return { ok: false, error: error?.message.includes('protected_delivery_version_conflict') ? 'تغيّر فيديو الدرس. حدّثي الصفحة قبل إزالة الملف الحالي.' : 'لم تتأكد الإزالة. حدّثي الصفحة وراجعي سجل تنظيف الملفات قبل إعادة المحاولة.' }
 refreshDelivery()
 return { ok: true, data: { jobId: data.jobId } }
}

export async function retryProtectedCleanup(jobId: string): Promise<{ ok: true; notice: string } | { ok: false; error: string }> {
 const admin = await requirePermission('learning.manage')
 if (!admin?.userId || !new RegExp(`^${UUID}$`, 'i').test(jobId)) return { ok: false, error: 'مرجع المهمة أو الصلاحية غير صالح.' }
 const service = getServiceClient()
 const { data: claim, error } = await service.rpc('claim_protected_cleanup', { p_actor_id: admin.userId, p_job_id: jobId })
 if (error || !claim) return { ok: false, error: 'تعذّر حجز مهمة التنظيف.' }
 if (claim.outcome !== 'claimed') {
  revalidatePath('/admin/delivery')
  const messages: Record<string, string> = { removed: 'سُجّل حذف الملف من قبل.', waiting: 'المهمة تنتظر انتهاء مهلة الأمان أو محاولة جارية.', referenced: 'لم يُحذف الملف لأنه ما زال مرتبطًا بمحتوى آخر.', unmanaged: 'هذا ملف تاريخي غير مُدار؛ يتطلب تسوية منفصلة دون حذف تلقائي.' }
  return { ok: true, notice: messages[claim.outcome] ?? 'لم يبدأ حذف الملف.' }
 }
 const safe = ['protected-books', 'course-videos', 'course-resources', 'workshop-recordings'].includes(claim.bucket)
  && typeof claim.storagePath === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,1023}$/.test(claim.storagePath)
  && !/(^|\/)\.\.(\/|$)/.test(claim.storagePath) && sha256(claim.storagePath) === claim.pathHash
  && typeof claim.token === 'string' && new RegExp(`^${UUID}$`, 'i').test(claim.token)
 const removed = safe && await removePrivateObject(claim.bucket, claim.storagePath).catch(() => false)
 const result = await service.rpc('complete_protected_cleanup', { p_actor_id: admin.userId, p_job_id: jobId, p_token: claim.token, p_removed: removed })
 revalidatePath('/admin/delivery')
 if (result.error || result.data !== true) return { ok: false, error: 'تعذّر تسجيل نتيجة التخزين؛ ستتاح مراجعة المهمة بعد انتهاء حجزها.' }
 return removed ? { ok: true, notice: 'تم حذف الملف وتسجيل النتيجة.' } : { ok: false, error: 'تعذّر حذف الملف؛ المهمة محفوظة لإعادة المحاولة بعد خمس دقائق.' }
}

export async function expireProtectedUploads(): Promise<{ ok: true; notice: string } | { ok: false; error: string }> {
 const admin = await requirePermission('learning.manage')
 if (!admin?.userId) return { ok: false, error: 'لا توجد صلاحية لإدارة الملفات.' }
 const { data, error } = await getServiceClient().rpc('expire_protected_uploads', { p_actor_id: admin.userId })
 if (error || !Number.isSafeInteger(data)) return { ok: false, error: 'تعذّر تسوية التصاريح المنتهية.' }
 revalidatePath('/admin/delivery')
 return { ok: true, notice: `تمت تسوية ${data.toLocaleString('ar-EG')} تصريح منتهٍ وإدراجه للتنظيف. تعالج كل محاولة حتى ١٠٠ تصريح.` }
}
