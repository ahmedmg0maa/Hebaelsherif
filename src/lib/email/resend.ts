import 'server-only'
import { getServiceClient } from '@/lib/supabase/server'

type ClaimedEmail = { id: string; to: string; subject: string; text: string; attempt: number }
export type EmailDeliveryResult = { ok: true; status: 'sent' } | { ok: false; status: 'disabled' | 'not-due' | 'unavailable' | 'failed' }

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const MAX_RESPONSE_BYTES = 16_384

async function boundedJson(response: Response): Promise<Record<string, unknown> | null> {
  if (!response.body) return null
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  try {
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch { return null }
}

function safeFailure(status: number, payload: Record<string, unknown> | null) {
  const type = typeof payload?.name === 'string' ? payload.name : typeof payload?.type === 'string' ? payload.type : ''
  if (status === 429 || type === 'rate_limit_exceeded') return { code: 'provider_rate_limited', retryMs: 15 * 60_000 }
  if (status === 409 && type === 'concurrent_idempotent_requests') return { code: 'provider_request_in_progress', retryMs: 60_000 }
  if (status === 409) return { code: 'provider_idempotency_conflict', retryMs: null }
  if (status === 401 || status === 403) return { code: 'provider_auth_failed', retryMs: null }
  if (status === 400 || status === 422) return { code: 'provider_payload_rejected', retryMs: null }
  if (status >= 500) return { code: 'provider_unavailable', retryMs: 15 * 60_000 }
  return { code: 'provider_rejected', retryMs: null }
}

async function finalize(outboxId: string, actorId: string, outcome: 'sent' | 'failed', providerId?: string, errorCode?: string, retryMs?: number | null) {
  const next = retryMs ? new Date(Date.now() + retryMs).toISOString() : null
  return getServiceClient().rpc('finalize_email_outbox', {
    p_outbox_id: outboxId,
    p_actor_id: actorId,
    p_outcome: outcome,
    p_provider_message_id: providerId ?? null,
    p_error_code: errorCode ?? null,
    p_next_attempt_at: next,
  })
}

export async function deliverResendOutbox(outboxId: string, actorId: string): Promise<EmailDeliveryResult> {
  const service = getServiceClient()
  const { data, error } = await service.rpc('claim_email_outbox', { p_outbox_id: outboxId, p_actor_id: actorId })
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    if (error?.message.includes('email_free_budget_exceeded')) return { ok: false, status: 'not-due' }
    if (error?.message.includes('email_delivery_disabled')) return { ok: false, status: 'disabled' }
    if (error?.message.includes('email_retry_not_due') || error?.message.includes('email_already_claimed')) return { ok: false, status: 'not-due' }
    return { ok: false, status: 'unavailable' }
  }
  const claimed = data as Partial<ClaimedEmail>
  if (claimed.id !== outboxId || typeof claimed.to !== 'string' || typeof claimed.subject !== 'string' || typeof claimed.text !== 'string') {
    await finalize(outboxId, actorId, 'failed', undefined, 'outbox_payload_invalid')
    return { ok: false, status: 'failed' }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || !from) {
    await finalize(outboxId, actorId, 'failed', undefined, 'provider_not_configured')
    return { ok: false, status: 'disabled' }
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'hebaelsherif-web/1.0',
        'Idempotency-Key': `contact-reply/${outboxId}`,
      },
      body: JSON.stringify({ from, to: [claimed.to], subject: claimed.subject, text: claimed.text }),
      signal: AbortSignal.timeout(10_000),
    })
    const payload = await boundedJson(response)
    if (response.ok && typeof payload?.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(payload.id)) {
      const completed = await finalize(outboxId, actorId, 'sent', payload.id)
      return completed.error ? { ok: false, status: 'unavailable' } : { ok: true, status: 'sent' }
    }
    const failure = safeFailure(response.status, payload)
    await finalize(outboxId, actorId, 'failed', undefined, failure.code, failure.retryMs)
    return { ok: false, status: 'failed' }
  } catch {
    await finalize(outboxId, actorId, 'failed', undefined, 'provider_unavailable', 15 * 60_000)
    return { ok: false, status: 'failed' }
  }
}
