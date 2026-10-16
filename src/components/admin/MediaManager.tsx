'use client'

import { useState } from 'react'
import { beginMediaUpload, finalizeMediaUpload, manageMediaLifecycle, updateMediaMetadata } from '@/lib/actions/admin-control'
import { Button } from '@/components/ui/Button'
import { getBrowserClient } from '@/lib/supabase/client'

const input = 'mt-1 min-h-11 w-full rounded-xl border border-line bg-surface-raised px-4 py-2 text-sm text-ink'

export function MediaUpload() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  return <form className="grid gap-4 rounded-2xl border border-antique-gold/30 bg-surface-raised p-6 shadow-card md:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setMessage(null)
    const form = new FormData(event.currentTarget)
    const file = form.get('file')
    if (!(file instanceof File)) { setMessage('اختاري ملفًا.'); setBusy(false); return }
    const input = {
      bucket: String(form.get('bucket') ?? ''), name: file.name, type: file.type, size: file.size,
      title: String(form.get('title') ?? ''), alt: String(form.get('alt') ?? ''), tags: String(form.get('tags') ?? ''),
      caption: String(form.get('caption') ?? ''), credit: String(form.get('credit') ?? ''), rightsStatus: String(form.get('rights_status') ?? ''),
      rightsReference: String(form.get('rights_reference') ?? ''), folder: String(form.get('folder') ?? ''),
      focalX: Number(form.get('focal_x') ?? 50), focalY: Number(form.get('focal_y') ?? 50),
    }
    const started = await beginMediaUpload(input)
    if (!started.ok) { setMessage(started.error); setBusy(false); return }
    const upload = await getBrowserClient().storage.from(started.data.bucket).uploadToSignedUrl(started.data.path, started.data.token, file, { contentType: file.type })
    const result = upload.error ? { ok: false as const, error: 'تعذّر رفع الملف بأمان. حاولي مرة أخرى.' } : await finalizeMediaUpload({ ...input, path: started.data.path })
    setMessage(result.ok ? 'تم رفع الملف وفهرسته في المكتبة.' : result.error); setBusy(false)
    if (result.ok) event.currentTarget.reset()
  }}>
    <label className="text-sm font-semibold text-deep-teal">الملف<input name="file" type="file" required className={input} /></label>
    <label className="text-sm font-semibold text-deep-teal">المخزن<select name="bucket" className={input}><option value="public-media">وسائط عامة</option><option value="course-videos">فيديو الدورات</option><option value="course-resources">موارد الدورات</option><option value="protected-books">الكتب المحمية</option><option value="workshop-recordings">تسجيلات الورش</option></select></label>
    <label className="text-sm font-semibold text-deep-teal">اسم واضح للأصل<input name="title" className={input} placeholder="مثال: غلاف دورة الوعي" /></label>
    <label className="text-sm font-semibold text-deep-teal">وسوم مفصولة بفواصل<input name="tags" className={input} placeholder="دورات، أغلفة، رئيسية" /></label>
    <label className="text-sm font-semibold text-deep-teal md:col-span-2">النص البديل / الوصف<input name="alt" className={input} placeholder="صفي ما يظهر في الصورة لمن لا يستطيع رؤيتها" /></label>
    <label className="text-sm font-semibold text-deep-teal">المجلد التنظيمي<input name="folder" defaultValue="uncategorized" dir="ltr" className={input} /></label>
    <label className="text-sm font-semibold text-deep-teal">حقوق الاستخدام<select name="rights_status" defaultValue="unverified" className={input}><option value="unverified">غير موثقة</option><option value="owned">مملوك</option><option value="licensed">مرخّص</option><option value="public_domain">ملكية عامة</option></select></label>
    <label className="text-sm font-semibold text-deep-teal">تعليق الصورة<input name="caption" className={input} /></label>
    <label className="text-sm font-semibold text-deep-teal">النسبة / المصوّر<input name="credit" className={input} /></label>
    <label className="text-sm font-semibold text-deep-teal md:col-span-2">مرجع الحق أو الترخيص<input name="rights_reference" className={input} placeholder="رقم ترخيص أو رابط المصدر — من دون أسرار" /></label>
    <div className="grid gap-3 md:col-span-2 sm:grid-cols-2"><label className="text-sm font-semibold text-deep-teal">بؤرة القص أفقيًا %<input name="focal_x" type="number" min="0" max="100" defaultValue="50" className={input} /></label><label className="text-sm font-semibold text-deep-teal">بؤرة القص رأسيًا %<input name="focal_y" type="number" min="0" max="100" defaultValue="50" className={input} /></label></div>
    <p className="text-xs text-text-soft md:col-span-2">الصور العامة تتطلب نصًا بديلًا. أنواع الملفات والحجم تُفحص حسب المخزن، والملفات الخاصة لا تحصل على رابط عام.</p>
    {message && <p className="text-sm font-semibold text-deep-teal md:col-span-2" role="status">{message}</p>}
    <Button type="submit" disabled={busy} className="justify-self-start">{busy ? 'جاري الرفع…' : 'رفع وفهرسة الملف'}</Button>
  </form>
}

