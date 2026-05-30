import { NextRequest } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { asRecord, cleanString, jsonError, jsonSuccess, requireAdmin, sanitizeForPublicProduct } from '@/lib/server/admin-api'

const allowedActions = new Set(['publish', 'hide', 'archive', 'coming_soon', 'draft', 'review', 'update'])
const productCollections: Record<string, string> = { course: 'courses', book: 'books' }

function hasPrivateLeak(data: Record<string, unknown>) {
  const cleaned = sanitizeForPublicProduct(data)
  return Object.keys(data).length !== Object.keys(cleaned).length
}

function getPublishMissing(data: Record<string, unknown>, hasProtectedContent: boolean) {
  const missing: string[] = []
  if (!cleanString(data.title)) missing.push('العنوان')
  if (!cleanString(data.slug)) missing.push('الرابط المختصر')
  if (!cleanString(data.description) && !cleanString(data.shortDescription)) missing.push('الوصف')
  const price = Number(data.price || 0)
  if ((!Number.isFinite(price) || price <= 0) && data.status !== 'coming_soon') missing.push('السعر')
  if (hasPrivateLeak(data)) missing.push('إزالة الروابط الخاصة من المنتج العام')
  if (!hasProtectedContent) missing.push('ربط محتوى محمي')
  return missing
}

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { productType: string; productId: string } }) {
  try {
    const { error, context } = await requireAdmin(req, ['owner', 'admin', 'super_admin', 'content_manager'])
    if (error || !context) return error

    const productType = cleanString(params.productType)
    const productId = cleanString(params.productId)
    const collectionName = productCollections[productType]
    if (!collectionName || !productId) return jsonError('بيانات المنتج غير صحيحة.', 400)

    const body = asRecord(await req.json().catch(() => ({})))
    const action = cleanString(body.action)
    const values = sanitizeForPublicProduct(asRecord(body.values))
    if (!allowedActions.has(action)) return jsonError('إجراء المنتج غير مدعوم.', 400)

    const productRef = context.db.collection(collectionName).doc(productId)
    const productSnap = await productRef.get()
    if (!productSnap.exists) return jsonError('المنتج غير موجود.', 404)

    const before = productSnap.data() || {}
    const protectedDocId = `${productType}_${productId}`
    const protectedSnap = await context.db.collection('protected_content').doc(protectedDocId).get()
    const now = Timestamp.now()
    const update: Record<string, unknown> = { updatedAt: now, updatedBy: context.uid, ...values }

    if (action === 'publish') {
      const merged = { ...before, ...values, status: 'published' }
      const missing = getPublishMissing(merged, protectedSnap.exists)
      if (missing.length > 0) return jsonError('لا يمكن النشر قبل اكتمال جاهزية المنتج.', 400, { missing })
      Object.assign(update, { status: 'published', publishedAt: now, publishedBy: context.uid, currency: 'EGP' })
    }
    if (action === 'hide') Object.assign(update, { status: 'hidden', hiddenAt: now, hiddenBy: context.uid })
    if (action === 'archive') Object.assign(update, { status: 'archived', archivedAt: now, archivedBy: context.uid })
    if (action === 'coming_soon') Object.assign(update, { status: 'coming_soon' })
    if (action === 'draft') Object.assign(update, { status: 'draft' })
    if (action === 'review') Object.assign(update, { status: 'review' })

    await productRef.set(update, { merge: true })
    await context.db.collection('admin_logs').add({
      adminId: context.uid,
      adminEmail: context.email || '',
      action: `product_${action}`,
      targetType: collectionName,
      targetId: productId,
      before: { status: before.status || '', privateLeak: hasPrivateLeak(before) },
      after: update,
      createdAt: now,
    })

    return jsonSuccess({ productId, productType, action, values: update })
  } catch (error) {
    console.error('Admin product route error:', error)
    return jsonError('تعذر تحديث المنتج الآن.', 500)
  }
}
