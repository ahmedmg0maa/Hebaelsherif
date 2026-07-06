import type { Book, Course, ProductType } from '@/types'

export type UnifiedProductKind = ProductType | 'workshop' | 'session' | 'bundle' | 'vip_program' | 'free_resource'

export type CommerceStatus = 'draft' | 'published' | 'coming_soon' | 'hidden' | 'archived'
export type AccessMode = 'free' | 'manual_payment' | 'paid_access' | 'admin_grant'

export interface UnifiedProduct {
  id: string
  slug: string
  type: UnifiedProductKind
  title: string
  description: string
  promise?: string
  price: number
  currency: 'EGP'
  status: CommerceStatus
  category?: string
  coverImageUrl?: string
  href: string
  checkoutHref: string
  accessMode: AccessMode
  badge?: string
  metrics?: Array<{ label: string; value: string | number }>
}

export const PRODUCT_TYPE_LABELS: Record<UnifiedProductKind, string> = {
  book: 'كتاب',
  course: 'كورس',
  workshop: 'ورشة',
  session: 'جلسة 1:1',
  bundle: 'باقة',
  vip_program: 'برنامج VIP',
  free_resource: 'مورد مجاني',
}

export const PRODUCT_TYPE_COLORS: Record<UnifiedProductKind, { badge: string; accent: string }> = {
  book: { badge: 'bg-burgundy/10 text-burgundy border-burgundy/20', accent: 'text-burgundy' },
  course: { badge: 'bg-petrol/10 text-petrol border-petrol/20', accent: 'text-petrol' },
  workshop: { badge: 'bg-gold/12 text-gold border-gold/25', accent: 'text-gold' },
  session: { badge: 'bg-cobalt/10 text-cobalt border-cobalt/20', accent: 'text-cobalt' },
  bundle: { badge: 'bg-olive/10 text-olive border-olive/20', accent: 'text-olive' },
  vip_program: { badge: 'bg-burgundy/10 text-burgundy border-burgundy/20', accent: 'text-burgundy' },
  free_resource: { badge: 'bg-taupe/10 text-warm-gray border-sand', accent: 'text-warm-gray' },
}

export function buildCourseProduct(course: Course): UnifiedProduct {
  return {
    id: course.id,
    slug: course.slug,
    type: 'course',
    title: course.title,
    description: course.description,
    promise: course.emotionalPromise,
    price: Number(course.price || 0),
    currency: 'EGP',
    status: course.status === 'published' ? 'published' : course.status === 'coming_soon' ? 'coming_soon' : 'draft',
    category: course.category || 'مسار وعي',
    coverImageUrl: course.coverImageUrl,
    href: `/courses/${course.slug}`,
    checkoutHref: `/checkout/course/${course.slug}`,
    accessMode: Number(course.price || 0) > 0 ? 'manual_payment' : 'free',
    metrics: [
      { label: 'الدروس', value: course.lessonsCount || 0 },
      { label: 'المدة', value: course.duration || 'حسب المسار' },
      { label: 'المستوى', value: course.level || 'مناسب للبداية' },
    ],
  }
}

export function buildBookProduct(book: Book): UnifiedProduct {
  return {
    id: book.id,
    slug: book.slug,
    type: 'book',
    title: book.title,
    description: book.shortDescription || book.description,
    promise: book.emotionalPromise,
    price: Number(book.price || 0),
    currency: 'EGP',
    status: book.status === 'published' ? 'published' : book.status === 'coming_soon' ? 'coming_soon' : 'draft',
    category: book.category || 'كتاب رقمي',
    coverImageUrl: book.coverImageUrl,
    href: `/books/${book.slug}`,
    checkoutHref: `/checkout/book/${book.slug}`,
    accessMode: Number(book.price || 0) > 0 ? 'manual_payment' : 'free',
    metrics: [
      { label: 'الصفحات', value: book.pagesCount || 'رقمي' },
      { label: 'الوصول', value: 'مكتبتك' },
      { label: 'الحماية', value: 'خاص' },
    ],
  }
}

export function formatCommercePrice(price: number, currency: 'EGP' = 'EGP') {
  if (price <= 0) return 'مجاني'
  return `${new Intl.NumberFormat('ar-EG').format(price)} ${currency === 'EGP' ? 'ج.م' : currency}`
}

export function getAccessLabel(accessMode: AccessMode) {
  switch (accessMode) {
    case 'free': return 'وصول فوري'
    case 'manual_payment': return 'بعد تأكيد الدفع'
    case 'paid_access': return 'وصول مدفوع'
    case 'admin_grant': return 'فتح يدوي من الأدمن'
    default: return 'حسب الحالة'
  }
}
