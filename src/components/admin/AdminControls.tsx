/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation intentionally refreshes the private Auth document. */
'use client'

import { useState } from 'react'
import { useAdminAction } from '@/components/admin/useAdminAction'
import {
  adminSetField,
  publishArticle,
  createArticle,
  updateSetting,
  toggleFlag,
  grantRole,
  revokeRole,
  inviteAdminAccount,
} from '@/lib/actions/cms'
export { ReviewControls } from '@/components/admin/ReviewControls'
import { Button } from '@/components/ui/Button'
import { AdminField as FormField, AdminTextarea as FormTextarea, AdminSelect as FormSelect } from '@/components/admin/AdminField'

function useBusy() {
  const { busy, feedback, run } = useAdminAction()
  return { busy, error: feedback && !feedback.ok ? feedback.message : null, run }
}

export function PublishToggle({
  table,
  id,
  published,
  isArticle = false,
}: {
  table: string
  id: string
  published: boolean
  isArticle?: boolean
}) {
  const { busy, error, run } = useBusy()
  return (
    <div>
      <Button
        variant={published ? 'secondary' : 'primary'}
        size="sm"
        disabled={busy}
        onClick={() =>
          run(() => (isArticle ? publishArticle(id, !published) : adminSetField(table, id, 'is_published', !published)))
        }
      >
        {published ? 'إخفاء' : 'نشر'}
      </Button>
      {error && <p className="mt-1 text-xs text-burgundy">{error}</p>}
    </div>
  )
}

export function ArticleForm() {
  const { busy, error, run } = useBusy()
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const ok = await run(() => createArticle(new FormData(form)))
        if (ok) form.reset()
      }}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="العنوان" name="title" required minLength={3} maxLength={160} />
        <FormField label="الرابط (slug)" name="slug" required minLength={3} maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" hint="مثال: quiet-no" />
      </div>
      <FormField label="المقتطف" name="excerpt" required maxLength={500} />
      <FormTextarea label="المحتوى" name="content" rows={8} required maxLength={100000} />
      {error && (
        <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="justify-self-start">
        {busy ? 'لحظات…' : 'حفظ كمسودة'}
      </Button>
    </form>
  )
}

