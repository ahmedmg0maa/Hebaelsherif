export const CONTACT_PURPOSES = [
  { value: 'general', label: 'استفسار عام' },
  { value: 'booking', label: 'استفسار عن حجز' },
  { value: 'payment', label: 'مشكلة في الدفع' },
  { value: 'technical', label: 'مشكلة تقنية' },
  { value: 'refund', label: 'طلب استرداد' },
  { value: 'suggestion', label: 'اقتراح' },
] as const

export type ContactPurpose = (typeof CONTACT_PURPOSES)[number]['value']

export const CONTACT_PURPOSE_LABELS = Object.fromEntries(
  CONTACT_PURPOSES.map((purpose) => [purpose.value, purpose.label]),
) as Record<ContactPurpose, string>

export type NormalizedContactInput = {
  name: string
  email: string
  phone: string
  purpose: ContactPurpose
  message: string
}

export type ContactValidationResult =
  | { ok: true; value: NormalizedContactInput }
  | { ok: false; error: string }

export function normalizeContactInput(formData: FormData): ContactValidationResult {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()
  const purpose = String(formData.get('purpose') ?? '')
  const message = String(formData.get('message') ?? '').trim()

  if (name.length < 2 || name.length > 120) return { ok: false, error: 'اكتبي اسمًا صحيحًا.' }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'راجعي البريد الإلكتروني.' }
  }
  if (phone.length > 40 || (phone && !/^[+0-9٠-٩۰-۹()\s.-]+$/u.test(phone))) {
    return { ok: false, error: 'راجعي رقم الهاتف.' }
  }
  if (!CONTACT_PURPOSES.some((item) => item.value === purpose)) {
    return { ok: false, error: 'اختاري غرض التواصل.' }
  }
  if (message.length < 10 || message.length > 5000) {
    return { ok: false, error: 'اكتبي رسالة بين ١٠ و٥٠٠٠ حرف.' }
  }
  if (formData.get('privacy_consent') !== 'on') {
    return { ok: false, error: 'يلزم قبول سياسة الخصوصية لإرسال الرسالة.' }
  }

  return { ok: true, value: { name, email, phone, purpose: purpose as ContactPurpose, message } }
}
