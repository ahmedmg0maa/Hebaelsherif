import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import type { ProductType } from '@/types'

function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function isProductType(value: unknown): value is ProductType {
  return value === 'course' || value === 'book'
}

function getProtectedContentDocumentId(productType: ProductType, productId: string) {
  return `${productType}_${productId}`
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { hasAccess: false, error: 'يجب تسجيل الدخول أولًا.' },
        { status: 401 },
      )
    }

    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()
    const decoded = await adminAuth.verifyIdToken(token)

    const body = (await req.json()) as { productId?: unknown; productType?: unknown }
    const productId = sanitizeText(body.productId)
    const productType = body.productType

    if (!productId || !isProductType(productType)) {
      return NextResponse.json(
        { hasAccess: false, error: 'بيانات المنتج غير صحيحة.' },
        { status: 400 },
      )
    }

    const paidOrdersSnap = await adminDb
      .collection('orders')
      .where('userId', '==', decoded.uid)
      .where('productId', '==', productId)
      .where('productType', '==', productType)
      .where('status', 'in', ['paid', 'access_granted'])
      .limit(1)
      .get()

    if (paidOrdersSnap.empty) {
      return NextResponse.json(
        { hasAccess: false, error: 'لا يوجد طلب مدفوع لهذا المحتوى.' },
        { status: 403 },
      )
    }

    const protectedContentSnap = await adminDb
      .collection('protected_content')
      .doc(getProtectedContentDocumentId(productType, productId))
      .get()

    if (!protectedContentSnap.exists) {
      return NextResponse.json(
        { hasAccess: false, error: 'رابط المحتوى غير متوفر حاليًا.' },
        { status: 404 },
      )
    }

    const protectedContent = protectedContentSnap.data() as {
      contentUrl?: string
      resourceUrl?: string
    } | null

    if (!protectedContent?.contentUrl) {
      return NextResponse.json(
        { hasAccess: false, error: 'رابط المحتوى غير متوفر حاليًا.' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      hasAccess: true,
      contentUrl: protectedContent.contentUrl,
      resourceUrl: protectedContent.resourceUrl || '',
    })
  } catch (error) {
    console.error('Verify access API error:', error)
    return NextResponse.json(
      { hasAccess: false, error: 'تعذر التحقق من الوصول الآن.' },
      { status: 500 },
    )
  }
}
