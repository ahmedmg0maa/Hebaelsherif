'use client'

import { useRef, useState } from 'react'
import { createAdminActionRunner, type AdminOperationResult } from '@/lib/admin/action-runner'

export function useAdminAction() {
  const [runner] = useState(createAdminActionRunner)
  const active = useRef(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  async function run(operation: () => Promise<AdminOperationResult>, success = 'تم حفظ التغييرات.') {
    if (active.current) return false
    active.current = true
    setBusy(true)
    setFeedback(null)
    try {
      const result = await runner(operation)
      if (!result) return false
      setFeedback({ ok: result.ok, message: result.ok ? result.notice || success : result.error || 'تعذّر إتمام العملية.' })
      return result.ok
    } finally {
      active.current = false
      setBusy(false)
    }
  }

  return { busy, feedback, run }
}
