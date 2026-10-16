'use client'

import { useState } from 'react'
import { createContentPreview } from '@/lib/actions/cms'
import { Button } from '@/components/ui/Button'

const widths = { mobile: 430, tablet: 820, desktop: 1440 }
export function PreviewButton({ type, id }: { type: 'page' | 'article'; id: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [viewport, setViewport] = useState<keyof typeof widths>('desktop')
  return <div className="flex flex-wrap items-center gap-2">
    <label className="sr-only" htmlFor={`preview-${type}-${id}`}>حجم المعاينة</label>
    <select id={`preview-${type}-${id}`} value={viewport} onChange={(event) => setViewport(event.target.value as keyof typeof widths)} className="min-h-9 rounded-lg border border-line bg-surface-raised px-2 text-xs text-ink"><option value="mobile">هاتف 390px</option><option value="tablet">لوحي 768px</option><option value="desktop">سطح مكتب</option></select>
    <Button size="sm" variant="secondary" disabled={busy} onClick={async () => { setBusy(true); const result = await createContentPreview(type, id); if (result.ok) window.open(`${result.url}&viewport=${viewport}`, '_blank', `noopener,noreferrer,width=${widths[viewport]},height=900`); else setMessage(result.error); setBusy(false) }}>معاينة آمنة ٣٠ دقيقة</Button>
    {message && <p role="status" className="w-full text-xs text-deep-teal">{message}</p>}
  </div>
}
