import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import type { ProductType } from '@/types'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isProductType(value: unknown): value is ProductType {
  return value === 'course' || value === 'book'
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 })

    const auth = getAdminAuth()
    const db = getAdminDb()
    const decoded = await auth.verifyIdToken(token)
    const body = (await req.json()) as {
      productId?: unknown
      productType?: unknown
      rating?: unknown
      content?: unknown
      userName?: unknown
    }

    const productId = clean(body.productId)
    const productType = body.productType
    const rating = Number(body.rating)
    const content = clean(body.content)
    const userName = clean(body.userName) || decoded.name || 'مستخدمة'

    if (!productId || !isProductType(productType) || !Number.isFinite(rating) || rating < 1 || rating > 5 || content.length < 10) {
      return NextResponse.json({ error: 'بيانات التقييم غير مكتملة.' }, { status: 400 })
    }

    const paidSnap = await db
      .collection('orders')
      .where('userId', '==', decoded.uid)
      .where('productId', '==', productId)
      .where('productType', '==', productType)
      .where('status', '==', 'paid')
      .limit(1)
      .get()

    if (paidSnap.empty) {
      return NextResponse.json({ error: 'يمكن التقييم بعد تأكيد الوصول فقط.' }, { status: 403 })
    }

    await db.collection('reviews').add({
      userId: decoded.uid,
      userName,
      productId,
      productType,
      rating,
      content,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true, status: 'pending' })
  } catch (error) {
    console.error('Reviews API error:', error)
    return NextResponse.json({ error: 'تعذر إرسال التقييم الآن.' }, { status: 500 })
  }
}
