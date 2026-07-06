export type PaymentGatewayName = 'manual' | 'paymob' | 'stripe'

export interface CheckoutRequest {
  orderId: string
  amount: number
  currency: 'EGP'
  customerEmail?: string
  customerName?: string
  returnUrl?: string
}

export interface CheckoutResult {
  provider: PaymentGatewayName
  mode: 'manual' | 'redirect'
  checkoutUrl?: string
  message: string
}

export async function createCheckoutSession(provider: PaymentGatewayName, request: CheckoutRequest): Promise<CheckoutResult> {
  if (provider === 'manual') {
    return {
      provider: 'manual',
      mode: 'manual',
      message: 'الدفع اليدوي مفعل. يتم إرسال إثبات الدفع ومراجعته من الإدارة.',
    }
  }

  return {
    provider,
    mode: 'redirect',
    message: 'بوابة الدفع تحتاج مفاتيح إنتاج وWebhook قبل التفعيل. أبقينا الدفع اليدوي كمسار آمن افتراضي.',
  }
}
