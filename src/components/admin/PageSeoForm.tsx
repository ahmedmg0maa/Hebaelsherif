'use client'

import { updatePageSeo } from '@/lib/actions/cms'
import { AdminField as FormField } from '@/components/admin/AdminField'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'
import { Button } from '@/components/ui/Button'

export function PageSeoForm({
  pageId,
  seoTitle,
  seoDescription,
}: {
  pageId: string
  seoTitle: string
  seoDescription: string
}) {
  const { busy, feedback, run } = useAdminAction()

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        await run(() => updatePageSeo(pageId, data), 'حُفظ عنوان نتائج البحث ووصفها.')
      }}
      aria-busy={busy}
      className="space-y-3 border-t border-line pt-4"
    >
      <fieldset disabled={busy} className="grid gap-3 disabled:opacity-60 sm:grid-cols-[1fr_2fr_auto]">
      <FormField label="عنوان نتائج البحث" name="seo_title" hint="عنوان مختصر يساعد على فهم الصفحة في محركات البحث. تركه فارغًا يستخدم عنوان الصفحة." example="جلسات هبة الشريف" maxLength={70} defaultValue={seoTitle} />
      <FormField label="وصف نتائج البحث" name="seo_description" hint="ملخص واضح لمحتوى الصفحة؛ قد تختار محركات البحث نصًا آخر من محتواها." example="تعرّفي على الجلسات المتاحة وطريقة اختيار موعد مناسب." maxLength={180} defaultValue={seoDescription} />
      <div className="flex items-end gap-2 pb-0.5">
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ وصف البحث'}
        </Button>
      </div>
      </fieldset>
      <ActionFeedback feedback={feedback} />
    </form>
  )
}
