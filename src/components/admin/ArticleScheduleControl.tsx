'use client'

import { scheduleArticle } from '@/lib/actions/cms'
import { Button } from '@/components/ui/Button'
import { AdminSelect as FormSelect, AdminField as FormField } from '@/components/admin/AdminField'
import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { AdminEditorDialog } from '@/components/admin/AdminEditorDialog'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'

export function ArticleScheduleControl({ id, status, publishAt }: { id: string; status: string; publishAt: string | null }) {
  const { busy, feedback, run } = useAdminAction()
  return <AdminEditorDialog title="حالة نشر المقال" triggerLabel="إدارة النشر">
    <form className="space-y-5" aria-busy={busy} onSubmit={async event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      await run(() => scheduleArticle(id, String(data.get('status')), String(data.get('publish_at') || '') || null), 'حُفظت حالة النشر.')
    }}>
      <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
        <FormSelect label="حالة المقال" name="status" defaultValue={status} options={[
          { value: 'draft', label: 'مسودة' }, { value: 'scheduled', label: 'مجدول' },
          { value: 'published', label: 'منشور' }, { value: 'archived', label: 'مؤرشف' },
        ]} />
        <FormField label="موعد النشر بتوقيت القاهرة" name="publish_at" type="datetime-local" dir="ltr" defaultValue={publishAt ? formatCairoLocalDateTime(publishAt) ?? '' : ''} hint="اختاري موعدًا مستقبليًا عند جدولة المقال." />
      </fieldset>
      <ActionFeedback feedback={feedback} />
      <Button type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ الحالة'}</Button>
    </form>
  </AdminEditorDialog>
}
