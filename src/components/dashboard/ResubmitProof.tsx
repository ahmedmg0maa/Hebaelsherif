'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPaymentProofUploader } from '@/lib/payment-proof-upload'
import { Button } from '@/components/ui/Button'

export function ResubmitProof({ orderId, method, onAttemptLock }: { orderId: string; method: string; onAttemptLock?: (locked:boolean)=>void }) {
  const router = useRouter()
  const [proofUploader] = useState(createPaymentProofUploader)
  const uploadPaymentProofDirect = proofUploader.upload
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const attemptFile=useRef<File|null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (lock.current) return
    lock.current=true
    setBusy(true)
    onAttemptLock?.(true)
    setError(null)
    try {
    const file = proofUploader.pending() ? attemptFile.current : new FormData(e.currentTarget).get('proof')
    if (!(file instanceof File)) { setError('أرفقي صورة الإيصال أولًا.'); setBusy(false); return }
    attemptFile.current=file
    const res = await uploadPaymentProofDirect(orderId, method as 'instapay' | 'wallet' | 'bank_transfer', file)
    if (res.ok) {
      setDone(true)
      router.refresh()
    } else {
      setError(res.error)
    }
    } catch { setError('تعذّر التحقق من إرسال الإيصال. أعيدي المحاولة بنفس الملف.') }
    finally { lock.current=false; setBusy(false); onAttemptLock?.(proofUploader.pending()) }
  }

  if (done) {
    return (
      <p role="status" className="mt-4 rounded-xl bg-deep-teal/8 px-4 py-3 text-sm font-semibold text-deep-teal">
        استلمنا إيصالك — سيراجعه الفريق ضمن أوقات العمل.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-xl border border-dashed border-antique-gold/60 bg-ivory/50 p-4">
      <label htmlFor={`reproof-${orderId}`} className="block text-sm font-bold text-deep-teal">
        رفع إيصال جديد
      </label>
      <input
        id={`reproof-${orderId}`}
        name="proof"
        disabled={busy || proofUploader.pending()}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        required
        className="w-full text-sm text-text-soft file:me-3 file:rounded-full file:border-0 file:bg-deep-teal file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-on-dark"
      />
      {error && (
        <p className="text-xs font-medium text-burgundy" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? 'جارٍ الرفع…' : 'إرسال للمراجعة'}
      </Button>
    </form>
  )
}
