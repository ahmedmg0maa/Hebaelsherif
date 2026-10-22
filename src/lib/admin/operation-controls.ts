export const OPERATION_CONTROLS = {
  site_open: { title: 'الموقع العام', detail: 'إغلاق الواجهة العامة وإيقاف المعاملات الجديدة. يظل الدخول وحساب العميلة وحقوقها متاحًا.' },
  checkout_open: { title: 'الطلبات الجديدة', detail: 'فتح أو إغلاق إنشاء طلبات الشراء، بما فيها الطلبات المرتبطة بحجز مدفوع أو برصيد. لا يوقف متابعة الطلبات السابقة.' },
  booking_open: { title: 'الحجوزات الجديدة', detail: 'فتح أو إغلاق إنشاء الحجوزات ومهلاتها. تظل الحجوزات المؤكدة وسجلاتها محفوظة.' },
  contact_open: { title: 'رسائل التواصل', detail: 'فتح أو إغلاق استقبال الرسائل الجديدة، مع استمرار إدارة صندوق الرسائل.' },
  newsletter_open: { title: 'الاشتراك في النشرة', detail: 'فتح أو إغلاق الاشتراكات الجديدة. إلغاء الاشتراك يظل متاحًا دائمًا.' },
} as const
export type OperationControlKey = keyof typeof OPERATION_CONTROLS
export function isOperationControl(key: string): key is OperationControlKey { return key in OPERATION_CONTROLS }