type MediaMetadataProps = { id: string; title: string; alt: string; tags: string[]; caption: string; credit: string; rightsStatus: string; rightsReference: string; folder: string; focalX: number; focalY: number }

export function MediaMetadata({ id, title, alt, tags, caption, credit, rightsStatus, rightsReference, folder, focalX, focalY }: MediaMetadataProps) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  return <details className="rounded-xl border border-line bg-ivory/40"><summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold text-deep-teal">تعديل البيانات</summary><form className="grid gap-2 border-t border-line p-3" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); const result = await updateMediaMetadata(id, new FormData(event.currentTarget)); setMessage(result.ok ? 'حُفظت البيانات.' : result.error); setBusy(false)
  }}>
    <label className="text-xs font-semibold text-deep-teal">الاسم<input name="title" defaultValue={title} className={input} required /></label>
    <label className="text-xs font-semibold text-deep-teal">النص البديل<input name="alt" defaultValue={alt} className={input} /></label>
    <label className="text-xs font-semibold text-deep-teal">الوسوم<input name="tags" defaultValue={tags.join(', ')} className={input} /></label>
    <label className="text-xs font-semibold text-deep-teal">المجلد<input name="folder" defaultValue={folder} dir="ltr" className={input} /></label>
    <label className="text-xs font-semibold text-deep-teal">حقوق الاستخدام<select name="rights_status" defaultValue={rightsStatus} className={input}><option value="unverified">غير موثقة</option><option value="owned">مملوك</option><option value="licensed">مرخّص</option><option value="public_domain">ملكية عامة</option></select></label>
    <label className="text-xs font-semibold text-deep-teal">التعليق<input name="caption" defaultValue={caption} className={input} /></label>
    <label className="text-xs font-semibold text-deep-teal">النسبة<input name="credit" defaultValue={credit} className={input} /></label>
    <label className="text-xs font-semibold text-deep-teal">مرجع الحق<input name="rights_reference" defaultValue={rightsReference} className={input} /></label>
    <div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-deep-teal">بؤرة X<input name="focal_x" type="number" min="0" max="100" defaultValue={focalX} className={input} /></label><label className="text-xs font-semibold text-deep-teal">بؤرة Y<input name="focal_y" type="number" min="0" max="100" defaultValue={focalY} className={input} /></label></div>
    {message && <p role="status" className="text-xs font-semibold text-deep-teal">{message}</p>}
    <Button size="sm" type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ البيانات'}</Button>
  </form></details>
}

export function CopyMediaUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return <Button size="sm" variant="ghost" type="button" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true) }}>{copied ? 'نُسخ' : 'نسخ الرابط'}</Button>
}

type MediaReplacementOption = { id: string; title: string }

export function MediaLifecycle({ id, archivedAt, replacedBy, usageCount = 0, replacements }: { id: string; archivedAt: string | null; replacedBy: string | null; usageCount?: number; replacements: MediaReplacementOption[] }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const run = async (action: 'archive' | 'restore' | 'replace', replacementId?: string) => {
    setBusy(true); setMessage(null)
    const result = await manageMediaLifecycle(id, action, replacementId)
    setMessage(result.ok ? action === 'archive' ? 'نُقل الأصل إلى الأرشيف.' : action === 'restore' ? 'استُعيد الأصل إلى المكتبة النشطة.' : 'نُقلت الاستخدامات وأُرشف الأصل القديم.' : result.error)
    setBusy(false)
  }
  if (archivedAt) return <div className="space-y-2">{replacedBy ? <p className="text-xs font-semibold text-text-soft">مؤرشف بعد استبدال آمن؛ الأصل البديل هو المرجع التشغيلي.</p> : <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => run('restore')}>استعادة</Button>}{message && <p role="status" className="text-xs font-semibold text-deep-teal">{message}</p>}</div>
  return <div className="space-y-2">
    <p className="text-xs text-text-soft">{usageCount > 0 ? `مستخدم في ${usageCount.toLocaleString('ar-EG')} موضع؛ يلزم الاستبدال قبل الأرشفة.` : 'الأرشفة قابلة للاستعادة ولا تحذف ملف التخزين.'}</p>
    <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={() => run('archive')}>أرشفة</Button></div>
    {replacements.length > 0 && <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void run('replace', String(form.get('replacement_id') ?? '')) }}><select name="replacement_id" required className="min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface-raised px-2 text-xs text-ink"><option value="">اختاري أصلًا بديلًا متوافقًا</option>{replacements.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><Button type="submit" size="sm" variant="secondary" disabled={busy}>استبدال ونقل الاستخدام</Button></form>}
    {message && <p role="status" className="text-xs font-semibold text-deep-teal">{message}</p>}
  </div>
}
