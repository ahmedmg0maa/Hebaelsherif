'use client'

import Link from 'next/link'
import { type FormEvent, useRef, useState } from 'react'
import { abandonProtectedUpload, beginProtectedUpload, finalizeProtectedUpload } from '@/lib/actions/delivery-admin'
import { getUploadRule,extensionOf } from '@/lib/delivery/file-validation.mjs'
import { uploadProtectedFile } from '@/lib/delivery/direct-upload'
import { Button } from '@/components/ui/Button'
import { AdminField as FormField } from '@/components/admin/AdminField'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'

type Kind = 'book' | 'lesson-video' | 'lesson-resource' | 'workshop-resource' | 'workshop-recording'
type Attempt = Parameters<typeof finalizeProtectedUpload>[2]
export function ProtectedDeliveryUpload({ kind, entityId, label }: { kind: Kind; entityId: string; label: string }) {
 const { busy, feedback, run } = useAdminAction()
 const [progress, setProgress] = useState('')
 const [percent,setPercent]=useState<number|null>(null)
 const [pending, setPending] = useState<Attempt | null>(null)
 const attempt = useRef<Attempt | null>(null)
 const formRef = useRef<HTMLFormElement>(null)
 function clear() { attempt.current = null; setPending(null); formRef.current?.reset() }
 async function finish(input: Attempt) {
  setProgress('فحص الملف وربطه بالمحتوى…')
  const result = await finalizeProtectedUpload(kind, entityId, input)
  if (result.ok) clear()
  return result
 }
 async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  await run(async () => {
   try {
    if (attempt.current) return await finish(attempt.current)
    const file = form.get('file')
    if (!(file instanceof File) || !file.size) return { ok: false, error: 'اختاري ملفًا غير فارغ.' }
    const rule=getUploadRule(kind)!,format=rule.extensions[extensionOf(file.name)]
    if(file.size>rule.max||!format||!format.mimes.includes(file.type))return {ok:false,error:`اختاري صيغة مسموحة وملفًا لا يتجاوز ${rule.max/1000000} ميجابايت. لم يبدأ الرفع.`}
    setProgress('تجهيز تصريح الرفع…')
    const start = await beginProtectedUpload(kind, entityId, { name: file.name, type: file.type, size: file.size })
    if (!start.ok) return start
    const input: Attempt = { intentId: start.data.intentId, path: start.data.path, title: String(form.get('title') || file.name), format: String(form.get('version') || '1.0'), published: form.get('published') === 'on' }
    attempt.current = input; setPending(input)
    setProgress('جارٍ نقل الملف إلى التخزين…')
    setPercent(0)
    try{await uploadProtectedFile(start.data.uploadUrl,file,setPercent)}catch{return { ok: false, error: 'لم يتأكد اكتمال النقل. تحققي من نفس المحاولة، أو ألغِي التصريح قبل رفع ملف جديد.' }}
    return await finish(input)
   } finally { setProgress('');setPercent(null) }
  }, 'تم الرفع والفحص والربط بالمحتوى.')
 }
 const rule = getUploadRule(kind)!
 const accept = Object.keys(rule.extensions).map(extension => `.${extension}`).join(',')
 return <form ref={formRef} className="grid gap-3 rounded-xl border border-line bg-surface-raised p-4" onSubmit={submit}>
  <p className="text-sm font-bold text-deep-teal">{label}</p>
  <p className="text-xs leading-6 text-text-soft">الحد الأقصى: {(rule.max / 1000 / 1000).toLocaleString('ar-EG')} ميجابايت. الصيغ: <span dir="ltr">{accept}</span>. يُفحص النوع والحجم الفعليان قبل الربط.</p>
  <fieldset disabled={busy || pending !== null} className="grid gap-3">
   <legend className="sr-only">بيانات الملف</legend>
   <FormField name="title" label="عنوان الملف" maxLength={180} hint="الاسم الذي يظهر بجوار الملف للعميلة المستحقة. إن تُرك فارغًا يُستخدم اسم الملف." example="ورقة تطبيق الدرس الأول"/>
   {kind === 'book' && <FormField name="version" label="رقم الإصدار" defaultValue="1.0" maxLength={30} required />}
   <FormField name="file" type="file" label="الملف" required accept={accept} hint="اختاري الملف من جهازك. يبدأ النقل عند الضغط على زر الرفع، ثم يفحصه الخادم قبل إتاحته." example={kind==='lesson-video'?'مقطع الدرس بصيغة MP4':'ورقة عمل بصيغة PDF'} limits={`حتى ${rule.max/1000000} ميجابايت · ${accept}`}/>
   {kind === 'workshop-recording' && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="published" />نشر التسجيل للمسجلات بعد الفحص</label>}
  </fieldset>
  {pending && <p className="text-sm text-text-soft">المحاولة الحالية محفوظة في هذه الصفحة. عند انقطاع الرد استخدمي التحقق نفسه قبل بدء رفع جديد. بعد مغادرة الصفحة راجعي الملفات المرتبطة وقائمة التنظيف.</p>}
  <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={busy}>{pending ? 'التحقق وإكمال نفس المحاولة' : 'رفع آمن مباشر'}</Button>
   {pending && <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => run(async () => {
    const result = await abandonProtectedUpload(kind, entityId, pending)
    if (result.ok) clear()
    return result
   }, 'أُلغي التصريح وسُجّل الملف للتنظيف. لم يُحذف أي ملف مرتبط.')}>إلغاء تصريح هذه المحاولة</Button>}
  </div>
  {progress && <p role="status" className="text-xs text-text-soft">{progress}</p>}
  {percent!==null&&<div><progress className="w-full" max={100} value={percent} aria-label="تقدم نقل الملف"/><p role="status" className="text-sm text-text-soft">{percent.toLocaleString('ar-EG')}٪ من النقل. الربط بالمحتوى يتم بعد الفحص.</p></div>}
  <ActionFeedback feedback={feedback} />
  <Link href="/admin/delivery" className="text-xs underline underline-offset-4 text-deep-teal">متابعة تنظيف الملفات والتصاريح المنتهية</Link>
 </form>
}
