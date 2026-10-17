import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/permissions'
import { getPublicMediaOptions } from '@/lib/data/cms'
import { adminPagedList,type AdminPageQuery } from '@/lib/data/admin-pagination'
import { AdminListTools } from '@/components/admin/AdminListTools'
import { PressManager, type AdminPressRow } from '@/components/admin/PressManager'

export const metadata: Metadata = { title: 'الظهور الإعلامي — الإدارة' }

export default async function AdminPressPage({searchParams}:{searchParams:Promise<AdminPageQuery>}) {
  const query=await searchParams
  await requirePermission('press.manage', { redirectOnFailure: true })
  const [result, media] = await Promise.all([
    adminPagedList<AdminPressRow>('press_mentions', 'id, outlet, title, kind, source_classification, original_url, published_on, excerpt, image_media_id, status, publish_at, is_featured, sort, updated_at, media_assets(rights_status, rights_reference)',query, {searchColumn:'title',statuses:['draft','scheduled','published','archived'],orderBy: 'updated_at' }),
    getPublicMediaOptions(),
  ])
  const rows = result.rows.map((row) => ({ ...row, preview_image_url: media.find((item) => item.id === row.image_media_id)?.url ?? null }))
  return <div className="mx-auto max-w-5xl space-y-7"><header><p className="text-sm font-bold text-antique-gold">مصادر وحقوق قبل النشر</p><h1 className="mt-1 text-3xl font-bold text-deep-teal">الظهور الإعلامي</h1><p className="mt-2 max-w-3xl leading-loose text-text-soft">سجّلي الرابط الأصلي والتصنيف الحقيقي. القناة المملوكة أو الشراكة لا تظهر كصحافة مستقلة، والصورة لا تُنشر دون حقوق موثقة في مكتبة الوسائط.</p></header><AdminListTools result={result} query={query} label="الظهور الإعلامي" statuses={[{value:"draft",label:"مسودة"},{value:"scheduled",label:"مجدول"},{value:"published",label:"منشور"},{value:"archived",label:"مؤرشف"}]}/><PressManager rows={rows} media={media} /></div>
}
