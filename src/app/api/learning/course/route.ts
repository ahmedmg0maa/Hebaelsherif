import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { getBearerToken } from '@/lib/server/admin-auth'
import { safeObject, text } from '@/lib/server/sanitize'

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 })
    const decoded = await getAdminAuth().verifyIdToken(token)
    const body = safeObject(await req.json())
    const productId = text(body.productId)
    if (!productId) return NextResponse.json({ error: 'معرف الكورس مطلوب.' }, { status: 400 })

    const db = getAdminDb()
    const orderSnap = await db
      .collection('orders')
      .where('userId', '==', decoded.uid)
      .where('productId', '==', productId)
      .where('productType', '==', 'course')
      .where('status', 'in', ['paid', 'access_granted'])
      .limit(1)
      .get()

    if (orderSnap.empty) return NextResponse.json({ error: 'لا يوجد وصول مدفوع لهذا الكورس.' }, { status: 403 })

    const [lessonsSnap, protectedSnap] = await Promise.all([
      db.collection('course_lessons').where('courseId', '==', productId).get(),
      db.collection('protected_content').doc(`course_${productId}`).get(),
    ])

    const lessons = lessonsSnap.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || 'درس بدون عنوان',
          description: data.description || '',
          duration: data.duration || 0,
          order: data.order || data.sortOrder || 0,
          stageTitle: data.stageTitle || '',
          contentUrl: data.contentUrl || '',
          resourceUrl: data.resourceUrl || '',
        }
      })
      .sort((a, b) => Number(a.order) - Number(b.order))

    const protectedContent = protectedSnap.exists ? protectedSnap.data() || {} : {}

    return NextResponse.json({
      hasAccess: true,
      lessons,
      contentUrl: protectedContent.contentUrl || '',
      resourceUrl: protectedContent.resourceUrl || '',
    })
  } catch (error) {
    console.error('Learning course API error:', error)
    return NextResponse.json({ error: 'تعذر تحميل مساحة التعلم.' }, { status: 500 })
  }
}
