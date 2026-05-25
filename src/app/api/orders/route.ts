import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import type { PaymentMethod, ProductType } from '@/types'

interface ExistingOrder {
  id: string
  status?: string
}

interface ProductData {
  status?: string
  price?: number
}

function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function isProductType(value: unknown): value is ProductType {
  return value === 'course' || value === 'book'
}

function getProductCollection(productType: ProductType) {
  return productType === 'course' ? 'courses' : 'books'
}

async function getAuthenticatedUid(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return null

  const decoded = await getAdminAuth().verifyIdToken(token)
  return decoded.uid
}

export async function GET(req: NextRequest) {
  try {
    const uid = await getAuthenticatedUid(req)

    if (!uid) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 })
    }

    const adminDb = getAdminDb()
    const ordersSnap = await adminDb
      .collection('orders')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get()

    const orders = ordersSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error('Orders GET API error:', error)
    return NextResponse.json({ error: 'لم نتمكن من تحميل الطلبات الآن.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthenticatedUid(req)

    if (!uid) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 })
    }

    const body = (await req.json()) as { productId?: unknown; productType?: unknown; paymentMethod?: unknown; paymentReference?: unknown }
    const productId = sanitizeText(body.productId)
    const productType = body.productType
    const paymentMethod = sanitizeText(body.paymentMethod) as PaymentMethod
    const paymentReference = sanitizeText(body.paymentReference)

    if (!productId || !isProductType(productType)) {
      return NextResponse.json({ error: 'بيانات المنتج غير صحيحة.' }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const productSnap = await adminDb.collection(getProductCollection(productType)).doc(productId).get()

    if (!productSnap.exists) {
      return NextResponse.json({ error: 'المنتج غير موجود.' }, { status: 404 })
    }

    const product = productSnap.data() as ProductData | undefined

    if (product?.status !== 'published') {
      return NextResponse.json({ error: 'هذا المنتج غير متاح للشراء حاليًا.' }, { status: 400 })
    }

    const existingOrdersSnap = await adminDb
      .collection('orders')
      .where('userId', '==', uid)
      .where('productId', '==', productId)
      .where('productType', '==', productType)
      .get()

    const existingOrders: ExistingOrder[] = existingOrdersSnap.docs.map((docItem) => ({
      id: docItem.id,
      status: String(docItem.data().status || ''),
    }))

    const paidOrder = existingOrders.find((order) => order.status === 'paid')
    const pendingOrder = existingOrders.find((order) => ['pending', 'awaiting_payment', 'payment_submitted'].includes(order.status || ''))

    if (paidOrder) {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        orderId: paidOrder.id,
        status: 'paid',
      })
    }

    if (pendingOrder) {
      return NextResponse.json({
        success: true,
        alreadyPending: true,
        orderId: pendingOrder.id,
        status: 'pending',
      })
    }

    const amount = Number(product?.price || 0)

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'سعر المنتج غير صحيح.' }, { status: 400 })
    }

    const orderRef = await adminDb.collection('orders').add({
      userId: uid,
      productId,
      productType,
      amount,
      status: paymentReference ? 'payment_submitted' : 'awaiting_payment',
      paymentStatus: paymentReference ? 'submitted' : 'pending',
      paymentMethod: paymentMethod || 'manual',
      paymentReference,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true, orderId: orderRef.id, status: paymentReference ? 'payment_submitted' : 'awaiting_payment' })
  } catch (error) {
    console.error('Orders POST API error:', error)
    return NextResponse.json({ error: 'تعذر إنشاء طلب الشراء الآن.' }, { status: 500 })
  }
}
