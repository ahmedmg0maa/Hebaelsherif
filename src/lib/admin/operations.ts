import type { Booking, Book, Course, FirestoreDate, Order, ProductType } from '@/types'

export type AdminTone = 'petrol' | 'gold' | 'olive' | 'burgundy' | 'muted' | 'success' | 'warning' | 'danger'

export interface StatusMeta {
  label: string
  description: string
  tone: AdminTone
}

export const orderStatusMeta: Record<string, StatusMeta> = {
  pending: { label: 'طلب جديد', description: 'يحتاج متابعة أولية', tone: 'warning' },
  awaiting_payment: { label: 'بانتظار الدفع', description: 'لم يصل إثبات الدفع بعد', tone: 'warning' },
  payment_submitted: { label: 'إثبات مرسل', description: 'يحتاج مراجعة الدفع', tone: 'petrol' },
  paid: { label: 'دفع مؤكد', description: 'الدفع تم تأكيده', tone: 'success' },
  access_granted: { label: 'محتوى مفتوح', description: 'تم فتح الوصول للعميلة', tone: 'success' },
  rejected: { label: 'مرفوض', description: 'تم رفض الطلب أو الدفع', tone: 'danger' },
  failed: { label: 'فشل الدفع', description: 'الدفع لم يكتمل', tone: 'danger' },
  refunded: { label: 'مسترد', description: 'تم رد المبلغ', tone: 'muted' },
  cancelled: { label: 'ملغي', description: 'تم إلغاء الطلب', tone: 'muted' },
}

export const bookingStatusMeta: Record<string, StatusMeta> = {
  pending: { label: 'طلب حجز جديد', description: 'يحتاج تأكيد الموعد', tone: 'warning' },
  awaiting_payment: { label: 'بانتظار الدفع', description: 'الموعد ينتظر الدفع', tone: 'warning' },
  payment_submitted: { label: 'إثبات مرسل', description: 'الدفع يحتاج مراجعة', tone: 'petrol' },
  confirmed: { label: 'موعد مؤكد', description: 'الجلسة مؤكدة', tone: 'success' },
  completed: { label: 'مكتملة', description: 'تمت الجلسة', tone: 'success' },
  cancelled: { label: 'ملغية', description: 'تم إلغاء الحجز', tone: 'danger' },
  no_show: { label: 'لم يحضر', description: 'لم يتم حضور الجلسة', tone: 'danger' },
  reschedule_requested: { label: 'إعادة جدولة', description: 'تحتاج اختيار موعد جديد', tone: 'warning' },
}

export const paymentStatusMeta: Record<string, StatusMeta> = {
  not_required: { label: 'غير مطلوب', description: 'لا يوجد دفع مطلوب', tone: 'muted' },
  pending: { label: 'بانتظار الدفع', description: 'لا يوجد إثبات بعد', tone: 'warning' },
  submitted: { label: 'إثبات مرسل', description: 'بانتظار المراجعة', tone: 'petrol' },
  confirmed: { label: 'مؤكد', description: 'تم التحقق من الدفع', tone: 'success' },
  failed: { label: 'فشل/مرفوض', description: 'لم يتم قبول الدفع', tone: 'danger' },
  refunded: { label: 'مسترد', description: 'تم رد الدفع', tone: 'muted' },
}

export const productStatusMeta: Record<string, StatusMeta> = {
  draft: { label: 'مسودة', description: 'غير منشور', tone: 'muted' },
  review: { label: 'مراجعة', description: 'يحتاج مراجعة قبل النشر', tone: 'warning' },
  coming_soon: { label: 'قريبًا', description: 'يظهر كتجربة انتظار راقية', tone: 'gold' },
  published: { label: 'منشور', description: 'ظاهر للزائرات', tone: 'success' },
  hidden: { label: 'مخفي', description: 'غير ظاهر للزائرات', tone: 'muted' },
  archived: { label: 'مؤرشف', description: 'خارج التشغيل', tone: 'muted' },
}

export const reviewStatusMeta: Record<string, StatusMeta> = {
  pending: { label: 'بانتظار الاعتماد', description: 'لم يظهر للزائرات بعد', tone: 'warning' },
  approved: { label: 'معتمد', description: 'ظاهر في الموقع', tone: 'success' },
  published: { label: 'منشور', description: 'ظاهر في الموقع', tone: 'success' },
  rejected: { label: 'مرفوض', description: 'لن يظهر للزائرات', tone: 'danger' },
  hidden: { label: 'مخفي', description: 'مخفي مؤقتًا', tone: 'muted' },
}

