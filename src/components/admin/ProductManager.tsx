'use client'
import {AdminTextarea} from './AdminField'
import {AdminField} from './AdminField'

import { useState } from 'react'
import { AdminEditorDialog } from '@/components/admin/AdminEditorDialog'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'
import { deleteProductRecord, deleteProductVariant, saveBundleChildren, saveProductRecord, saveProductVariant, setProgramProductPublication } from '@/lib/actions/admin-control'
import { Button } from '@/components/ui/Button'
import { MediaPickerField } from '@/components/admin/MediaPickerField'
import type { MediaOption } from '@/lib/data/cms'

export type ProductAdminItem = { id: string; type: string; title: string; slug: string; subtitle: string | null; description: string; price: number; compareAtPrice: number | null; currency: string; coverUrl: string | null; isPublished: boolean; sort: number }
export type ProductVariantItem = { id: string; name: string; price: number; isActive: boolean }
export type BundleChildOption = { id: string; title: string; type: string }
const input = 'min-h-12 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-base text-ink'

function ProductForm({ item, media = [] }: { item?: ProductAdminItem; media?: MediaOption[] }) {
  const { busy, feedback, run } = useAdminAction(); const [confirm,setConfirm]=useState(false); const [formVersion, setFormVersion] = useState(0)
  return <form className="grid gap-3 md:grid-cols-2" aria-busy={busy} onSubmit={async(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);if(await run(()=>saveProductRecord(item?.id??null,data),'تم حفظ المنتج.')){if(!item)setFormVersion(version=>version+1)}}}><fieldset key={formVersion} disabled={busy} className="grid min-w-0 gap-5 md:col-span-2 md:grid-cols-2">
    <label className="text-sm font-bold text-deep-teal">النوع<select name="type" defaultValue={item?.type??'bundle'} disabled={Boolean(item)} className={input}><option value="bundle">حزمة</option><option value="vip">VIP</option><option value="free_resource">مورد مجاني</option>{item && !['bundle','vip','free_resource'].includes(item.type) && <option value={item.type}>{item.type}</option>}</select>{item&&<input type="hidden" name="type" value={item.type}/>}</label>
    <AdminField label="العنوان" name="title" defaultValue={item?.title} required/>
    <AdminField label="الرابط" name="slug" defaultValue={item?.slug} dir="ltr" required/>
    <AdminField label="العنوان الفرعي" name="subtitle" defaultValue={item?.subtitle??''}/>
    <AdminField label="السعر" name="price" type="number" min="0" step="0.01" defaultValue={item?.price??0} required/>
    <AdminField label="قبل الخصم" name="compare_at_price" type="number" min="0" step="0.01" defaultValue={item?.compareAtPrice??''}/>
    <AdminField label="العملة" name="currency" defaultValue={item?.currency??'EGP'} dir="ltr"/>
    <AdminField label="الترتيب" name="sort" type="number" defaultValue={item?.sort??0}/>
    <MediaPickerField assets={media} defaultValue={item?.coverUrl} label="غلاف المنتج" />
    <AdminTextarea className="text-sm font-bold text-deep-teal md:col-span-2" label="الوصف" name="description" defaultValue={item?.description} rows={3}/>
    <p className="rounded-xl bg-ivory/70 p-3 text-sm leading-relaxed text-text-soft md:col-span-2">الحفظ يعيد البرنامج إلى مسودة لحماية السعر والتكوين. استخدمي زر النشر المستقل بعد اكتمال الحزمة أو ربط VIP أو المورد المجاني.</p>
    </fieldset><ActionFeedback feedback={feedback} className="md:col-span-2" />
    <div className="flex flex-wrap gap-2 md:col-span-2"><Button type="submit" size="sm" disabled={busy}>{busy?'جاري الحفظ…':item?'حفظ المنتج':'إنشاء المنتج'}</Button>{item&&(!confirm?<Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={()=>setConfirm(true)}>حذف</Button>:<><Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={()=>run(()=>deleteProductRecord(item.id),'حُذف المنتج.')}>تأكيد الحذف</Button><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={()=>setConfirm(false)}>تراجع</Button></>)}</div>
  </form>
}

