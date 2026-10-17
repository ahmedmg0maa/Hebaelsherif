'use client'
import {AdminChoicePicker} from './AdminChoicePicker'
import {AdminTextarea} from './AdminField'
import {AdminField,AdminSelect} from './AdminField'

import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'

import { deletePressMention, savePressMention } from '@/lib/actions/press'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { MediaOption } from '@/lib/data/cms'
import { PRESS_CLASSIFICATIONS, PRESS_CLASSIFICATION_LABELS, PRESS_KINDS, PRESS_KIND_LABELS, PRESS_STATUSES, type PressClassification, type PressKind, type PressStatus } from '@/lib/press/governance'
import { PressCard } from '@/components/press/PressCard'

export type AdminPressRow = {
  id: string; outlet: string; title: string; kind: PressKind; source_classification: PressClassification
  original_url: string; published_on: string; excerpt: string; image_media_id: string | null
  status: PressStatus; publish_at: string | null; is_featured: boolean; sort: number; updated_at: string
  media_assets: { rights_status: string; rights_reference: string } | { rights_status: string; rights_reference: string }[] | null
  preview_image_url?: string | null
}

const statusLabels: Record<PressStatus, string> = { draft: 'مسودة', scheduled: 'مجدول', published: 'منشور', archived: 'مؤرشف' }

function PressFields({ row, media }: { row?: AdminPressRow; media: MediaOption[] }) {
  return <>
    {row && <input type="hidden" name="id" value={row.id} />}
    <div className="grid gap-3 md:grid-cols-2">
      <AdminField label="الجهة الأصلية" name="outlet" defaultValue={row?.outlet ?? ''} minLength={2} maxLength={160} required />
      <AdminField label="عنوان الظهور" name="title" defaultValue={row?.title ?? ''} minLength={4} maxLength={240} required />
      <AdminSelect label="النوع" name="kind" defaultValue={row?.kind ?? 'article'}>{PRESS_KINDS.map((kind) => <option key={kind} value={kind}>{PRESS_KIND_LABELS[kind]}</option>)}</AdminSelect>
      <AdminSelect label="تصنيف المصدر" name="source_classification" defaultValue={row?.source_classification ?? 'independent_editorial'}>{PRESS_CLASSIFICATIONS.map((kind) => <option key={kind} value={kind}>{PRESS_CLASSIFICATION_LABELS[kind]}</option>)}</AdminSelect>
      <AdminField className="grid gap-1 text-sm font-semibold text-deep-teal md:col-span-2" label="الرابط الأصلي HTTPS" name="original_url" type="url" pattern="https://.*" dir="ltr" defaultValue={row?.original_url ?? ''} required />
      <AdminField label="تاريخ الظهور" name="published_on" type="date" defaultValue={row?.published_on ?? ''} required />
      <AdminChoicePicker kind="media" name="image_media_id" label="صورة من المكتبة — اختياري" defaultValue={row?.image_media_id??''} initialLabel={media.find(asset=>asset.id===row?.image_media_id)?.title}/>
      <AdminTextarea className="grid gap-1 text-sm font-semibold text-deep-teal md:col-span-2" label="مقتطف محدود — لا تنسخي مقالًا كاملًا" name="excerpt" rows={4} maxLength={500} defaultValue={row?.excerpt ?? ''} />
      <AdminSelect label="الحالة" name="status" defaultValue={row?.status ?? 'draft'}>{PRESS_STATUSES.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</AdminSelect>
      <AdminField label="موعد النشر بتوقيت القاهرة" name="publish_at" type="datetime-local" defaultValue={(row?.publish_at ? formatCairoLocalDateTime(row.publish_at) : '') ?? ''} />
      <AdminField label="الترتيب" name="sort" type="number" min={0} max={10000} defaultValue={row?.sort ?? 100} />
      <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-deep-teal"><input name="is_featured" type="checkbox" defaultChecked={row?.is_featured ?? false} />مميّز في الأسطح المختارة</label>
    </div>
  </>
}

function PressEditor({ row, media }: { row?: AdminPressRow; media: MediaOption[] }) {
  const { busy, feedback, run } = useAdminAction()
  const form = <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget, data = new FormData(form); if (await run(() => savePressMention(data), 'حُفظ السجل وسجل التدقيق.')) { if (!row) form.reset() } }}>
    <fieldset disabled={busy}><PressFields row={row} media={media} /></fieldset>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit" size="sm" disabled={busy}>{row ? 'حفظ التعديلات' : 'إنشاء مسودة'}</Button>
      {row && <Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={async () => { if (window.confirm('هل تريدين حذف هذا الظهور؟')) await run(() => deletePressMention(row.id), 'حُذف السجل.') }}>حذف آمن</Button>}
      <ActionFeedback feedback={feedback} />
    </div>
  </form>
  if (!row) return <section className="rounded-2xl border border-line bg-surface-raised p-5"><h2 className="mb-4 text-xl font-bold text-deep-teal">إضافة ظهور موثّق</h2>{form}</section>
  const rights = Array.isArray(row.media_assets) ? row.media_assets[0] : row.media_assets
  return <details className="rounded-2xl border border-line bg-surface-raised p-5"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-deep-teal">{row.title}</h2><p className="mt-1 text-sm text-text-soft">{row.outlet} · {PRESS_KIND_LABELS[row.kind]}</p></div><div className="flex gap-2"><Badge tone={row.status === 'published' ? 'success' : row.status === 'scheduled' ? 'pending' : 'sand'}>{statusLabels[row.status]}</Badge>{row.image_media_id && <Badge tone={rights?.rights_status && rights.rights_status !== 'unverified' && rights.rights_reference ? 'teal' : 'danger'}>{rights?.rights_status && rights.rights_status !== 'unverified' && rights.rights_reference ? 'حقوق الصورة موثقة' : 'حقوق الصورة ناقصة'}</Badge>}</div></div></summary><div className="mt-5 space-y-5 border-t border-line pt-5">{form}<details className="rounded-xl border border-dashed border-antique-gold/50 p-4"><summary className="cursor-pointer text-sm font-bold text-deep-teal">معاينة البطاقة العامة المحفوظة</summary><div className="mt-4"><PressCard preview mention={{ id: row.id, outlet: row.outlet, title: row.title, kind: row.kind, sourceClassification: row.source_classification, originalUrl: row.original_url, publishedOn: row.published_on, excerpt: row.excerpt, isFeatured: row.is_featured, imageUrl: row.preview_image_url ?? null, imageAlt: `صورة ظهور لدى ${row.outlet}`, imageCaption: '', imageCredit: '' }} /></div></details></div></details>
}

export function PressManager({ rows, media }: { rows: AdminPressRow[]; media: MediaOption[] }) {
  return <div className="space-y-5"><PressEditor media={media} />{rows.map((row) => <PressEditor key={row.id} row={row} media={media} />)}</div>
}
