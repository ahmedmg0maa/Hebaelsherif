import 'server-only'
import { revalidatePath } from 'next/cache'
import type { CatalogKind } from './editor'

export function catalogMutationError(error: { code?: string; message?: string } | null) {
  if(error?.message==='catalog_restore_required') return 'العنصر مؤرشف؛ استعيديه إلى المسودات قبل التعديل أو النشر.'
  if(error?.code==='40001') return 'تغيّرت حالة العنصر. حدّثي الصفحة وراجعيها قبل المحاولة.'
  if (error?.code === 'PGRST202') return 'حفظ الكتالوج غير مهيأ في هذه البيئة بعد.'
  if (error?.code === '42501') return 'لا تملكين صلاحية هذا الإجراء؛ تعديل عنصر منشور يتطلب صلاحية النشر.'
  if (error?.code === '23505') return 'هذا الرابط مستخدم بالفعل. راجعي السجل قبل تكرار الإضافة.'
  if (error?.message === 'catalog_delivery_or_bundle_exists') return 'العنصر مرتبط بملفات تسليم أو بباقة؛ أوقفي نشره للحفاظ على هذه الروابط.'
  if (error?.code === '23503') return 'العنصر مرتبط بطلبات أو وصول عميلات؛ أوقفي نشره بدل حذفه.'
  if (error?.message?.includes('media') || error?.message?.includes('cover')) return 'راجعي صورة الغلاف وحالتها وحقوق استخدامها.'
  if (error?.message?.includes('incomplete')) return 'لم تكتمل متطلبات النشر. راجعي المحتوى والغلاف والمواعيد أو ملفات التسليم.'
  if (error?.message?.includes('capacity')) return 'لا يمكن تقليل المقاعد إلى أقل من الحجوزات القائمة.'
  return 'تعذّر تأكيد النتيجة. راجعي السجل قبل إعادة المحاولة؛ مدخلاتك محفوظة.'
}

export function revalidateCatalogMutation(kind: CatalogKind, result: { slug?: string; previousSlug?: string }) {
  const route = { course: 'courses', book: 'books', workshop: 'workshops', service: 'services' }[kind]
  for (const path of ['/', '/search', '/sitemap.xml', '/services', '/programs', '/booking', '/admin/products', '/admin/services', `/admin/${kind === 'service' ? 'bookings' : route}`, `/${route}`]) revalidatePath(path)
  for (const slug of new Set([result.slug, result.previousSlug])) {
    if (!slug) continue
    revalidatePath(`/${route}/${slug}`)
    revalidatePath(`/checkout/${kind === 'service' ? 'session' : kind}/${slug}`)
  }
}
