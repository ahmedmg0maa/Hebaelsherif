import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/auth/permissions'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Stars } from '@/components/catalog/Stars'
import { ReviewControls } from '@/components/admin/AdminControls'

export const metadata: Metadata = { title: 'التقييمات — الإدارة' }

type Row = {
  id: string
  version: number
  display_name: string | null
  rating: number
  comment: string
  is_approved: boolean
  is_featured: boolean
  created_at: string
  verified_purchase:boolean
  status: 'pending' | 'approved' | 'rejected' | 'archived'
  moderation_reason: string | null
  owner_response: string | null
  owner_response_published: boolean
  display_name_consent: boolean
  publication_consent_at: string | null
  source_type: 'purchase' | 'booking'
  source_reference_id: string | null
  verified_at: string | null
  products: { title: string } | { title: string }[] | null
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) return <EmptyState title="إدارة التقييمات غير مهيّأة" description="تتطلب اتصالًا ببيئة البيانات." />
  if (!await requirePermission('reviews.manage')) return <EmptyState title="لا توجد صلاحية" description="إدارة التقييمات تتطلب الصلاحية المناسبة." />
  const params = await searchParams
  const statuses = ['all', 'pending', 'approved', 'rejected', 'archived']
  const status = statuses.includes(params.status ?? '') ? params.status! : 'all'
  const page = /^\d{1,5}$/.test(params.page ?? '') ? Math.max(1, Number(params.page)) : 1
  let query = getServiceClient().from('reviews').select('id, version, display_name, display_name_consent, rating, comment, is_approved, is_featured, verified_purchase, verified_at, publication_consent_at, source_type, source_reference_id, status, moderation_reason, owner_response, owner_response_published, created_at, products(title)', { count: 'exact' })
  if (status !== 'all') query = query.eq('status', status)
  const result = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * 30, page * 30 - 1)
  if (result.error || result.count === null) return <EmptyState title="تعذّر تحميل التقييمات" description="حدّثي الصفحة للمحاولة مرة أخرى؛ لم تُعرض نتيجة فارغة بدل الخطأ." />
  const reviews = result.data as Row[]
  const labels: Record<string, string> = { all: 'الكل', pending: 'بانتظار المراجعة', approved: 'معتمد', rejected: 'مرفوض', archived: 'مؤرشف' }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">التقييمات</h1>
        <p className="mt-1 text-text-soft">لا يمكن اعتماد أو تمييز تجربة قبل إثبات الشراء وتسجيل موافقة النشر؛ كل قرار يُحفظ مع سجل تدقيق ذري.</p>
      </header>

      <nav aria-label="حالة التقييمات" className="flex flex-wrap gap-2">{statuses.map(value => <Link key={value} href={`/admin/reviews?status=${value}`} aria-current={status === value ? 'page' : undefined} className={`rounded-full border border-line px-4 py-3 text-sm ${status === value ? 'bg-deep-teal text-ivory' : 'text-deep-teal'}`}>{labels[value]}</Link>)}</nav>
      <p className="text-sm text-text-soft">{result.count.toLocaleString('ar-EG')} تقييم — صفحة {page.toLocaleString('ar-EG')}</p>
      {reviews.length === 0 ? (
        <EmptyState title="لا تقييمات بعد" description="تظهر تقييمات العميلات هنا فور إرسالها لاعتمادها أو حذفها." />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const product = Array.isArray(r.products) ? r.products[0] : r.products
            return (
              <Card key={r.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-deep-teal">{r.display_name ?? 'عميلة'}</span>
                    <Stars rating={r.rating} />
                    {r.status === 'approved' ? <Badge tone="success">معتمد</Badge> : r.status === 'rejected' ? <Badge tone="danger">مرفوض</Badge> : r.status === 'archived' ? <Badge tone="sand">مؤرشف</Badge> : <Badge tone="pending">بانتظار المراجعة</Badge>}
                    {r.is_featured && <Badge tone="gold">مميّز</Badge>}
                    {r.verified_purchase && <Badge tone="teal">شراء موثّق</Badge>}
                    {r.verified_at && <Badge tone="success">التحقق مسجل</Badge>}
                    {r.publication_consent_at ? <Badge tone="gold">وافقت على النشر</Badge> : <Badge tone="danger">لا توجد موافقة نشر</Badge>}
                  </div>
                  {product && <span className="text-xs text-taupe">{product.title}</span>}
                </div>
                <p className="leading-relaxed text-ink">{r.comment}</p>
                <dl className="grid gap-2 rounded-lg border border-line bg-surface-raised/60 p-3 text-xs sm:grid-cols-3">
                  <div><dt className="text-text-soft">المصدر</dt><dd className="mt-1 font-semibold text-deep-teal">{r.source_type === 'booking' ? 'حجز' : 'شراء'}</dd></div>
                  <div><dt className="text-text-soft">اسم العرض</dt><dd className="mt-1 font-semibold text-deep-teal">{r.display_name_consent ? (r.display_name ?? 'لم يتوفر اسم أول') : 'مجهول باختيار العميلة'}</dd></div>
                  <div><dt className="text-text-soft">مرجع داخلي</dt><dd className="mt-1 font-mono text-deep-teal">{r.source_reference_id ? `${r.source_reference_id.slice(0, 8)}…` : 'غير متوفر'}</dd></div>
                </dl>
                {r.moderation_reason && <p className="rounded-lg bg-sand/30 p-2 text-xs text-text-soft">سبب داخلي: {r.moderation_reason}</p>}
                {r.owner_response && <p className="rounded-lg bg-ivory/60 p-2 text-sm text-text-soft">رد المالكة: {r.owner_response}{r.owner_response_published ? ' (منشور)' : ' (داخلي)'}</p>}
                <ReviewControls version={r.version} ownerResponse={r.owner_response} responsePublished={r.owner_response_published} moderationReason={r.moderation_reason} id={r.id} approved={r.is_approved} featured={r.is_featured} status={r.status} />
              </Card>
            )
          })}
        </div>
      )}
      <nav aria-label="صفحات التقييمات" className="flex gap-4">{page > 1 && <Link className="px-4 py-3 text-deep-teal" href={`/admin/reviews?status=${status}&page=${page - 1}`}>السابق</Link>}{page * 30 < result.count && <Link className="px-4 py-3 text-deep-teal" href={`/admin/reviews?status=${status}&page=${page + 1}`}>التالي</Link>}</nav>
    </div>
  )
}
