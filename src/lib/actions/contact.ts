'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { normalizeContactInput } from '@/lib/contact/intake'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'

export type ContactActionResult = { ok: true } | { ok: false; error: string }

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

async function privacySafeFingerprints(email: string) {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('cf-connecting-ip')
    ?? requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? requestHeaders.get('x-real-ip')
    ?? 'unknown'
  const agent = requestHeaders.get('user-agent') ?? 'unknown'
  return {
    device: sha256(`contact-device-v1|${forwarded}|${agent}`),
    email: sha256(`contact-email-v1|${email}`),
  }
}

export async function submitContactMessage(formData: FormData): Promise<ContactActionResult> {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) {
    return { ok: false, error: 'قناة التواصل غير مهيّأة حاليًا.' }
  }

  // Honeypot values are never persisted or logged.
  if (String(formData.get('website') ?? '').trim()) return { ok: true }

  const normalized = normalizeContactInput(formData)
  if (!normalized.ok) return normalized

  const fingerprints = await privacySafeFingerprints(normalized.value.email)
  const { data, error } = await getServiceClient().rpc('submit_contact_message', {
    p_name: normalized.value.name,
    p_email: normalized.value.email,
    p_phone: normalized.value.phone || null,
    p_purpose: normalized.value.purpose,
    p_message: normalized.value.message,
    p_device_fingerprint: fingerprints.device,
    p_email_fingerprint: fingerprints.email,
    p_privacy_consent: true,
  })

  if (error?.message.includes('site_intake_closed')) return { ok: false, error: 'استقبال الرسائل الجديدة متوقف مؤقتًا.' }
  if (error) return { ok: false, error: 'تعذّر إرسال الرسالة الآن. حاولي مرة أخرى.' }
  const result = data as { accepted?: unknown; reason?: unknown; retryAfterSec?: unknown } | null
  if (result?.accepted !== true) {
    return result?.reason === 'rate_limited'
      ? { ok: false, error: 'تم إرسال محاولات كثيرة. انتظري قليلًا ثم حاولي مجددًا.' }
      : { ok: false, error: 'تعذّر إرسال الرسالة الآن.' }
  }

  revalidatePath('/admin/inbox')
  return { ok: true }
}
