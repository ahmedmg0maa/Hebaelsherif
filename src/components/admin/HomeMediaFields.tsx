'use client'
import {AdminField} from './AdminField'

import {AdminChoicePicker} from './AdminChoicePicker'
import { useState } from 'react'
import type { MediaOption } from '@/lib/data/cms'
import type { HomeMediaRef } from '@/lib/home/media'
export function HomeMediaFields({ slot, value, assets }: { slot: string; value?: HomeMediaRef; assets: MediaOption[] }) {
  const [id, setId] = useState(value?.assetId ?? ''), [alt, setAlt] = useState(value?.alt ?? ''), [x, setX] = useState(value?.x ?? 50), [y, setY] = useState(value?.y ?? 50)
  const [chosen,setChosen]=useState<MediaOption|undefined>(assets.find(asset=>asset.id===id))
  const selected=chosen
  return <fieldset className="grid gap-4 rounded-2xl border border-line p-4"><legend className="px-2 text-sm font-bold text-deep-teal">الصورة وموضع القص</legend>
    <AdminChoicePicker kind="home-media" name={`media_${slot}_id`} label="صورة عامة موثقة الحقوق — اختياري" value={id} initialLabel={selected?.title} onChange={(next,asset)=>{setId(next);setAlt(asset?.alt??'');setChosen(asset?.url?{id:asset.id,title:asset.label,alt:asset.alt||'',url:asset.url,kind:'image'}:undefined)}}/>
    {selected && <div role="img" aria-label={alt || selected.title} className="mx-auto aspect-[4/3] w-full max-w-sm rounded-xl bg-cover" style={{ backgroundImage: `url(${selected.url})`, backgroundPosition: `${x}% ${y}%` }} />}
    {id && <><AdminField  label={`وصف بديل عربي دقيق`} name={`media_${slot}_alt`} value={alt} onChange={event => setAlt(event.target.value)} maxLength={240} minLength={2} required/><div className="grid gap-4 sm:grid-cols-2"><AdminField  label={`موضع أفقي: ${x}٪`} name={`media_${slot}_x`} type="range" min={0} max={100} value={x} onChange={event => setX(Number(event.target.value))}/><AdminField  label={`موضع رأسي: ${y}٪`} name={`media_${slot}_y`} type="range" min={0} max={100} value={y} onChange={event => setY(Number(event.target.value))}/></div></>}
    <p className="text-sm leading-loose text-text-soft">ارفعي الصور وأضيفي إثبات الحقوق في مكتبة الوسائط أولًا. لا تُعرض الصور الخاصة أو المؤرشفة هنا.</p>
  </fieldset>
}
