import { createClient } from '@supabase/supabase-js'

export type BookingMailEnv = {
 NEXT_PUBLIC_SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string; SUPABASE_SERVICE_ROLE_KEY?: string
 RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string; NEXT_PUBLIC_SITE_URL?: string; HEBA_DEPLOYMENT_ENV?: string
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!))
export function bookingEmailHtml(subject: string, body: string, dashboard: string) {
 return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#fffdf8;color:#153c46;font-family:Arial,sans-serif"><div style="max-width:560px;margin:24px auto;padding:28px;border:1px solid #ded4c7;border-radius:16px"><p style="font-size:14px;color:#6a2940">هبة الشريف · التغيير الحقيقي يبدأ بالفهم</p><h1 style="font-size:24px;line-height:1.6">${escapeHtml(subject)}</h1><p style="line-height:2;white-space:pre-line">${escapeHtml(body)}</p><a href="${escapeHtml(dashboard)}" style="display:inline-block;margin-top:16px;padding:12px 22px;background:#153c46;color:#fffdf8;border-radius:8px;text-decoration:none">تفاصيل حجزك</a><p style="font-size:12px;line-height:1.8;color:#5e6768">حالة الحجز وتفاصيل اللقاء محدثة داخل حسابك. احتفظي بهذا البريد للرجوع إليه.</p></div></body></html>`
}

async function acceptedProviderMessage(response: Response) {
 if (!response.ok || !response.body) return false
 const reader = response.body.getReader()
 let text = '', bytes = 0
 const decoder = new TextDecoder()
 try {
  while (true) {
   const { done, value } = await reader.read()
   if (done) break
   bytes += value.byteLength
   if (bytes > 4096) { await reader.cancel(); return false }
   text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()
  const data = JSON.parse(text) as { id?: unknown }
  return typeof data.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(data.id)
 } catch { return false }
 finally { reader.releaseLock() }
}

/** One durable, quota-reserved message per minute. No recipient/body enters logs. */
export async function deliverBookingMail(env: BookingMailEnv) {
 if (env.HEBA_DEPLOYMENT_ENV === 'preview' || !env.NEXT_PUBLIC_SUPABASE_URL || !(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY) || !env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return
 let site: URL
 try {
  site = new URL(env.NEXT_PUBLIC_SITE_URL ?? '')
  if (site.protocol !== 'https:' || site.username || site.password) return
 } catch { return }
 const dashboard = new URL('/dashboard/bookings', site).href
 const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)!, {auth:{persistSession:false,autoRefreshToken:false}})
 const {data,error} = await db.rpc('claim_booking_emails',{p_limit:1})
 if (error || !Array.isArray(data)) { console.warn('booking_mail_claim_failed'); return }
 for (const item of data) {
  let sent = false, code = 'provider_unavailable'
  if (!item.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.to)) code = 'invalid_recipient'
  else try {
   const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`booking-status/${item.id}`},
    body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:[item.to],subject:item.subject,text:`${item.text}\n${dashboard}`,html:bookingEmailHtml(item.subject,item.text,dashboard)}),
    signal:AbortSignal.timeout(10_000),
   })
   sent = await acceptedProviderMessage(response)
   code = response.status === 429 ? 'provider_rate_limited' : [401,403].includes(response.status) ? 'provider_auth_failed' : [400,422].includes(response.status) ? 'provider_payload_rejected' : 'provider_rejected'
   if (!response.ok) await response.body?.cancel()
  } catch { /* Stable idempotency key recovers ambiguous provider replies. */ }
  const completed = await db.rpc('finalize_booking_email',{p_id:item.id,p_lease:item.leaseId,p_sent:sent,p_error:sent?null:code})
  if (completed.error || completed.data !== true) console.warn('booking_mail_finalize_unconfirmed')
 }
}
