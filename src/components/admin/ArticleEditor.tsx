'use client'

import { useState } from 'react'
import { deleteArticle, saveArticle } from '@/lib/actions/admin-control'
import { Button } from '@/components/ui/Button'
import { FormField, FormTextarea } from '@/components/ui/FormField'
import { MediaPickerField } from '@/components/admin/MediaPickerField'
import { AdminEditorDialog } from '@/components/admin/AdminEditorDialog'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'
import type { MediaOption } from '@/lib/data/cms'

export type ArticleAdminItem = { id: string; title: string; slug: string; excerpt: string; content: string; coverUrl: string | null; seoTitle: string | null; seoDescription: string | null }

export function ArticleEditor({ article, media = [] }: { article: ArticleAdminItem; media?: MediaOption[] }) {
  const { busy, feedback, run } = useAdminAction()
  const [confirm, setConfirm] = useState(false)
  return <AdminEditorDialog title={`تحرير: ${article.title}`} triggerLabel="تحرير المقال">
    <form className="space-y-6" aria-busy={busy} onSubmit={async event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      await run(() => saveArticle(article.id, data), 'حُفظت التعديلات مع نسخة مراجعة.')
    }}>
      <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-bold text-deep-teal">النص والغلاف</legend>
        <FormField label="العنوان" name="title" minLength={3} maxLength={160} defaultValue={article.title} required />
        <FormField label="الرابط" name="slug" minLength={3} maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={article.slug} dir="ltr" required />
        <FormTextarea label="المقتطف" name="excerpt" maxLength={500} defaultValue={article.excerpt} rows={3} className="sm:col-span-2" />
        <FormTextarea label="المحتوى" name="content" maxLength={100000} defaultValue={article.content} rows={16} className="sm:col-span-2" />
        <div className="sm:col-span-2"><MediaPickerField assets={media} defaultValue={article.coverUrl} label="صورة غلاف المقال" /></div>
      </fieldset>
      <fieldset disabled={busy} className="grid gap-5 rounded-2xl border border-line bg-ivory/35 p-5">
        <legend className="px-2 font-bold text-deep-teal">الظهور في البحث</legend>
        <FormField label="عنوان نتائج البحث" name="seo_title" maxLength={70} defaultValue={article.seoTitle ?? ''} />
        <FormTextarea label="وصف نتائج البحث" name="seo_description" maxLength={180} defaultValue={article.seoDescription ?? ''} rows={3} />
      </fieldset>
      <ActionFeedback feedback={feedback} />
      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <Button type="submit" disabled={busy}>{busy ? 'جاري التنفيذ…' : 'حفظ التعديلات'}</Button>
        {!confirm ? <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirm(true)}>أرشفة المقال</Button> : <div className="w-full space-y-3 rounded-xl border border-burgundy/25 bg-burgundy/5 p-4">
          <p className="text-sm leading-7 text-burgundy">سيختفي المقال من النشر مع الاحتفاظ بسجله.</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="burgundy" disabled={busy} onClick={async () => { if (await run(() => deleteArticle(article.id), 'أُرشف المقال مع حفظ تاريخه.')) setConfirm(false) }}>تأكيد الأرشفة</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>تراجع</Button>
          </div>
        </div>}
      </div>
    </form>
  </AdminEditorDialog>
}
