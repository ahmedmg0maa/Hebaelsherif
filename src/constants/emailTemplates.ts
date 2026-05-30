import type { EmailTemplate } from '@/types'

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    key: 'booking_request_received',
    subject: 'تم استلام طلب الحجز',
    body: 'وصل طلب حجزك بنجاح. سنراجع الموعد والدفع ثم نرسل لكِ التأكيد والخطوات التالية.',
    ctaLabel: 'عرض جلساتي',
    ctaHref: '/dashboard/sessions',
  },
  {
    key: 'booking_confirmed',
    subject: 'تم تأكيد موعد الجلسة',
    body: 'تم تأكيد موعد جلستك. ستجدين رابط الجلسة والتعليمات داخل حسابك عند توفرها.',
    ctaLabel: 'عرض الجلسة',
    ctaHref: '/dashboard/sessions',
  },
  {
    key: 'payment_proof_received',
    subject: 'تم استلام إثبات الدفع',
    body: 'وصل إثبات الدفع وسيتم مراجعته. بعد التأكيد سيتم تحديث الطلب وفتح المحتوى المناسب.',
    ctaLabel: 'عرض طلباتي',
    ctaHref: '/dashboard/orders',
  },
  {
    key: 'payment_confirmed',
    subject: 'تم تأكيد الدفع',
    body: 'تم تأكيد الدفع بنجاح. يمكنكِ متابعة حالة الوصول للمحتوى من لوحة حسابك.',
    ctaLabel: 'لوحة حسابي',
    ctaHref: '/dashboard',
  },
  {
    key: 'access_granted',
    subject: 'تم فتح المحتوى',
    body: 'تم فتح الوصول للمحتوى المرتبط بطلبك. نتمنى لكِ رحلة تعلم هادئة ومثمرة.',
    ctaLabel: 'مكتبتي',
    ctaHref: '/dashboard',
  },
  {
    key: 'lead_waitlist_joined',
    subject: 'تم تسجيلك في قائمة الانتظار',
    body: 'تم تسجيل اهتمامك. سنرسل لكِ التحديثات عند توفر المسار أو الإصدار المناسب.',
    ctaLabel: 'ابدئي من هنا',
    ctaHref: '/start-here',
  },
]

export function getEmailTemplate(key: string) {
  return EMAIL_TEMPLATES.find((template) => template.key === key)
}
