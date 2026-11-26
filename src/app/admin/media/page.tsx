import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/EmptyState'
import { MediaLifecycle, MediaMetadata, MediaUpload, CopyMediaUrl } from '@/components/admin/MediaManager'
import { requirePermission } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'مكتبة الوسائط — الإدارة' }
const PAGE_SIZE = 24
const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })

type Row = { id: string; bucket: string; path: string; title: string; alt: string; tags: string[]; kind: string; mime_type: string | null; visibility: string; size_bytes: number | null; created_at: string; caption: string; credit: string; rights_status: string; rights_reference: string; folder: string; focal_x: number; focal_y: number; processing_status: string; archived_at: string | null; replaced_by: string | null; media_usages: { id: string }[] }
type ReplacementRow = { id: string; title: string; bucket: string; kind: string; visibility: string }
type Props = { searchParams: Promise<{ q?: string; bucket?: string; kind?: string; lifecycle?: string; page?: string }> }

function fmtSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes > 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} م.ب`
  return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`
}

export default async function AdminMediaPage({ searchParams }: Props) {
  await requirePermission('media.view', { redirectOnFailure: true })
  const params = await searchParams
  const q = (params.q ?? '').trim().replace(/[%_,.()]/g, ' ').slice(0, 80)
  const bucket = params.bucket ?? ''
  const kind = params.kind ?? ''
  const lifecycle = ['active', 'archived', 'all'].includes(params.lifecycle ?? '') ? params.lifecycle! : 'active'
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const supabase = await getServerClient()
  let query = supabase.from('media_assets').select('id, bucket, path, title, alt, tags, kind, mime_type, visibility, size_bytes, created_at, caption, credit, rights_status, rights_reference, folder, focal_x, focal_y, processing_status, archived_at, replaced_by, media_usages(id)', { count: 'exact' })
  if (q) query = query.or(`title.ilike.%${q}%,alt.ilike.%${q}%,path.ilike.%${q}%`)
  if (bucket) query = query.eq('bucket', bucket)
  if (kind) query = query.eq('kind', kind)
  if (lifecycle === 'active') query = query.is('archived_at', null)
  if (lifecycle === 'archived') query = query.not('archived_at', 'is', null)
  const { data, count, error } = await query.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  const { data: replacementData, error: replacementError } = await supabase.from('media_assets').select('id, title, bucket, kind, visibility').is('archived_at', null).order('title').limit(200)
  if (error || replacementError) throw new Error('ADMIN_MEDIA_READ_UNAVAILABLE')
  const assets = (data ?? []) as Row[]
  const replacementAssets = (replacementData ?? []) as ReplacementRow[]
  const total = count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const href = (nextPage: number) => `/admin/media?${new URLSearchParams({ ...(q ? { q } : {}), ...(bucket ? { bucket } : {}), ...(kind ? { kind } : {}), lifecycle, page: String(nextPage) })}`

  return <div className="mx-auto max-w-6xl space-y-8">
    <header><h1 className="text-3xl font-bold text-deep-teal">مكتبة الوسائط</h1><p className="mt-1 text-text-soft">رفع وفهرسة واختيار آمن، مع أرشفة قابلة للاستعادة واستبدال ينقل الاستخدامات ذريًا من دون حذف ملف التخزين.</p></header>
    <MediaUpload />
    <form method="get" className="grid gap-3 rounded-2xl border border-line bg-surface-raised p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]">
      <input name="q" defaultValue={q} placeholder="ابحثي بالاسم أو الوصف أو المسار" className="min-h-11 rounded-xl border border-line bg-ivory px-4 text-sm text-ink" />
      <select name="bucket" defaultValue={bucket} className="min-h-11 rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink"><option value="">كل المخازن</option><option value="public-media">عام</option><option value="course-videos">فيديو الدورات</option><option value="course-resources">موارد الدورات</option><option value="protected-books">كتب محمية</option><option value="workshop-recordings">تسجيلات الورش</option></select>
      <select name="kind" defaultValue={kind} className="min-h-11 rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink"><option value="">كل الأنواع</option><option value="image">صور</option><option value="video">فيديو</option><option value="audio">صوت</option><option value="document">مستندات</option></select>
      <select name="lifecycle" defaultValue={lifecycle} className="min-h-11 rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink"><option value="active">النشطة</option><option value="archived">الأرشيف</option><option value="all">الكل</option></select>
      <button className="min-h-11 rounded-xl bg-deep-teal px-5 text-sm font-bold text-white">تطبيق</button>
    </form>
    <div className="flex items-center justify-between text-sm text-text-soft"><span>{total.toLocaleString('ar-EG')} أصل · صفحة {page.toLocaleString('ar-EG')} من {pages.toLocaleString('ar-EG')}</span>{(q || bucket || kind || lifecycle !== 'active') && <Link href="/admin/media" className="font-bold text-deep-teal">مسح الفلاتر</Link>}</div>
    {assets.length === 0 ? <EmptyState title="لا وسائط مطابقة" description="ارفعي أصلًا جديدًا أو غيّري البحث والفلاتر." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{assets.map((asset) => {
      const publicUrl = !asset.archived_at && asset.visibility === 'public' ? supabase.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl : null
      const usageCount = asset.media_usages?.length ?? 0
      const replacements = replacementAssets.filter((candidate) => candidate.id !== asset.id && candidate.bucket === asset.bucket && candidate.kind === asset.kind && candidate.visibility === asset.visibility).map(({ id, title }) => ({ id, title }))
      return <article key={asset.id} className="overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-card">
        <div className="flex aspect-[4/3] items-center justify-center bg-sand/15 bg-cover" role={asset.kind === 'image' && publicUrl ? 'img' : undefined} aria-label={asset.alt || asset.title} style={{ backgroundImage: asset.kind === 'image' && publicUrl ? `url(${publicUrl})` : undefined, backgroundPosition: `${asset.focal_x}% ${asset.focal_y}%` }}><span className="rounded-full bg-deep-teal/85 px-3 py-1 text-xs font-bold text-white">{asset.kind}</span></div>
        <div className="space-y-3 p-4"><div><h2 className="truncate font-bold text-deep-teal">{asset.title}</h2><p className="truncate text-xs text-text-soft" dir="ltr">{asset.path}</p></div>
          <div className="flex flex-wrap gap-1">{asset.archived_at && <span className="rounded-full bg-burgundy/10 px-2 py-1 text-[11px] font-bold text-burgundy">مؤرشف</span>}{asset.tags.map((tag) => <span key={tag} className="rounded-full bg-aqua/10 px-2 py-1 text-[11px] text-deep-teal">{tag}</span>)}</div>
          <dl className="grid grid-cols-2 gap-1 text-xs text-text-soft"><div><dt className="sr-only">الحجم</dt><dd>{fmtSize(asset.size_bytes)}</dd></div><div><dt className="sr-only">التاريخ</dt><dd>{dateFmt.format(new Date(asset.created_at))}</dd></div><div><dt className="sr-only">الظهور</dt><dd>{asset.visibility === 'public' ? 'عام' : 'خاص'}</dd></div><div><dt className="sr-only">الاستخدام</dt><dd>{usageCount.toLocaleString('ar-EG')} استخدام</dd></div><div><dt className="sr-only">المجلد</dt><dd dir="ltr">{asset.folder}</dd></div><div><dt className="sr-only">الحقوق</dt><dd>{asset.rights_status === 'unverified' ? 'حقوق غير موثقة' : 'حقوق موثقة'}</dd></div></dl>
          {!asset.archived_at && <MediaMetadata id={asset.id} title={asset.title} alt={asset.alt} tags={asset.tags} caption={asset.caption} credit={asset.credit} rightsStatus={asset.rights_status} rightsReference={asset.rights_reference} folder={asset.folder} focalX={asset.focal_x} focalY={asset.focal_y} />}
          <div className="space-y-2">{publicUrl && <CopyMediaUrl url={publicUrl} />}<MediaLifecycle id={asset.id} archivedAt={asset.archived_at} replacedBy={asset.replaced_by} usageCount={usageCount} replacements={replacements} /></div>
        </div>
      </article>
    })}</div>}
    {pages > 1 && <nav aria-label="صفحات مكتبة الوسائط" className="flex justify-between">{page > 1 ? <Link className="rounded-xl border border-line px-4 py-2" href={href(page - 1)}>السابق</Link> : <span />}{page < pages && <Link className="rounded-xl border border-line px-4 py-2" href={href(page + 1)}>التالي</Link>}</nav>}
  </div>
}
