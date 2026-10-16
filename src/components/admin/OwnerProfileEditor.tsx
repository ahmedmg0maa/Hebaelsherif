'use client'

import { useState } from 'react'
import { saveOwnerProfile } from '@/lib/actions/cms'
import { OWNER_FIELDS, type OwnerProfile } from '@/lib/owner/profile'
import { Button } from '@/components/ui/Button'
const input = 'min-h-12 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-base text-ink'
export function OwnerProfileEditor({ profile }: { profile: OwnerProfile }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false)
  return <form className="grid gap-5" aria-busy={busy} onSubmit={async event => {
    event.preventDefault(); if (busy) return
    const form = new FormData(event.currentTarget); setBusy(true); setMessage('')
    try { const r = await saveOwnerProfile(form); setFailed(!r.ok); setMessage(r.ok ? 'حُفظ التعريف والاعتمادات ونسخة المراجعة.' : r.error) }
    catch { setFailed(true); setMessage('تعذر الحفظ. بياناتك ما زالت هنا؛ حاولي مرة أخرى.') }
    finally { setBusy(false) }
  }}>
    {OWNER_FIELDS.map(([key, label, max]) => <label key={key} className="grid gap-2 text-sm font-semibold text-deep-teal">{label}<textarea name={key} defaultValue={profile[key]} maxLength={max} minLength={2} rows={key === 'lead' ? 3 : 2} required className={input} /></label>)}
    <fieldset className="grid gap-3"><legend className="mb-3 font-bold text-deep-teal">القيم</legend>{[0, 1, 2].map(i => <div key={i} className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm">اسم القيمة {i + 1}<input name={`value_title_${i}`} defaultValue={profile.values[i]?.title ?? ''} maxLength={70} required className={input} /></label><label className="grid gap-2 text-sm">شرح القيمة<input name={`value_text_${i}`} defaultValue={profile.values[i]?.text ?? ''} maxLength={240} required className={input} /></label></div>)}</fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-line p-4"><legend className="px-2 font-bold text-deep-teal">الاعتمادات والخبرة</legend><p className="text-sm leading-loose text-text-soft">تظهر المؤهلات المؤكدة فقط في الرئيسية وصفحة «عن هبة». تأكدي من المستندات قبل تفعيل الظهور؛ اتركي الحقول فارغة لحذف المؤهل.</p>{[0, 1, 2].map(i => <div key={i} className="grid gap-3 border-b border-line pb-4 last:border-0 sm:grid-cols-2"><label className="grid gap-2 text-sm">القيمة أو الاعتماد<input name={`credential_value_${i}`} defaultValue={profile.credentials[i]?.value ?? ''} maxLength={40} className={input} /></label><label className="grid gap-2 text-sm">الوصف<input name={`credential_label_${i}`} defaultValue={profile.credentials[i]?.label ?? ''} maxLength={100} className={input} /></label><label className="flex min-h-12 items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" name={`credential_verified_${i}`} defaultChecked={profile.credentials[i]?.verified} />راجعت صحة هذا المؤهل وأوافق على ظهوره للعامة</label></div>)}</fieldset>
    {message && <p role={failed ? 'alert' : 'status'} className="text-sm leading-loose text-deep-teal">{message}</p>}
    <Button type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ تعريف هبة'}</Button>
  </form>
}
