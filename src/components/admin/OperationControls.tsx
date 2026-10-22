'use client'

import { useState } from 'react'
import { toggleFlag } from '@/lib/actions/cms'
import { OPERATION_CONTROLS, type OperationControlKey } from '@/lib/admin/operation-controls'
import { ActionFeedback } from './ActionFeedback'
import { useAdminAction } from './useAdminAction'
import { Button } from '@/components/ui/Button'

export function OperationControl({ flagKey, enabled }: { flagKey: OperationControlKey; enabled: boolean }) {
  const { busy, feedback, run } = useAdminAction()
  const [confirm, setConfirm] = useState(false), control = OPERATION_CONTROLS[flagKey]
  return <div className="space-y-4 rounded-2xl border border-line bg-surface-raised p-5">
    <div className="flex items-start justify-between gap-4"><h3 className="font-bold text-deep-teal">{control.title}</h3><span className={`text-sm font-semibold ${enabled ? 'text-deep-teal' : 'text-burgundy'}`}>{enabled ? 'مفتوح' : 'مغلق'}</span></div>
    <p className="text-sm leading-loose text-text-soft">{control.detail}</p>
    <div className="flex flex-wrap gap-3"><Button variant={enabled ? 'secondary' : 'primary'} disabled={busy} onClick={async () => {
      if (enabled && !confirm) { setConfirm(true); return }
      if (await run(() => toggleFlag(flagKey, !enabled), enabled ? 'تم الإغلاق.' : 'تم الفتح.')) setConfirm(false)
    }}>{busy ? 'جاري التنفيذ…' : enabled ? confirm ? 'تأكيد الإغلاق' : 'إغلاق مؤقت' : 'فتح'}</Button>
    {confirm && <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>تراجع</Button>}</div>
    <ActionFeedback feedback={feedback} />
  </div>
}
