'use client'

import { type FormEvent, useState } from 'react'
import {
  addCustomerNote,
  addCustomerTag,
  removeCustomerTag,
  setCustomerNoteArchived,
} from '@/lib/actions/crm'
import { Button } from '@/components/ui/Button'

const input = 'min-h-11 rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink'

export function Customer360Actions({ userId }: { userId: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<'note' | 'tag' | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>, kind: 'note' | 'tag') {
    event.preventDefault()
    setBusy(kind)
    setMessage(null)
    const form = event.currentTarget
    const value = String(new FormData(form).get(kind) ?? '')
    const result = kind === 'note' ? await addCustomerNote(userId, value) : await addCustomerTag(userId, value)
    setMessage(result.ok ? (kind === 'note' ? 'حُفظت الملاحظة مع سجل التدقيق.' : 'حُفظ الوسم مع سجل التدقيق.') : result.error)
    if (result.ok) form.reset()
    setBusy(null)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form className="grid gap-2" onSubmit={(event) => submit(event, 'note')}>
        <label htmlFor="customer-note" className="text-sm font-bold text-deep-teal">ملاحظة داخلية</label>
        <textarea id="customer-note" name="note" rows={3} maxLength={2000} required className={input} />
        <Button type="submit" size="sm" disabled={busy !== null}>{busy === 'note' ? 'جارٍ الحفظ…' : 'إضافة الملاحظة'}</Button>
      </form>
      <form className="grid content-start gap-2" onSubmit={(event) => submit(event, 'tag')}>
        <label htmlFor="customer-tag" className="text-sm font-bold text-deep-teal">وسم تشغيلي</label>
        <input id="customer-tag" name="tag" minLength={2} maxLength={40} required className={input} />
        <Button type="submit" size="sm" disabled={busy !== null}>{busy === 'tag' ? 'جارٍ الحفظ…' : 'إضافة الوسم'}</Button>
      </form>
      {message && <p role="status" className="rounded-xl bg-aqua/10 px-3 py-2 text-sm font-semibold text-deep-teal md:col-span-2">{message}</p>}
    </div>
  )
}

export function CustomerTagControl({ userId, tagId, label }: { userId: string; tagId: string; label: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-aqua/30 bg-aqua/10 px-3 py-1 text-xs font-bold text-deep-teal">
      {label}
      <button
        type="button"
        disabled={busy}
        aria-label={`إزالة الوسم ${label}`}
        className="rounded-full px-1 text-burgundy hover:bg-burgundy/10 disabled:opacity-50"
        onClick={async () => {
          setBusy(true)
          const result = await removeCustomerTag(userId, tagId)
          setMessage(result.ok ? 'أُزيل الوسم.' : result.error)
          setBusy(false)
        }}
      >×</button>
      {message && <span className="text-[10px] font-normal text-burgundy" role="status">{message}</span>}
    </span>
  )
}

export function CustomerNoteControl({ userId, noteId, archived }: { userId: string; noteId: string; archived: boolean }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  return (
    <div className="mt-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          const result = await setCustomerNoteArchived(userId, noteId, !archived)
          setMessage(result.ok ? (archived ? 'أُعيدت الملاحظة.' : 'أُرشفت الملاحظة.') : result.error)
          setBusy(false)
        }}
      >{busy ? 'جارٍ التحديث…' : archived ? 'استعادة' : 'أرشفة'}</Button>
      {message && <p role="status" className="mt-1 text-xs text-text-soft">{message}</p>}
    </div>
  )
}
