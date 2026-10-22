'use client'

import { beginPaymentProofUpload, finalizePaymentProofUpload } from '@/lib/actions/checkout'
import { getBrowserClient } from '@/lib/supabase/client'

type Method = 'instapay' | 'wallet' | 'bank_transfer'
type Result = { ok: true; data: { paymentId: string } } | { ok: false; error: string; terminal?: boolean }
type Started = Extract<Awaited<ReturnType<typeof beginPaymentProofUpload>>, { ok: true }>['data']

// One instance per mounted form. No private file/token is written to browser storage.
export function createPaymentProofUploader() {
  let attempt: { requestId: string; fingerprint: string; started?: Started } | null = null
  let busy = false
  return {
    pending: () => attempt !== null,
    async upload(orderId: string, method: Method, file: File): Promise<Result> {
      if (busy) return { ok: false, error: 'يجري التحقق من الإيصال بالفعل.' }
      if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size<=0 || file.size>5*1024*1024) return { ok: false, error: 'اختاري صورة JPG أو PNG أو WebP لا تتجاوز ٥ ميجابايت.' }
      busy = true
      try {
        const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
        const fingerprint = `${orderId}:${method}:${file.type}:${Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2,'0')).join('')}`
        if (attempt && attempt.fingerprint !== fingerprint) return { ok: false, error: 'أعيدي المحاولة بنفس الإيصال ووسيلة الدفع حتى نتحقق من نتيجة الإرسال السابق.' }
        attempt ??= { requestId: crypto.randomUUID(), fingerprint }
        if (!attempt.started) {
          const started = await beginPaymentProofUpload({ orderId, method, name:file.name, type:file.type, size:file.size, requestId:attempt.requestId })
          if (!started.ok) { if (started.terminal) attempt=null; return started }
          attempt.started = started.data
        } else {
          // Recover an already committed payment before attempting another transfer.
          const recovered = await finalizePaymentProofUpload({ orderId,method,path:attempt.started.path,intentId:attempt.started.intentId,type:file.type,size:file.size })
          if (recovered.ok || recovered.terminal) { attempt=null; return recovered }
        }
        const started = attempt.started
        try {
          // upsert=false: retrying this path cannot overwrite an accepted proof.
          await getBrowserClient().storage.from(started.bucket).uploadToSignedUrl(started.path,started.token,file,{ contentType:file.type, upsert:false })
        } catch { /* An upload can succeed before its network response is lost. */ }
        const result = await finalizePaymentProofUpload({ orderId,method,path:started.path,intentId:started.intentId,type:file.type,size:file.size })
        if (result.ok || result.terminal) attempt=null
        return result
      } catch {
        return { ok:false,error:'تعذّر التحقق من الإرسال. أعيدي المحاولة بنفس الملف؛ احتفظنا بمعرّف المحاولة في هذه الصفحة.' }
      } finally { busy=false }
    },
  }
}
