/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation intentionally refreshes the private Auth document. */
'use client'

import { useState } from 'react'
import { setRolePermissions } from '@/lib/actions/cms'
import { PERMISSION_LABELS } from '@/lib/admin/permission-labels'
import { Button } from '@/components/ui/Button'
import { AdminEditorDialog } from './AdminEditorDialog'
import { ActionFeedback } from './ActionFeedback'
import { useAdminAction } from './useAdminAction'

export function RolePermissionEditor({ role, allPermissions, selected }: { role: string; allPermissions: string[]; selected: string[] }) {
  const { busy, feedback, run } = useAdminAction()
  const available = allPermissions.filter(permission => permission !== 'roles.manage')
  const [chosen, setChosen] = useState(() => new Set([...selected, 'admin.access']))
  return <AdminEditorDialog title="صلاحيات الدور" triggerLabel="تعديل الصلاحيات">
    <form className="space-y-5" aria-busy={busy} onSubmit={async event => {
      event.preventDefault()
      await run(() => setRolePermissions(role, [...chosen]), 'حُفظت الصلاحيات وأصبحت فعالة.')
    }}>
      <p className="text-sm leading-loose text-text-soft">المالكة تملك كل الصلاحيات دائمًا. يمكن منح هذا الدور جميع صلاحيات التشغيل؛ إدارة أدوار الفريق تبقى للمالكة.</p>
      <a className="inline-flex min-h-12 items-center text-sm font-bold text-deep-teal underline" href="/auth/admin/confirm?reauth=1&redirect=/admin/roles">تأكيد أمني حديث قبل الحفظ</a>
      <fieldset disabled={busy} className="space-y-4">
        <legend className="sr-only">اختيار الصلاحيات</legend>
        <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={() => setChosen(new Set(available))}>تحديد جميع صلاحيات التشغيل</Button><Button type="button" variant="ghost" onClick={() => setChosen(new Set(['admin.access']))}>إبقاء الدخول فقط</Button></div>
        <div className="grid gap-3 sm:grid-cols-2">{available.map(permission => <label key={permission} className="flex min-h-12 items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm text-ink">
          <input type="checkbox" checked={chosen.has(permission)} disabled={permission === 'admin.access'} className="h-5 w-5 accent-deep-teal" onChange={event => setChosen(previous => { const next = new Set(previous); if (event.target.checked) next.add(permission); else next.delete(permission); return next })} />
          <span>{PERMISSION_LABELS[permission]??permission}<span className="mt-1 block text-sm leading-6 text-text-soft">{permission==='admin.access'?'مطلوب للدور الإداري؛ لا يمكن إزالته من هنا.':'اختياري · يسمح لأعضاء هذا الدور بهذه العملية عند حفظ الصلاحيات، مع استمرار متطلبات الأمان.'}</span><span className="mt-1 block text-sm leading-6 text-text-soft">مثال: منح الإجراء فقط لمن يحتاجه ضمن عمله.</span></span>
        </label>)}</div>
      </fieldset>
      <ActionFeedback feedback={feedback} />
      <Button type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ الصلاحيات'}</Button>
    </form>
  </AdminEditorDialog>
}
