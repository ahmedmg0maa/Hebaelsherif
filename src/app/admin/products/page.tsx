import type { Metadata } from 'next'
import { getPublicMediaOptions } from '@/lib/data/cms'
import { adminPagedList,adminRelatedRows,type AdminPageQuery } from '@/lib/data/admin-pagination'
import { AdminListTools } from '@/components/admin/AdminListTools'
import { formatPrice } from '@/lib/format'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ProductComposition, ProductCreatePanel, ProductEditPanel, ProgramPublishControl } from '@/components/admin/ProductManager'

export const metadata: Metadata = { title: 'المنتجات — الإدارة' }

type Row = { id: string; title: string; type: string; slug: string; subtitle: string | null; description: string; price: number; compare_at_price: number | null; currency: string; cover_url: string | null; archived_at:string|null; is_published: boolean; sort: number }
type VariantRow = { id: string; product_id: string; name: string; price: number; is_active: boolean }
type BundleRow = { bundle_product_id: string; child_product_id: string }

const typeLabels: Record<string, string> = {
  course: 'دورة',
  book: 'كتاب',
  workshop: 'ورشة',
  session: 'جلسة',
  bundle: 'حزمة',
  vip: 'VIP',
  free_resource: 'مورد مجاني',
}
const programTypes = new Set(['bundle', 'vip', 'free_resource'])
const specialistRoutes: Record<string, string> = { course: '/admin/courses', book: '/admin/books', workshop: '/admin/workshops', session: '/admin/services' }

export default async function AdminProductsPage({searchParams}:{searchParams:Promise<AdminPageQuery>}) {
  const query=await searchParams
  const media = await getPublicMediaOptions()
  const result=await adminPagedList<Row>('products','id,title,type,slug,subtitle,description,price,compare_at_price,currency,cover_url,archived_at,is_published,sort',query,{searchColumn:'title',orderBy:'sort',ascending:true,statusFilters:{published:{column:'is_published',value:true},draft:{column:'is_published',value:false},archived:{column:'archived_at',value:null,not:true}}})
  const products=result.rows,ids=products.map(product=>product.id)
  const [variants,bundleRows]=await Promise.all([
    adminRelatedRows<VariantRow>('product_variants','id,product_id,name,price,is_active','product_id',ids),
    adminRelatedRows<BundleRow>('product_bundles','id,bundle_product_id,child_product_id','bundle_product_id',ids),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">المنتجات</h1>
        <p className="mt-1 text-text-soft">الحزم وVIP والموارد المجانية تُدار هنا وتظهر في «البرامج» فقط بعد فحص التكوين والتسليم. العناصر المتخصصة تُنشر من شاشتها الأصلية.</p>
      </header>

      <ProductCreatePanel media={media} />
      <AdminListTools result={result} query={query} label="المنتجات" statuses={[{value:"published",label:"منشور"},{value:"draft",label:"غير منشور"},{value:"archived",label:"مؤرشف"}]}/>

      {products.length === 0 ? (
        <EmptyState
          title="لا منتجات بعد"
          description="أضيفي الحزمة أو البرنامج من النموذج أعلاه، والدورات والكتب من أقسامها."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>المنتج</TH>
              <TH>النوع</TH>
              <TH>السعر</TH>
              <TH>الحالة</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {products.map((p) => (
              <TR key={p.id}>
                <TD>
                  <p className="font-semibold text-deep-teal">{p.title}</p>
                  <p className="text-xs text-taupe" dir="ltr">/{p.slug}</p>
                </TD>
                <TD>{typeLabels[p.type] ?? p.type}</TD>
                <TD className="font-bold">{formatPrice(Number(p.price),p.currency)}</TD>
                <TD>
                  <Badge tone={p.is_published ? 'success' : 'sand'}>{p.archived_at?'مؤرشف':p.is_published?'منشور':'مسودة'}</Badge>
                </TD>
                <TD>
                  {programTypes.has(p.type) ? <div className="flex flex-wrap items-start gap-2"><ProgramPublishControl productId={p.id} published={p.is_published} /><ProductEditPanel media={media} item={{ id:p.id,type:p.type,title:p.title,slug:p.slug,subtitle:p.subtitle,description:p.description,price:Number(p.price),compareAtPrice:p.compare_at_price,currency:p.currency,coverUrl:p.cover_url,isPublished:p.is_published,sort:p.sort }}/><ProductComposition productId={p.id} productType={p.type} variants={variants.filter((variant) => variant.product_id === p.id).map((variant) => ({ id: variant.id, name: variant.name, price: Number(variant.price), isActive: variant.is_active }))} selectedChildren={bundleRows.filter((row) => row.bundle_product_id === p.id).map((row) => row.child_product_id)} /></div> : <Button href={specialistRoutes[p.type] ?? '/admin/overview'} size="sm" variant="secondary">إدارة ونشر من المصدر</Button>}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
