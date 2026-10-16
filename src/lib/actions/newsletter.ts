'use server'

import { createHash, randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'

type NewsletterResult = { ok: true; alreadySubscribed?: boolean } | { ok: false; error: string }

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

async function fingerprints(email: string) {
  const requestHeaders = await headers()
  const address = requestHeaders.get('cf-connecting-ip')
    ?? requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? requestHeaders.get('x-real-ip')
    ?? 'unknown'
  const agent = requestHeaders.get('user-agent') ?? 'unknown'
  return {
    device: sha256(`newsletter-device-v1|${address}|${agent}`),
    email: sha256(`newsletter-email-v1|${email}`),
  }
}

export async function subscribeNewsletter(formData: FormData): Promise<NewsletterResult> {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) return { ok: false, error: 'الاشتراك غير مهيّأ حاليًا.' }
  if (String(formData.get('website') ?? '').trim()) return { ok: true }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const consent = formData.get('consent') === 'on'
  if (email.length < 5 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'اكتبي بريدًا إلكترونيًا صالحًا.' }
  if (!consent) return { ok: false, error: 'يلزم تأكيد موافقتك الصريحة على رسائل النشرة.' }

  const request = await fingerprints(email)
  const rawToken = `${randomUUID()}${randomUUID()}`.replaceAll('-', '')
  const { data, error } = await getServiceClient().rpc('submit_newsletter_subscription', {
    p_email: email,
    p_consent: true,
    p_consent_version: 'newsletter-consent-v1',
    p_source: 'home',
    p_device_fingerprint: request.device,
    p_email_fingerprint: request.email,
    p_unsubscribe_token_hash: sha256(rawToken),
  })
  if (error?.message.includes('site_intake_closed')) return { ok: false, error: 'استقبال الاشتراكات الجديدة متوقف مؤقتًا.' }
  if (error) return { ok: false, error: 'تعذّر حفظ الاشتراك الآن. حاولي مرة أخرى.' }
  const result = data as { accepted?: unknown; reason?: unknown; alreadySubscribed?: unknown } | null
  if (result?.accepted !== true) return result?.reason === 'rate_limited'
    ? { ok: false, error: 'تمت محاولات كثيرة. انتظري قليلًا ثم حاولي مجددًا.' }
    : { ok: false, error: 'تعذّر حفظ الاشتراك الآن.' }
  revalidatePath('/admin/inbox')
  return { ok: true, alreadySubscribed: result.alreadySubscribed === true }
}

export async function unsubscribeNewsletter(token: string): Promise<NewsletterResult> {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret() || !/^[0-9a-f]{64}$/.test(token)) return { ok: false, error: 'رابط الإلغاء غير صالح.' }
  const { data, error } = await getServiceClient().rpc('unsubscribe_newsletter', { p_token_hash: sha256(token) })
  if (error || data !== true) return { ok: false, error: 'رابط الإلغاء غير صالح أو لم يعد نشطًا.' }
  revalidatePath('/admin/inbox')
  return { ok: true }
}
