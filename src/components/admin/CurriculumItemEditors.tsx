"use client"

import { deleteCourseLesson, deleteCourseModule, updateCourseLesson, updateCourseModule } from '@/lib/actions/cms'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { AdminEditorDialog } from './AdminEditorDialog'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'

export function ModuleEditor({ id, courseId, title, sort }: { id: string; courseId: string; title: string; sort: number }) {
  const action = useAdminAction()
  return <AdminEditorDialog title="تعديل الوحدة" triggerLabel="تعديل الوحدة"><form onSubmit={async event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await action.run(() => updateCourseModule(id, courseId, String(data.get('title')), Number(data.get('sort'))), 'حُفظت الوحدة.')
  }} className="space-y-5">
    <fieldset disabled={action.busy} className="grid gap-4 disabled:opacity-60 sm:grid-cols-[2fr_1fr]">
      <FormField name="title" label="عنوان الوحدة" maxLength={160} minLength={2} required defaultValue={title}/>
      <FormField name="sort" label="ترتيب الوحدة" type="number" min={1} max={10000} required defaultValue={sort} dir="ltr"/>
    </fieldset>
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={action.busy}>حفظ الوحدة</Button><Button type="button" variant="burgundy" disabled={action.busy} onClick={async () => {
      if (window.confirm('هل تريدين حذف هذه الوحدة الخالية؟')) await action.run(() => deleteCourseModule(id, courseId), 'حُذفت الوحدة.')
    }}>حذف الوحدة</Button></div>
    <ActionFeedback feedback={action.feedback}/>
  </form></AdminEditorDialog>
}

export function LessonEditor({ id, courseId, title, minutes, sort, preview }: { id: string; courseId: string; title: string; minutes: number; sort: number; preview: boolean }) {
  const action = useAdminAction()
  return <AdminEditorDialog title="تعديل الدرس" triggerLabel="تعديل الدرس"><form onSubmit={async event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await action.run(() => updateCourseLesson(id, courseId, data), 'حُفظ الدرس.')
  }} className="space-y-5">
    <fieldset disabled={action.busy} className="grid gap-4 disabled:opacity-60 sm:grid-cols-2">
      <FormField name="title" label="عنوان الدرس" maxLength={180} minLength={2} required defaultValue={title} className="sm:col-span-2"/>
      <FormField name="minutes" label="المدة بالدقائق" type="number" min={0} max={1440} required defaultValue={minutes} dir="ltr"/>
      <FormField name="sort" label="ترتيب الدرس" type="number" min={1} max={10000} required defaultValue={sort} dir="ltr"/>
      <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" name="is_preview" defaultChecked={preview} className="h-5 w-5 accent-deep-teal"/>معاينة مجانية</label>
    </fieldset>
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={action.busy}>حفظ الدرس</Button><Button type="button" variant="burgundy" disabled={action.busy} onClick={async () => {
      if (window.confirm('هل تريدين حذف هذا الدرس الخالي من الملفات وسجل العميلات؟')) await action.run(() => deleteCourseLesson(id, courseId), 'حُذف الدرس.')
    }}>حذف الدرس</Button></div>
    <ActionFeedback feedback={action.feedback}/>
  </form></AdminEditorDialog>
}
