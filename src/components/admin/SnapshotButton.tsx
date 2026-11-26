'use client'

import { useState } from 'react'
import { saveReportSnapshot } from '@/lib/actions/reports'
import { Button } from '@/components/ui/Button'

export function SnapshotButton() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setMsg(null)
          const res = await saveReportSnapshot()
          setMsg(res.ok ? 'حُفظت اللقطة بنجاح.' : res.error)
          setBusy(false)
        }}
      >
        {busy ? 'جارٍ الحفظ…' : 'حفظ لقطة الآن'}
      </Button>
      {msg && <span className="text-xs text-taupe">{msg}</span>}
    </div>
  )
}