export const messageStatusMeta: Record<string, StatusMeta> = {
  new: { label: 'جديدة', description: 'تحتاج قراءة', tone: 'warning' },
  read: { label: 'مقروءة', description: 'تمت مراجعتها', tone: 'petrol' },
  replied: { label: 'تم الرد', description: 'تم التواصل معها', tone: 'success' },
  important: { label: 'مهمة', description: 'تحتاج متابعة', tone: 'gold' },
  archived: { label: 'مؤرشفة', description: 'خارج قائمة المتابعة', tone: 'muted' },
}

export const privateContentFields = [
  'contentUrl',
  'contentURL',
  'protectedUrl',
  'protectedURL',
  'downloadUrl',
  'downloadURL',
  'fileUrl',
  'fileURL',
  'driveUrl',
  'driveURL',
  'driveFileUrl',
  'driveFileURL',
  'driveFolderUrl',
  'driveFolderURL',
  'googleDriveUrl',
  'googleDriveURL',
  'resourceUrl',
  'resourceURL',
  'videoUrl',
  'videoURL',
  'pdfUrl',
  'pdfURL',
  'secretUrl',
  'secretURL',
  'privateUrl',
  'privateURL',
  'accessUrl',
  'accessURL',
] as const

export function asDate(value: FirestoreDate | string | Date | undefined | null) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === 'object' && 'toDate' in value) {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

export function toMillis(value: FirestoreDate | string | Date | undefined | null) {
  return asDate(value)?.getTime() || 0
}

export function isToday(value: FirestoreDate | string | Date | undefined | null) {
  const date = asDate(value)
  if (!date) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

export function getProductTitle(item: { productTitle?: string; title?: string; slug?: string; productId?: string }) {
  return item.productTitle || item.title || item.slug || item.productId || 'بدون عنوان'
}

export function getCustomerName(item: { customerName?: string; userName?: string; name?: string; email?: string; userId?: string }) {
  return item.customerName || item.userName || item.name || item.email || item.userId || 'عميلة غير محددة'
}

export function getAmount(item: { amount?: number; finalAmount?: number; price?: number }) {
  return Number(item.amount ?? item.finalAmount ?? item.price ?? 0) || 0
}

export function isPaidOrder(order: Partial<Order>) {
  return order.status === 'paid' || order.status === 'access_granted'
}

export function isConfirmedBooking(booking: Partial<Booking>) {
  return booking.status === 'confirmed' || booking.status === 'completed'
}

export function isPublishedProduct(product: Partial<Course & Book>) {
  return product.status === 'published' || Boolean((product as { isPublished?: boolean }).isPublished)
}

export function hasPrivateContentLeak(item: Record<string, unknown>) {
  return privateContentFields.some((field) => typeof item[field] === 'string' && String(item[field]).trim().length > 0)
}

export function hasProtectedContentFor(productType: ProductType, product: Partial<Course & Book>, protectedItems: Array<Record<string, unknown>>) {
  const id = String(product.id || '')
  const slug = String(product.slug || '')
  return protectedItems.some((item) => {
    const itemType = String(item.productType || item.type || '')
    const itemProductId = String(item.productId || '')
    const itemProductSlug = String(item.productSlug || item.slug || '')
    return itemType === productType && Boolean(id || slug) && (itemProductId === id || itemProductSlug === slug)
  })
}

export function getReadiness(productType: ProductType, product: Partial<Course & Book>, protectedItems: Array<Record<string, unknown>>) {
  const checks = [
    { label: 'العنوان', passed: Boolean(product.title) },
    { label: 'الرابط المختصر', passed: Boolean(product.slug) },
    { label: 'الوصف', passed: Boolean(product.description || (product as Partial<Book>).shortDescription) },
    { label: 'السعر أو قريبًا', passed: Number(product.price || 0) > 0 || product.status === 'coming_soon' },
    { label: 'بدون روابط خاصة عامة', passed: !hasPrivateContentLeak(product as Record<string, unknown>) },
    { label: 'محتوى محمي مربوط', passed: product.status !== 'published' || hasProtectedContentFor(productType, product, protectedItems) },
  ]
  const passed = checks.filter((check) => check.passed).length
  return {
    checks,
    score: Math.round((passed / checks.length) * 100),
    missing: checks.filter((check) => !check.passed).map((check) => check.label),
  }
}

export function buildOperationalAlerts(params: {
  orders: Array<Partial<Order>>
  bookings: Array<Partial<Booking>>
  courses: Array<Partial<Course>>
  books: Array<Partial<Book>>
  protectedItems: Array<Record<string, unknown>>
  messages?: Array<{ status?: unknown }>
}) {
  const alerts: Array<{ title: string; description: string; href: string; tone: AdminTone }> = []

  const paymentSubmitted = params.orders.filter((order) => order.status === 'payment_submitted').length
  if (paymentSubmitted > 0) {
    alerts.push({ title: `${paymentSubmitted} إثبات دفع يحتاج مراجعة`, description: 'راجعي الطلبات المؤكدة قبل فتح المحتوى.', href: '/admin/orders', tone: 'warning' })
  }

  const paidWithoutAccess = params.orders.filter((order) => order.status === 'paid').length
  if (paidWithoutAccess > 0) {
    alerts.push({ title: `${paidWithoutAccess} طلب مدفوع لم يُفتح محتواه`, description: 'افتحي الوصول بعد التأكد من المنتج والمحتوى المحمي.', href: '/admin/orders', tone: 'gold' })
  }

  const pendingBookings = params.bookings.filter((booking) => booking.status === 'pending' || booking.status === 'payment_submitted').length
  if (pendingBookings > 0) {
    alerts.push({ title: `${pendingBookings} حجز يحتاج إجراء`, description: 'راجعي الموعد والدفع قبل التأكيد.', href: '/admin/bookings', tone: 'petrol' })
  }

  const confirmedWithoutMeeting = params.bookings.filter((booking) => booking.status === 'confirmed' && !booking.meetingUrl).length
  if (confirmedWithoutMeeting > 0) {
    alerts.push({ title: `${confirmedWithoutMeeting} حجز مؤكد بدون رابط جلسة`, description: 'أضيفي رابط الجلسة أو وسيلة التواصل.', href: '/admin/bookings', tone: 'warning' })
  }

  const publishedCoursesWithoutContent = params.courses.filter((course) => isPublishedProduct(course) && !hasProtectedContentFor('course', course, params.protectedItems)).length
  if (publishedCoursesWithoutContent > 0) {
    alerts.push({ title: `${publishedCoursesWithoutContent} كورس منشور بدون محتوى محمي`, description: 'اربطي المحتوى المحمي قبل استقبال مدفوعات جديدة.', href: '/admin/content', tone: 'danger' })
  }

  const publishedBooksWithoutContent = params.books.filter((book) => isPublishedProduct(book) && !hasProtectedContentFor('book', book, params.protectedItems)).length
  if (publishedBooksWithoutContent > 0) {
    alerts.push({ title: `${publishedBooksWithoutContent} كتاب منشور بدون ملف محمي`, description: 'اربطي ملف الكتاب في صفحة المحتوى المحمي.', href: '/admin/content', tone: 'danger' })
  }

  const leakedProducts = [...params.courses, ...params.books].filter((item) => hasPrivateContentLeak(item as Record<string, unknown>)).length
  if (leakedProducts > 0) {
    alerts.push({ title: `${leakedProducts} منتج يحتوي روابط خاصة في بيانات عامة`, description: 'انقلي الروابط إلى protected_content فورًا.', href: '/admin/content', tone: 'danger' })
  }

  const unreadMessages = (params.messages || []).filter((message) => !message.status || message.status === 'new').length
  if (unreadMessages > 0) {
    alerts.push({ title: `${unreadMessages} رسالة جديدة`, description: 'راجعي رسائل التواصل والانتظار.', href: '/admin/messages', tone: 'gold' })
  }

  return alerts
}

export function getOperationalHealth(alerts: Array<{ tone: AdminTone }>) {
  const critical = alerts.filter((alert) => alert.tone === 'danger').length
  const warnings = alerts.filter((alert) => alert.tone === 'warning' || alert.tone === 'gold').length

  if (critical > 0) return { label: 'حرجة', tone: 'danger' as AdminTone, description: 'يوجد خطر تشغيلي أو محتوى يحتاج حماية.' }
  if (warnings > 0) return { label: 'تحتاج مراجعة', tone: 'warning' as AdminTone, description: 'يوجد إجراءات يومية تحتاج متابعة.' }
  return { label: 'مستقرة', tone: 'success' as AdminTone, description: 'لا توجد تنبيهات تشغيل حرجة الآن.' }
}

export function normalizeStatus(status: unknown, fallback = 'pending') {
  return typeof status === 'string' && status.trim() ? status.trim() : fallback
}