export function ProductCreatePanel({media=[]}:{media?:MediaOption[]}){return <details className="rounded-2xl border border-antique-gold/30 bg-surface-raised shadow-card"><summary className="cursor-pointer list-none px-6 py-5 font-heading text-xl font-bold text-deep-teal">إضافة حزمة أو منتج VIP أو مورد مجاني</summary><div className="border-t border-line p-6"><ProductForm media={media}/></div></details>}
export function ProductEditPanel({item,media=[]}:{item:ProductAdminItem;media?:MediaOption[]}){return <AdminEditorDialog title={`تعديل: ${item.title}`} triggerLabel="تعديل كامل"><ProductForm item={item} media={media}/></AdminEditorDialog>}

export function ProgramPublishControl({ productId, published }: { productId: string; published: boolean }) {
  const { busy, feedback, run } = useAdminAction()
  return <div className="space-y-3"><Button type="button" size="sm" variant={published ? 'secondary' : 'primary'} disabled={busy} onClick={() => run(() => setProgramProductPublication(productId, !published), published ? 'أُخفي البرنامج.' : 'نُشر البرنامج بعد فحص الجاهزية.')}>{busy ? 'جاري التنفيذ…' : published ? 'إخفاء' : 'فحص ونشر'}</Button><ActionFeedback feedback={feedback} /></div>
}

export function ProductComposition({ productId, productType, variants, options, selectedChildren }: { productId: string; productType: string; variants: ProductVariantItem[]; options: BundleChildOption[]; selectedChildren: string[] }) {
  const { busy, feedback, run } = useAdminAction()
  return <AdminEditorDialog title="الأسعار ومحتوى الحزمة" triggerLabel="الأسعار والمحتوى"><div className="space-y-5"><fieldset disabled={busy} className="space-y-5">
    <section className="space-y-3"><h3 className="text-sm font-bold text-deep-teal">متغيرات السعر</h3>{variants.map((variant) => <form key={variant.id} className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); await run(() => saveProductVariant(productId, variant.id, data), 'حُفظ المتغير.') }}><input name="name" defaultValue={variant.name} className={input} aria-label="اسم المتغير" /><input name="price" type="number" min="0" step="0.01" defaultValue={variant.price} className={input} aria-label="سعر المتغير" /><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-1 text-sm text-deep-teal"><input name="is_active" type="checkbox" defaultChecked={variant.isActive}/> نشط</label><Button type="submit" size="sm" disabled={busy}>حفظ</Button><Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={async () => { await run(() => deleteProductVariant(productId, variant.id), 'حُذف المتغير.') }}>حذف</Button></div></form>)}
      <form className="grid gap-3 sm:grid-cols-[1fr_7rem_auto]" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); if (await run(() => saveProductVariant(productId, null, data), 'أُضيف المتغير.')) form.reset() }}><input name="name" aria-label="اسم متغير السعر الجديد" placeholder="مثال: نسخة مطبوعة" className={input} required /><input name="price" type="number" min="0" step="0.01" aria-label="سعر المتغير الجديد" placeholder="السعر" className={input} required /><label className="sr-only"><input name="is_active" type="checkbox" defaultChecked /> نشط</label><Button type="submit" size="sm" disabled={busy}>إضافة</Button></form>
    </section>
    {productType === 'bundle' && <form className="space-y-3 border-t border-line pt-4" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); await run(() => saveBundleChildren(productId, data), 'حُفظ محتوى الحزمة.') }}><h3 className="text-sm font-bold text-deep-teal">المنتجات داخل الحزمة</h3><div className="grid max-h-52 gap-2 overflow-y-auto">{options.map((option) => <label key={option.id} className="flex items-center gap-2 rounded-lg bg-surface-raised px-3 py-2 text-base text-ink"><input type="checkbox" name="children" value={option.id} defaultChecked={selectedChildren.includes(option.id)} /> <span>{option.title}</span><span className="ms-auto text-text-soft">{option.type}</span></label>)}</div><Button type="submit" size="sm" disabled={busy}>حفظ تكوين الحزمة</Button></form>}
    </fieldset><ActionFeedback feedback={feedback} />
  </div></AdminEditorDialog>
}
