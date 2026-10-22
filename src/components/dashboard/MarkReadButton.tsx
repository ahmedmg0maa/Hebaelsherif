'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markNotificationsRead } from '@/lib/actions/account'
import { Button } from '@/components/ui/Button'

export function MarkReadButton() {
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const router = useRouter()

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setFeedback(null)
          const result = await markNotificationsRead()
          if (result.ok) {
            setFeedback({ ok: true, message: result.data.count > 0 ? 'تم تحديد الإشعارات كمقروءة.' : 'لا توجد إشعارات جديدة.' })
            router.refresh()
          } else {
            setFeedback({ ok: false, message: result.error })
          }
          setBusy(false)
        }}
      >
        {busy ? 'لحظات…' : 'تحديد الكل كمقروء'}
      </Button>
      {feedback && (
        <p
          role={feedback.ok ? 'status' : 'alert'}
          className={feedback.ok ? 'text-sm font-medium text-deep-teal' : 'text-sm font-medium text-burgundy'}
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
