'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { accountDeletionStatusLabel, type AccountDeletionStatus } from '@/lib/account-deletion/status'
import { completeAccountDeletionRequest, reviewAccountDeletionRequest } from '@/lib/actions/account-deletion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export type AccountDeletionQueueRow = {
  id: string
  customer_id: string | null
  full_name: string
  email: string
  status: AccountDeletionStatus
  requested_at: string
  updated_at: string
  reviewed_at: string | null
  note_present: boolean
}

const fmt = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
type ReviewStatus = 'in_review' | 'awaiting_customer' | 'approved_for_execution' | 'declined'

export function AccountDeletionQueue({ rows, canManage }: { rows: AccountDeletionQueueRow[]; canManage: boolean }) {
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [references, setReferences] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; text: string }>>({})
  const router = useRouter()

  async function review(row: AccountDeletionQueueRow, status: ReviewStatus) {
    setBusy(`${row.id}:${status}`)
    const result = await reviewAccountDeletionRequest(row.id, status, notes[row.id] ?? '')
    setFeedback((current) => ({ ...current, [row.id]: result.ok
      ? { ok: true, text: `حُفظت الحالة: ${accountDeletionStatusLabel[result.status]}.` }
      : { ok: false, text: result.error } }))
    setBusy(null)
    if (result.ok) router.refresh()
  }

  async function complete(row: AccountDeletionQueueRow) {
    setBusy(`${row.id}:completed`)
    const result = await completeAccountDeletionRequest(row.id, references[row.id] ?? '')
    setFeedback((current) => ({ ...current, [row.id]: result.ok
      ? { ok: true, text: 'سُجل اكتمال التنفيذ بعد إثبات غياب الهوية.' }
      : { ok: false, text: result.error } }))
    setBusy(null)
    if (result.ok) router.refresh()
  }

  if (rows.length === 0) return <EmptyState title="لا توجد طلبات حذف نشطة" description="ستظهر الطلبات هنا فور تسجيلها من إعدادات العميلة." />

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <article key={row.id} className="space-y-3 rounded-2xl border border-line bg-surface-raised p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {row.customer_id ? (
                <Link href={`/admin/users/${row.customer_id}`} className="font-bold text-deep-teal underline-offset-4 hover:underline">
                  {row.full_name || row.email || 'عميلة'}
                </Link>
              ) : <p className="font-bold text-deep-teal">هوية محذوفة — بانتظار توثيق الاكتمال</p>}
              {row.email && <p dir="ltr" className="text-sm text-text-soft">{row.email}</p>}
              <p className="mt-1 text-xs text-taupe">طُلب {fmt.format(new Date(row.requested_at))}{row.note_present ? ' · توجد ملاحظة مراجعة خاصة' : ''}</p>
            </div>
            <Badge tone="pending">{accountDeletionStatusLabel[row.status]}</Badge>
          </div>

          {canManage && row.customer_id && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-deep-teal" htmlFor={`deletion-note-${row.id}`}>ملاحظة المراجعة</label>
              <textarea
                id={`deletion-note-${row.id}`}
                rows={2}
                maxLength={1000}
                value={notes[row.id] ?? ''}
                onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                className="min-h-20 w-full rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm text-ink"
              />
              <div className="flex flex-wrap gap-2">
                {row.status !== 'in_review' && <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => review(row, 'in_review')}>بدء/إعادة المراجعة</Button>}
                <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => review(row, 'awaiting_customer')}>طلب متابعة</Button>
                <Button size="sm" variant="burgundy" disabled={busy !== null} onClick={() => review(row, 'approved_for_execution')}>اعتماد للتنفيذ — MFA حديث</Button>
                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => review(row, 'declined')}>إغلاق دون تنفيذ</Button>
              </div>
            </div>
          )}

          {canManage && !row.customer_id && row.status === 'approved_for_execution' && (
            <div className="space-y-2 rounded-xl border border-burgundy/30 p-3">
              <label htmlFor={`execution-reference-${row.id}`} className="block text-sm font-bold text-deep-teal">مرجع تنفيذ حذف الهوية</label>
              <input
                id={`execution-reference-${row.id}`}
                dir="ltr"
                minLength={3}
                maxLength={128}
                pattern="[A-Za-z0-9._:/-]+"
                value={references[row.id] ?? ''}
                onChange={(event) => setReferences((current) => ({ ...current, [row.id]: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-line bg-surface-muted px-3 text-sm text-ink"
              />
              <Button size="sm" variant="burgundy" disabled={busy !== null} onClick={() => complete(row)}>تسجيل الاكتمال — MFA حديث</Button>
            </div>
          )}

          {feedback[row.id] && (
            <p role={feedback[row.id].ok ? 'status' : 'alert'} className={`text-sm font-semibold ${feedback[row.id].ok ? 'text-deep-teal' : 'text-burgundy'}`}>
              {feedback[row.id].text}
            </p>
          )}
        </article>
      ))}
    </div>
  )
}
