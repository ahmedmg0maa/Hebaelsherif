"use client"

import { addModule, addLesson } from '@/lib/actions/cms'
import { Button } from '@/components/ui/Button'
import { AdminField as FormField } from '@/components/admin/AdminField'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'

export function ModuleForm({ courseId }: { courseId: string }) {
  const action = useAdminAction()
  return <form onSubmit={async event => {
    event.preventDefault()
    const form = event.currentTarget, title = String(new FormData(form).get('title') ?? '')
    if (await action.run(() => addModule(courseId, title), 'أُضيفت الوحدة.')) form.reset()
  }} className="space-y-3">
    <fieldset disabled={action.busy} className="flex flex-wrap items-end gap-3 disabled:opacity-60">
      <div className="min-w-0 flex-1"><FormField name="title" label="وحدة جديدة" hint="اسم محور يجمع دروسًا مرتبطة داخل الكورس." example="التعرف على الذات" required minLength={2} maxLength={160}/></div>
      <Button type="submit" disabled={action.busy}>{action.busy ? 'جارٍ الإضافة…' : 'إضافة وحدة'}</Button>
    </fieldset>
    <ActionFeedback feedback={action.feedback}/>
  </form>
}

export function LessonForm({ moduleId, courseId }: { moduleId: string; courseId: string }) {
  const action = useAdminAction()
  return <form onSubmit={async event => {
    event.preventDefault()
    const form = event.currentTarget, data = new FormData(form)
    if (await action.run(() => addLesson(moduleId, courseId, data), 'أُضيف الدرس.')) form.reset()
  }} className="space-y-3 rounded-2xl border border-line bg-surface-raised p-4">
    <fieldset disabled={action.busy} className="grid gap-3 disabled:opacity-60 sm:grid-cols-[2fr_1fr_auto]">
      <FormField label="عنوان الدرس" name="title" hint="اسم الدرس داخل المحور؛ اكتبي موضوعه بوضوح." example="تحديد أولويات الأسبوع" required minLength={2} maxLength={180}/>
      <FormField label="الدقائق" name="minutes" type="number" min={0} max={1440} defaultValue={0} dir="ltr"/>
      <label className="flex min-h-12 items-center gap-2 self-end text-sm text-ink"><input type="checkbox" name="is_preview" className="h-5 w-5 accent-deep-teal"/>معاينة مجانية <span className="text-sm text-text-soft">اختياري · تسمح بالدرس دون شراء بعد نشر الكورس. مثال: الدرس التعريفي.</span></label>
      <Button type="submit" disabled={action.busy} className="justify-self-start">{action.busy ? 'جارٍ الإضافة…' : 'إضافة الدرس'}</Button>
    </fieldset>
    <p className="text-sm leading-7 text-text-soft">أضيفي الفيديو والملفات من أدوات الرفع الآمن بعد إنشاء الدرس.</p>
    <ActionFeedback feedback={action.feedback}/>
  </form>
}