export function SettingEditor({ settingKey, initialValue }: { settingKey: string; initialValue: string }) {
  const { busy, error, run } = useBusy()
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(false)
  return (
    <div className="space-y-2">
      <label htmlFor={`setting-${settingKey}`} className="block text-sm font-bold text-deep-teal" dir="ltr">
        {settingKey}
      </label>
      <textarea
        id={`setting-${settingKey}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setSaved(false)
        }}
        rows={3}
        maxLength={32768}
        dir="ltr"
        className="w-full rounded-xl border border-line bg-ivory/50 px-4 py-3 font-mono text-xs text-ink focus:border-deep-teal focus:outline-2 focus:outline-deep-teal/20"
      />
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            const ok = await run(() => updateSetting(settingKey, value))
            setSaved(ok)
          }}
        >
          حفظ
        </Button>
        {saved && <span role="status" aria-live="polite" className="text-xs text-deep-teal">حُفظ مع نسخة استعادة ✓</span>}
        {error && <span role="alert" aria-live="polite" className="text-xs text-burgundy">{error}</span>}
      </div>
    </div>
  )
}

export function FlagToggle({ flagKey, enabled, description }: { flagKey: string; enabled: boolean; description: string }) {
  const { busy, error, run } = useBusy()
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-ivory/60 px-4 py-3">
      <div>
        <p className="text-sm font-bold text-deep-teal" dir="ltr">
          {flagKey}
        </p>
        <p className="text-xs text-text-soft">{description}</p>
      </div>
      <Button size="sm" variant={enabled ? 'secondary' : 'primary'} disabled={busy} onClick={() => run(() => toggleFlag(flagKey, !enabled))}>
        {enabled ? 'تعطيل' : 'تفعيل'}
      </Button>
      {error && <p role="alert" aria-live="polite" className="text-xs text-burgundy">{error}</p>}
    </div>
  )
}

export function RoleForm() {
  const { busy, error, run } = useBusy()
  return (
    <>
    <a className="text-xs font-bold text-deep-teal underline underline-offset-4" href="/auth/admin/confirm?reauth=1&redirect=/admin/roles">تأكيد أمني حديث قبل تغيير الأدوار</a>
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const ok = await run(() => grantRole(new FormData(form)))
        if (ok) form.reset()
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <FormField label="بريد العضوة" name="email" type="email" required dir="ltr" className="min-w-64 flex-1" />
      <FormSelect
        label="الدور"
        name="role"
        options={[
          { value: 'admin', label: 'مديرة' },
          { value: 'operations', label: 'العمليات' },
          { value: 'finance', label: 'المالية' },
          { value: 'content', label: 'إدارة المحتوى' },
          { value: 'marketing', label: 'التسويق' },
          { value: 'support', label: 'دعم' },
          { value: 'editor', label: 'محررة' },
          { value: 'analyst', label: 'محللة' },
          { value: 'auditor', label: 'مدققة للقراءة فقط' },
          { value: 'owner', label: 'مالكة' },
        ]}
        className="w-40"
      />
      <Button type="submit" disabled={busy}>
        منح الدور
      </Button>
      {error && <p className="w-full text-xs text-burgundy">{error}</p>}
    </form>
    </>
  )
}

export function AdminInviteForm() {
  const { busy, error, run } = useBusy()
  const [message, setMessage] = useState<string | null>(null)
  return <>
    <a className="text-xs font-bold text-deep-teal underline underline-offset-4" href="/auth/admin/confirm?reauth=1&redirect=/admin/roles">تأكيد أمني حديث قبل إرسال الدعوة</a>
    <form
      className="mt-4 flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault()
        setMessage(null)
        const form = event.currentTarget
        const ok = await run(() => inviteAdminAccount(new FormData(form)))
        if (ok) {
          form.reset()
          setMessage('أُرسلت الدعوة ومُنح الدور؛ ستظهر العضوة في القائمة بعد قبول البريد.')
        }
      }}
    >
      <FormField label="البريد الجديد" name="email" type="email" required dir="ltr" className="min-w-64 flex-1" />
      <FormSelect label="الدور" name="role" options={[
        {value:'admin',label:'مديرة النظام'},{value:'operations',label:'العمليات'},{value:'finance',label:'المالية'},
        {value:'content',label:'إدارة المحتوى'},{value:'marketing',label:'التسويق'},{value:'support',label:'الدعم'},
        {value:'editor',label:'محررة'},{value:'analyst',label:'محللة'},{value:'auditor',label:'مدققة للقراءة فقط'},
      ]} className="w-48" />
      <Button type="submit" disabled={busy}>{busy?'جارٍ الإرسال…':'إرسال الدعوة'}</Button>
      {message&&<p className="w-full text-xs font-bold text-deep-teal" role="status">{message}</p>}
      {error&&<p className="w-full text-xs text-burgundy" role="alert">{error}</p>}
    </form>
  </>
}

export function RevokeRoleButton({ roleId, disabled = false }: { roleId: string; disabled?: boolean }) {
  const { busy, error, run } = useBusy()
  return (
    <div>
      <a className="mb-2 inline-block text-xs font-bold text-deep-teal underline underline-offset-4" href="/auth/admin/confirm?reauth=1&redirect=/admin/roles">تأكيد أمني حديث</a>
      <Button size="sm" variant="burgundy" disabled={busy || disabled} onClick={() => {
        if (window.confirm('هل تريدين سحب هذا الدور؟ سيُطبق التغيير فورًا ويُسجل في سجل التدقيق.')) run(() => revokeRole(roleId))
      }}>
        {disabled ? 'دورك الحالي' : 'سحب الدور'}
      </Button>
      {error && <p className="mt-1 text-xs text-burgundy">{error}</p>}
    </div>
  )
}
