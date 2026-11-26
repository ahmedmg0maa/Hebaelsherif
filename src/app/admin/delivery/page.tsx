import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/auth/permissions'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { ProtectedCleanupControls } from '@/components/admin/ProtectedCleanupControls'
export const metadata: Metadata = { title: 'متابعة الملفات المحمية — الإدارة' }
const states: Record<string, string> = { all: 'الكل', pending: 'بانتظار التنظيف', running: 'محاولة جارية', removed: 'حُذف من التخزين', blocked: 'يتطلب مراجعة' }
const kinds: Record<string, string> = { book: 'ملف كتاب', 'lesson-video': 'فيديو درس', 'lesson-resource': 'مورد درس', 'workshop-resource': 'مورد ورشة', 'workshop-recording': 'تسجيل ورشة' }
const reasons: Record<string, string> = { unmanaged_path: 'ملف تاريخي غير مُدار؛ لا يُحذف تلقائيًا.', still_referenced: 'ما زال الملف مرتبطًا بمحتوى آخر.', provider_failed: 'تعذّر حذف الملف من التخزين؛ يمكن المحاولة بعد المهلة.' }
export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
 if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) return <EmptyState title="متابعة الملفات غير مهيّأة" description="تتطلب اتصالًا ببيئة البيانات." />
 if (!await requirePermission('learning.manage')) return <EmptyState title="لا توجد صلاحية" description="تتطلب إدارة ملفات التسليم." />
 const params = await searchParams
 const page = /^\d{1,5}$/.test(params.page ?? '') ? Math.max(1, Number(params.page)) : 1
 const status = Object.hasOwn(states, params.status ?? '') ? params.status! : 'all'
 let query = getServiceClient().from('protected_cleanup_jobs').select('id,upload_kind,entity_id,status,reason,attempts,not_before,created_at,completed_at', { count: 'exact' })
 if (status !== 'all') query = query.eq('status', status)
 const result = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * 30, page * 30 - 1)
 if (result.error || result.count === null) return <EmptyState title="تعذّر تحميل قائمة التنظيف" description="حدّثي الصفحة للمحاولة مجددًا؛ لم يُحذف أي ملف بسبب تعذّر القراءة." />
 return <div className="mx-auto max-w-5xl space-y-6">
  <header className="space-y-3"><h1 className="font-heading text-3xl text-deep-teal">متابعة الملفات المحمية</h1><p className="leading-8 text-text-soft">إزالة الملف من التسليم توقف وصول العميلات إليه فورًا. هذه القائمة تتابع حذف نسخته من التخزين بصورة مستقلة، وتحافظ على السجل الإداري.</p><p className="text-sm leading-7 text-text-soft">التنظيف يدوي من هذه الصفحة بعد مهلة أمان لا تقل عن ٢٤ ساعة من انتهاء تصريح الرفع. المحاولة الجارية تُحجز عشر دقائق. لا يبدأ حذف الملفات التاريخية غير المُدارة أو الملفات المرتبطة بمحتوى آخر.</p></header>
  <ProtectedCleanupControls />
  <nav aria-label="حالة تنظيف الملفات" className="flex flex-wrap gap-2">{Object.entries(states).map(([value, label]) => <Link key={value} aria-current={status === value ? 'page' : undefined} className={`rounded-full border border-line px-4 py-3 text-sm ${status === value ? 'bg-deep-teal text-ivory' : 'text-deep-teal'}`} href={`/admin/delivery?status=${value}`}>{label}</Link>)}</nav>
  <p className="text-sm text-text-soft">{result.count.toLocaleString('ar-EG')} مهمة — صفحة {page.toLocaleString('ar-EG')}</p>
  {result.data.length === 0 && <EmptyState title="لا توجد مهام بهذه الحالة" description="تظهر مهام التنظيف بعد إزالة ملف أو رفض رفعه أو تسوية تصريحه المنتهي." />}
  <div className="grid gap-4">{result.data.map(job => <Card key={job.id} className="space-y-3 p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold text-deep-teal">{kinds[job.upload_kind] ?? 'ملف محمي'}</h2><span className="text-sm">{states[job.status]}</span></div><p className="text-sm text-text-soft">{reasons[job.reason] ?? 'مهمة تنظيف مسجّلة بعد انتهاء استخدام الملف.'}</p><p className="text-xs leading-7 text-text-soft">المحاولات: {job.attempts} · موعد إتاحة المحاولة: {new Date(job.not_before).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}</p><p className="text-xs text-text-soft">مرجع المهمة: <span dir="ltr">{job.id}</span></p>{job.status !== 'removed' && job.reason !== 'unmanaged_path' && <ProtectedCleanupControls jobId={job.id} />}</Card>)}</div>
  <nav aria-label="صفحات التنظيف" className="flex gap-4">{page > 1 && <Link className="px-4 py-3 text-deep-teal" href={`/admin/delivery?status=${status}&page=${page - 1}`}>السابق</Link>}{page * 30 < result.count && <Link className="px-4 py-3 text-deep-teal" href={`/admin/delivery?status=${status}&page=${page + 1}`}>التالي</Link>}</nav>
 </div>
}
