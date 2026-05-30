import { NextRequest } from 'next/server'
import { appendTimeline, cleanText, cleanUrl, jsonError, jsonSuccess, now, requireAdmin } from '@/lib/server/admin-guard'
import { getProtectedContentId, isProductType } from '@/lib/server/product-security'
import type { ProductType } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, ['owner', 'super_admin', 'admin', 'content_manager', 'viewer'])
    if (admin instanceof Response) return admin

    const snap = await admin.db.collection('protected_content').limit(300).get()
    const items = snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    return jsonSuccess({ items })
  } catch (error) {
    console.error('Protected content GET error:', error)
    return jsonError('تعذر تحميل المحتوى المحمي الآن.', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, ['owner', 'super_admin', 'admin', 'content_manager'])
    if (admin instanceof Response) return admin

    const body = (await req.json()) as {
      productType?: unknown
      productId?: unknown
      productSlug?: unknown
      title?: unknown
      contentUrl?: unknown
      resourceUrl?: unknown
      accessType?: unknown
      active?: unknown
      note?: unknown
    }
    const productType = body.productType
    const productId = cleanText(body.productId, 180)
    if (!isProductType(productType) || !productId) return jsonError('بيانات الربط غير مكتملة.', 400)

    const contentUrl = cleanUrl(body.contentUrl)
    const resourceUrl = cleanUrl(body.resourceUrl)
    if (!contentUrl) return jsonError('رابط المحتوى المحمي مطلوب وصالح.', 400)

    const documentId = getProtectedContentId(productType as ProductType, productId)
    const ref = admin.db.collection('protected_content').doc(documentId)
    const beforeSnap = await ref.get()
    const before = beforeSnap.exists ? beforeSnap.data() || {} : null
    const values = {
      productType,
      productId,
      productSlug: cleanText(body.productSlug, 180),
      title: cleanText(body.title, 240) || `${productType}_${productId}`,
      contentUrl,
      resourceUrl,
      accessType: cleanText(body.accessType, 80) || 'paid',
      active: body.active !== false,
      updatedAt: now(),
      updatedBy: admin.uid,
      createdAt: before ? before.createdAt || now() : now(),
      createdBy: before ? before.createdBy || admin.uid : admin.uid,
    }

    await ref.set(values, { merge: true })
    await admin.db.collection('admin_logs').add({
      adminId: admin.uid,
      adminEmail: admin.email,
      action: 'protected_content_saved',
      targetType: 'protected_content',
      targetId: documentId,
      before,
      after: { ...values, contentUrl: '[protected]' },
      message: `تم حفظ محتوى محمي لـ ${productType === 'course' ? 'كورس' : 'كتاب'}`,
      createdAt: now(),
    })
    await appendTimeline({
      db: admin.db,
      collectionName: 'protected_content',
      documentId,
      action: 'protected_content_saved',
      title: 'تم تحديث رابط المحتوى المحمي',
      by: admin.email,
      note: cleanText(body.note, 1000),
      meta: { productType, productId, active: values.active },
    })

    return jsonSuccess({ id: documentId, item: { id: documentId, ...values, contentUrl: '[protected]' } })
  } catch (error) {
    console.error('Protected content POST error:', error)
    return jsonError('تعذر حفظ المحتوى المحمي الآن.', 500)
  }
}
