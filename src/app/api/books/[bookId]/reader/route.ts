import { NextRequest } from 'next/server'
import { cleanText, jsonError, jsonSuccess, requireUser, trackEvent } from '@/lib/server/admin-guard'
import { getProtectedContentId } from '@/lib/server/product-security'

interface RouteContext {
  params: { bookId: string }
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser(req)
    if (user instanceof Response) return user

    const bookId = cleanText(context.params.bookId, 180)
    if (!bookId) return jsonError('بيانات الكتاب غير صحيحة.', 400)

    const paidSnap = await user.db
      .collection('orders')
      .where('userId', '==', user.uid)
      .where('productId', '==', bookId)
      .where('productType', '==', 'book')
      .where('status', 'in', ['paid', 'access_granted'])
      .limit(1)
      .get()

    if (paidSnap.empty) return jsonError('لا يوجد وصول مؤكد لهذا الكتاب.', 403)

    const [bookSnap, protectedSnap, progressSnap] = await Promise.all([
      user.db.collection('books').doc(bookId).get(),
      user.db.collection('protected_content').doc(getProtectedContentId('book', bookId)).get(),
      user.db.collection('reading_progress').doc(`${user.uid}_${bookId}`).get(),
    ])

    if (!bookSnap.exists) return jsonError('الكتاب غير متوفر حاليًا.', 404)
    const protectedData = protectedSnap.exists ? protectedSnap.data() || {} : {}
    const book = bookSnap.data() || {}

    await trackEvent({ db: user.db, userId: user.uid, name: 'read_book', source: 'dashboard', properties: { bookId } })

    return jsonSuccess({
      book: { id: bookSnap.id, ...book, driveFileUrl: undefined, contentUrl: undefined, resourceUrl: undefined },
      reader: {
        contentUrl: protectedData.contentUrl || '',
        resourceUrl: protectedData.resourceUrl || '',
        watermark: user.email,
        progress: progressSnap.exists ? progressSnap.data() : null,
      },
    })
  } catch (error) {
    console.error('Book reader API error:', error)
    return jsonError('تعذر فتح مساحة القراءة الآن.', 500)
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser(req)
    if (user instanceof Response) return user
    const bookId = cleanText(context.params.bookId, 180)
    const body = (await req.json()) as { chapter?: unknown; progressPercent?: unknown; note?: unknown }
    const progressPercent = Math.max(0, Math.min(100, Number(body.progressPercent || 0)))
    await user.db.collection('reading_progress').doc(`${user.uid}_${bookId}`).set(
      {
        userId: user.uid,
        bookId,
        chapter: cleanText(body.chapter, 180),
        progressPercent,
        note: cleanText(body.note, 1000),
        updatedAt: new Date(),
      },
      { merge: true },
    )
    return jsonSuccess({ progressPercent })
  } catch (error) {
    console.error('Book reader progress API error:', error)
    return jsonError('تعذر تحديث تقدم القراءة الآن.', 500)
  }
}
