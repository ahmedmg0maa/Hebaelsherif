'use client'
import { useState } from 'react'
import type { MediaOption } from '@/lib/data/cms'
import type { HomeMediaRef } from '@/lib/home/media'
const field = 'min-h-12 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-base text-ink'
export function HomeMediaFields({ slot, value, assets }: { slot: string; value?: HomeMediaRef; assets: MediaOption[] }) {
  const [id, setId] = useState(value?.assetId ?? ''), [alt, setAlt] = useState(value?.alt ?? ''), [x, setX] = useState(value?.x ?? 50), [y, setY] = useState(value?.y ?? 50)
  const selected = assets.find(asset => asset.id === id)
  return <fieldset className="grid gap-4 rounded-2xl border border-line p-4"><legend className="px-2 text-sm font-bold text-deep-teal">الصورة وموضع القص</legend>
    <label className="grid gap-2 text-sm">اختيار صورة موثقة الحقوق<select name={`media_${slot}_id`} value={id} onChange={event => { const asset = assets.find(a => a.id === event.target.value); setId(event.target.value); setAlt(asset?.alt ?? '') }} className={field}><option value="">استخدام الصورة الأصلية للقسم</option>{id && !selected && <option value={id}>الصورة الحالية غير متاحة — اختاري بديلًا</option>}{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.title}</option>)}</select></label>
    {selected && <div role="img" aria-label={alt || selected.title} className="mx-auto aspect-[4/3] w-full max-w-sm rounded-xl bg-cover" style={{ backgroundImage: `url(${selected.url})`, backgroundPosition: `${x}% ${y}%` }} />}
    {id && <><label className="grid gap-2 text-sm">وصف بديل عربي دقيق<input name={`media_${slot}_alt`} value={alt} onChange={event => setAlt(event.target.value)} maxLength={240} minLength={2} required className={field} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">موضع أفقي: {x}٪<input name={`media_${slot}_x`} type="range" min={0} max={100} value={x} onChange={event => setX(Number(event.target.value))} className="min-h-12 w-full" /></label><label className="grid gap-2 text-sm">موضع رأسي: {y}٪<input name={`media_${slot}_y`} type="range" min={0} max={100} value={y} onChange={event => setY(Number(event.target.value))} className="min-h-12 w-full" /></label></div></>}
    <p className="text-sm leading-loose text-text-soft">ارفعي الصور وأضيفي إثبات الحقوق في مكتبة الوسائط أولًا. لا تُعرض الصور الخاصة أو المؤرشفة هنا.</p>
  </fieldset>
}
