'use client'
import {AdminChoiceSearch} from './AdminChoicePicker'

import { useState } from 'react'
import type { MediaOption } from '@/lib/data/cms'
import { Button } from '@/components/ui/Button'

export function MediaPickerField({ assets, defaultValue = '', label = 'الصورة', name = 'cover_url', assetName = 'cover_asset_id' }: {
  assets: MediaOption[]
  defaultValue?: string | null
  label?: string
  name?: string
  assetName?: string
}) {
  const initial = assets.find((asset) => asset.url === defaultValue)
  const [url, setUrl] = useState(defaultValue ?? '')
  const [assetId, setAssetId] = useState(initial?.id ?? '')
  const [picked,setPicked]=useState<MediaOption|undefined>(initial)
  const selected=picked
  return (
    <fieldset className="space-y-2 rounded-2xl border border-line bg-ivory/35 p-3 md:col-span-2">
      <legend className="px-2 text-sm font-bold text-deep-teal">{label}</legend>
      <input type="hidden" name={assetName} value={assetId} />
      <input type="hidden" name={name} value={url} />
      {url && !selected && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3"><p className="text-sm text-text-soft">الغلاف الحالي محفوظ. اختاري صورة من المكتبة لتغييره.</p><Button type="button" size="sm" variant="ghost" onClick={() => { setAssetId(''); setUrl('');setPicked(undefined) }}>إزالة الغلاف</Button></div>}
      {selected && <div className="flex items-center gap-3 rounded-xl bg-aqua/8 p-2 text-sm text-deep-teal"><span className="h-12 w-16 rounded-lg bg-cover bg-center" role="img" aria-label={selected.alt || selected.title} style={{ backgroundImage: `url(${selected.url})` }} /><span className="font-semibold">{selected.title}</span><Button type="button" size="sm" variant="ghost" className="ms-auto" onClick={() => { setAssetId(''); setUrl('');setPicked(undefined) }}>إزالة</Button></div>}
      <AdminChoiceSearch kind="media" label="مكتبة الصور العامة" selected={assetId?[assetId]:[]} onSelect={asset=>{if(!asset.url)return;setAssetId(asset.id);setUrl(asset.url);setPicked({id:asset.id,title:asset.label,alt:asset.alt||'',kind:asset.kind||'image',url:asset.url})}}/>
    </fieldset>
  )
}
