'use client'
import {AdminField} from './AdminField'

import { useMemo, useState } from 'react'
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
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => assets.filter((asset) => `${asset.title} ${asset.alt}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30), [assets, query])
  const selected = assets.find((asset) => asset.id === assetId)
  return (
    <fieldset className="space-y-2 rounded-2xl border border-line bg-ivory/35 p-3 md:col-span-2">
      <legend className="px-2 text-sm font-bold text-deep-teal">{label}</legend>
      <input type="hidden" name={assetName} value={assetId} />
      <input type="hidden" name={name} value={url} />
      {url && !selected && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3"><p className="text-sm text-text-soft">الغلاف الحالي محفوظ. اختاري صورة من المكتبة لتغييره.</p><Button type="button" size="sm" variant="ghost" onClick={() => { setAssetId(''); setUrl('') }}>إزالة الغلاف</Button></div>}
      {selected && <div className="flex items-center gap-3 rounded-xl bg-aqua/8 p-2 text-sm text-deep-teal"><span className="h-12 w-16 rounded-lg bg-cover bg-center" role="img" aria-label={selected.alt || selected.title} style={{ backgroundImage: `url(${selected.url})` }} /><span className="font-semibold">{selected.title}</span><Button type="button" size="sm" variant="ghost" className="ms-auto" onClick={() => { setAssetId(''); setUrl('') }}>إزالة</Button></div>}
      <details>
        <summary className="cursor-pointer text-sm font-bold text-deep-teal">اختيار من مكتبة الوسائط ({assets.length.toLocaleString('ar-EG')})</summary>
        <div className="mt-3 space-y-3">
          <AdminField name="media_search" label="البحث في مكتبة الصور" type="search" value={query} onChange={event=>setQuery(event.target.value)} hint="ابحثي بالاسم أو الوصف البديل لاختيار صورة موجودة. لا يغيّر البحث بيانات الصور." example="غلاف الكورس" maxLength={120}/>
          {filtered.length === 0 ? <p className="text-sm text-text-soft">لا توجد صور عامة مطابقة.</p> : <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {filtered.map((asset) => <button key={asset.id} type="button" aria-pressed={assetId === asset.id} onClick={() => { setAssetId(asset.id); setUrl(asset.url) }} className={`overflow-hidden rounded-xl border text-start ${assetId === asset.id ? 'border-deep-teal ring-2 ring-aqua/30' : 'border-line'}`}>
              <span className="block aspect-[4/3] bg-sand/20 bg-cover bg-center" role="img" aria-label={asset.alt || asset.title} style={{ backgroundImage: asset.kind === 'image' ? `url(${asset.url})` : undefined }} />
              <span className="block truncate px-2 py-2 text-sm font-semibold text-deep-teal">{asset.title}</span>
            </button>)}
          </div>}
        </div>
      </details>
    </fieldset>
  )
}
