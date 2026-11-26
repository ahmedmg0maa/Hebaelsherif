import { adminContentPage,type CatalogQuery } from '@/lib/data/admin-catalog'
import { CatalogListTools,CatalogPagination } from '@/components/admin/CatalogListTools'
import type { Metadata } from 'next'
import { getPublicMediaOptions } from '@/lib/data/cms'
import { Card, CardTitle } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArticleForm } from '@/components/admin/AdminControls'
import { ArticleEditor } from '@/components/admin/ArticleEditor'
import { PreviewButton } from '@/components/admin/PreviewButton'
import { ArticleScheduleControl } from '@/components/admin/ArticleScheduleControl'

export const metadata: Metadata = { title: 'المقالات — الإدارة' }

type Row = { id: string; title: string; slug: string; excerpt: string; content: string; cover_url: string | null; seo_title: string | null; seo_description: string | null; is_published: boolean; published_at: string | null; status:string;publish_at:string|null; created_at: string }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo' })

export default async function AdminArticlesPage({searchParams}:{searchParams:Promise<CatalogQuery>}) {
  const media = await getPublicMediaOptions()
  const listing = await adminContentPage<Row>('articles', 'id, title, slug, excerpt, content, cover_url, seo_title, seo_description, is_published, published_at, status, publish_at, created_at', await searchParams)
  const articles=listing.rows

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="font-heading text-4xl font-bold text-deep-teal">المقالات</h1>
        <p className="mt-1 text-text-soft">اكتبي كمسودة ثم انشري حين تجهز — المنشور يظهر فورًا في المدونة.</p>
      </header>

      <Card className="p-8">
        <CardTitle className="mb-6">مقال جديد</CardTitle>
        <ArticleForm />
      </Card>

      <CatalogListTools {...listing} scheduled/>
      {articles.length === 0 ? (
        <EmptyState title="لا مقالات بعد" description="أول مقالاتك يبدأ من النموذج أعلاه." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>المقال</TH>
              <TH>أُنشئ</TH>
              <TH>الحالة</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {articles.map((a) => (
              <TR key={a.id}>
                <TD>
                  <p className="font-semibold text-deep-teal">{a.title}</p>
                  <p className="text-xs text-taupe" dir="ltr">/articles/{a.slug}</p>
                </TD>
                <TD>{dateFmt.format(new Date(a.created_at))}</TD>
                <TD>
                  <Badge tone={a.is_published ? 'success' : 'sand'}>{{ draft: 'مسودة', scheduled: 'مجدول', published: 'منشور', archived: 'مؤرشف' }[a.status] ?? 'حالة غير معروفة'}</Badge>
                </TD>
                <TD>
                  <div className="flex flex-wrap items-start gap-3"><PreviewButton type="article" id={a.id}/><ArticleScheduleControl id={a.id} status={a.status} publishAt={a.publish_at}/><ArticleEditor media={media} article={{ id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt, content: a.content, coverUrl: a.cover_url, seoTitle: a.seo_title, seoDescription: a.seo_description }} /></div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <CatalogPagination {...listing}/>
    </div>
  )
}
