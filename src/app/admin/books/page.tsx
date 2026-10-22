import type { Metadata } from 'next'
import { adminCatalogPage,type CatalogQuery } from '@/lib/data/admin-catalog'
import { CatalogListTools,CatalogPagination } from '@/components/admin/CatalogListTools'
import { AdminEditorDialog } from '@/components/admin/AdminEditorDialog'
import { getPublicMediaOptions } from '@/lib/data/cms'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PublishToggle } from '@/components/admin/AdminControls'
import { CatalogCreatePanel, CatalogEditPanel } from '@/components/admin/CatalogManager'
import { ProtectedDeliveryUpload } from '@/components/admin/ProtectedDeliveryUpload'
import { ProtectedDeliveryItems } from '@/components/admin/ProtectedDeliveryItems'

export const metadata: Metadata = { title: 'الكتب — الإدارة' }

type Row = {
  id: string
  title: string
  slug: string
  pages_count: number | null
  is_published: boolean
  book_files: { id: string; format: string; size_bytes: number | null; created_at: string; archived_at: string | null }[]
  book_access: { id: string }[]
  description: string
  author: string
  cover_url: string | null
  products: { archived_at: string | null; price: number; compare_at_price: number | null; currency: string; subtitle: string | null; sort: number } | { archived_at: string | null; price: number; compare_at_price: number | null; currency: string; subtitle: string | null; sort: number }[]
}

export default async function AdminBooksPage({searchParams}:{searchParams:Promise<CatalogQuery>}) {
  const media = await getPublicMediaOptions()
  const listing=await adminCatalogPage<Row>('books', 'id, title, slug, description, author, pages_count, cover_url, is_published, products!inner(archived_at,price, compare_at_price, currency, subtitle, sort), book_files(id,format,size_bytes,created_at,archived_at), book_access(id)',await searchParams)
  const books=listing.rows

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">الكتب</h1>
        <p className="mt-1 text-text-soft">إصدارات المكتبة الرقمية وملفاتها وعدد مالكاتها.</p>
      </header>

      <CatalogCreatePanel kind="book" media={media} />

      <CatalogListTools {...listing}/>
      {books.length === 0 ? (
        <EmptyState title="لا كتب بعد" description="أضيفي كتابًا من النموذج أعلاه، أو عدّلي البحث والتصفية." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>الكتاب</TH>
              <TH>الصفحات</TH>
              <TH>الملفات</TH>
              <TH>المالكات</TH>
              <TH>الحالة</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {books.map((b) => (
              <TR key={b.id}>
                <TD>
                  <p className="font-semibold text-deep-teal">{b.title}</p>
                  <p className="text-xs text-taupe" dir="ltr">/{b.slug}</p>
                </TD>
                <TD>{b.pages_count ? b.pages_count.toLocaleString('ar-EG') : '—'}</TD>
                <TD>{(b.book_files ?? []).filter((file) => !file.archived_at).length.toLocaleString('ar-EG')}</TD>
                <TD>{(b.book_access ?? []).length.toLocaleString('ar-EG')}</TD>
                <TD>
                  <Badge tone={(Array.isArray(b.products)?b.products[0]:b.products)?.archived_at?'sand':b.is_published ? 'success' : 'sand'}>{(Array.isArray(b.products)?b.products[0]:b.products)?.archived_at?'مؤرشف':b.is_published?'منشور':'مسودة'}</Badge>
                </TD>
                <TD>
                  <div className="flex flex-wrap items-start gap-2">
                    {!(Array.isArray(b.products)?b.products[0]:b.products)?.archived_at&&<PublishToggle table="books" id={b.id} published={b.is_published}/>}
                    <CatalogEditPanel kind="book" media={media} item={(() => {
                      const product = Array.isArray(b.products) ? b.products[0] : b.products
                      return {
                        id: b.id, title: b.title, slug: b.slug, description: b.description,
                        author: b.author, pagesCount: b.pages_count, coverUrl: b.cover_url,
                        price: Number(product?.price ?? 0), compareAtPrice: product?.compare_at_price,
                        currency: product?.currency, subtitle: product?.subtitle, sort: product?.sort,
                        isPublished: b.is_published, archivedAt: product?.archived_at,
                      }
                    })()} />
                  </div>
                  <AdminEditorDialog title={`ملفات وتسليم: ${b.title}`} triggerLabel="الملفات والتسليم">
                  <div className="mt-3 min-w-0"><ProtectedDeliveryUpload kind="book" entityId={b.id} label="رفع إصدار PDF أو EPUB" /></div>
                  <div className="mt-2 min-w-0">
                    <ProtectedDeliveryItems
                      kind="book"
                      entityId={b.id}
                      items={(b.book_files ?? []).filter((file) => !file.archived_at).map((file) => ({
                        id: file.id,
                        title: `إصدار ${file.format.toUpperCase()}`,
                        detail: file.size_bytes ? `${(file.size_bytes / 1024 / 1024).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} م.ب` : undefined,
                      }))}
                    />
                  </div>
                  </AdminEditorDialog>
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
