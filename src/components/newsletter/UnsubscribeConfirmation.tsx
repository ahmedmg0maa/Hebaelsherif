'use client'

import { useState } from 'react'
import { unsubscribeNewsletter } from '@/lib/actions/newsletter'
import { Button } from '@/components/ui/Button'

export function UnsubscribeConfirmation({ token }: { token: string }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  return <div className="mt-6 space-y-3">{done ? <p role="status" className="font-bold text-deep-teal">تم إلغاء الاشتراك. لن تصلك رسائل القائمة البريدية بعد الآن.</p> : <Button type="button" variant="burgundy" disabled={busy} onClick={async () => { setBusy(true); const response = await unsubscribeNewsletter(token); if (response.ok) setDone(true); else setResult(response.error); setBusy(false) }}>{busy ? 'جاري الإلغاء…' : 'تأكيد إلغاء الاشتراك'}</Button>}{result && <p role="alert" className="text-sm font-semibold text-burgundy">{result}</p>}</div>
}
