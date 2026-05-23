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
    accountLabel: 'عنوان InstaPay',
    accountValue: process.env.NEXT_PUBLIC_PAYMENT_INSTAPAY || 'hebaelsherif@instapay',
  },
  {
    id: 'vodafone_cash',
    title: 'Vodafone Cash',
    description: 'تحويل محفظة، وبعدها يتم تأكيد الطلب من لوحة الإدارة.',
    accountLabel: 'رقم المحفظة',
    accountValue: process.env.NEXT_PUBLIC_PAYMENT_WALLET || '01000000000',
  },
  {
    id: 'bank_transfer',
    title: 'تحويل بنكي',
    description: 'مناسب للمدفوعات الأكبر أو من خارج المحافظ الإلكترونية.',
    accountLabel: 'بيانات التحويل',
    accountValue: process.env.NEXT_PUBLIC_PAYMENT_BANK || 'تضاف بيانات الحساب من الإعدادات',
  },
]
