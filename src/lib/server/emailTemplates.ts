export type EmailTemplateKey =
  | 'booking_request_received'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_proof_received'
  | 'payment_confirmed'
  | 'access_granted'
  | 'contact_message_received'
  | 'lead_waitlist_joined'

export interface EmailTemplate {
  key: EmailTemplateKey
  subject: string
  body: string
  ctaLabel?: string
}

export const emailTemplates: Record<EmailTemplateKey, EmailTemplate> = {
  booking_request_received: {
    key: 'booking_request_received',
    subject: 'تم استلام طلب الحجز — هبة الشريف',
    body: 'وصلنا طلب الحجز وسنراجعه خلال وقت قصير. ستصلكِ الخطوة التالية بعد التأكيد.',
    ctaLabel: 'متابعة الحجز',
  },
  booking_confirmed: {
    key: 'booking_confirmed',
    subject: 'تم تأكيد موعد الجلسة — هبة الشريف',
    body: 'تم تأكيد الموعد. ستجدين التفاصيل ورابط الجلسة داخل حسابك عند إضافته.',
    ctaLabel: 'فتح جلساتي',
  },
  booking_cancelled: {
    key: 'booking_cancelled',
    subject: 'تحديث بخصوص الحجز — هبة الشريف',
    body: 'تم تحديث حالة الحجز. يمكنكِ التواصل معنا لأي استفسار أو ترتيب موعد بديل.',
    ctaLabel: 'تواصل معنا',
  },
  payment_proof_received: {
    key: 'payment_proof_received',
    subject: 'تم استلام إثبات الدفع — هبة الشريف',
    body: 'وصل إثبات الدفع وسيتم مراجعته. بعد التأكيد يتم فتح المحتوى أو تأكيد الحجز.',
    ctaLabel: 'متابعة الطلب',
  },
  payment_confirmed: {
    key: 'payment_confirmed',
    subject: 'تم تأكيد الدفع — هبة الشريف',
    body: 'تم تأكيد الدفع بنجاح. سنكمل خطوة فتح المحتوى أو تأكيد الخدمة حسب الطلب.',
    ctaLabel: 'فتح حسابي',
  },
  access_granted: {
    key: 'access_granted',
    subject: 'تم فتح الوصول للمحتوى — هبة الشريف',
    body: 'أصبح المحتوى متاحًا داخل حسابك الآن. نتمنى لكِ رحلة تعلم هادئة ومفيدة.',
    ctaLabel: 'فتح مكتبتي',
  },
  contact_message_received: {
    key: 'contact_message_received',
    subject: 'وصلتنا رسالتك — هبة الشريف',
    body: 'شكرًا لتواصلك. سنراجع رسالتك ونعود إليكِ في أقرب وقت مناسب.',
    ctaLabel: 'زيارة الموقع',
  },
  lead_waitlist_joined: {
    key: 'lead_waitlist_joined',
    subject: 'تم انضمامك لقائمة الانتظار — هبة الشريف',
    body: 'تم تسجيل اهتمامك. سنخبرك عند فتح المسارات أو الإصدارات الجديدة.',
    ctaLabel: 'ابدئي من هنا',
  },
}

export function renderEmailTemplate(key: EmailTemplateKey, values: Record<string, string> = {}) {
  const template = emailTemplates[key]
  const replace = (input: string) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, value), input)
  return {
    ...template,
    subject: replace(template.subject),
    body: replace(template.body),
  }
}
