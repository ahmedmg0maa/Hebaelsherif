import type { PaymentMethod } from '@/types'

export const PAYMENT_METHODS: {
  id: PaymentMethod
  title: string
  description: string
  accountLabel: string
  accountValue: string
}[] = [
  {
    id: 'instapay',
    title: 'InstaPay',
    description: 'التحويل الأسرع داخل مصر. ارسلي رقم العملية بعد الدفع في رسالة للمتابعة.',
    accountLabel: 'رقم InstaPay / التحويل',
    accountValue: process.env.NEXT_PUBLIC_PAYMENT_INSTAPAY || '01116649218',
  },
  {
    id: 'vodafone_cash',
    title: 'Vodafone Cash',
    description: 'تحويل محفظة، وبعدها يتم تأكيد الطلب من لوحة الإدارة.',
    accountLabel: 'رقم المحفظة / التواصل',
    accountValue: process.env.NEXT_PUBLIC_PAYMENT_WALLET || '01116649218',
  },
  {
    id: 'bank_transfer',
    title: 'تحويل بنكي',
    description: 'مناسب للمدفوعات الأكبر أو من خارج المحافظ الإلكترونية.',
    accountLabel: 'بيانات التحويل',
    accountValue: process.env.NEXT_PUBLIC_PAYMENT_BANK || 'يتم إرسال بيانات التحويل بعد مراجعة الطلب',
  },
]
