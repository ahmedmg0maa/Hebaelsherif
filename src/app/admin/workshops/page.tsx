import {adminRelatedRows} from '@/lib/data/admin-pagination'
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
import { WorkshopRegistrationControl } from '@/components/admin/WorkshopRegistrationControl'
import { ProtectedDeliveryItems } from '@/components/admin/ProtectedDeliveryItems'

export const metadata: Metadata = { title: 'ورش العمل — الإدارة' }

type Row = {
  id: string
  title: string
  starts_at: string
  seats_total: number
  seats_reserved: number
  is_published: boolean
  workshop_registrations: { id: string; user_id: string; status: string; workshop_attendance: { minutes: number }[] }[]
  slug: string
  description: string
  ends_at: string
  location_kind: string
  location_text: string | null
  meeting_url: string | null
  workshop_delivery: { meeting_url: string | null }[]
  workshop_resources: { id: string; title: string; kind: string; archived_at: string | null }[]
  workshop_recordings: { id: string; title: string; published_at: string | null; archived_at: string | null }[]
  cover_url: string | null
  products: { archived_at: string | null; price: number; compare_at_price: number | null; currency: string; subtitle: string | null; sort: number } | { archived_at: string | null; price: number; compare_at_price: number | null; currency: string; subtitle: string | null; sort: number }[]
}

const dateFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })

export default async function AdminWorkshopsPage({searchParams}:{searchParams:Promise<CatalogQuery>}) {
  const media = await getPublicMediaOptions()
  const listing=await adminCatalogPage<Row>(
    'workshops',
    'id, title, slug, description, starts_at, ends_at, seats_total, seats_reserved, location_kind, location_text, meeting_url, workshop_delivery(meeting_url), workshop_resources(id,title,kind,archived_at), workshop_recordings(id,title,published_at,archived_at), cover_url, is_published, products!inner(archived_at,price, compare_at_price, currency, subtitle, sort), workshop_registrations(id,user_id,status,workshop_attendance(minutes))',
    await searchParams,
  )
  const workshops=listing.rows
  const profileRows=await adminRelatedRows<{id:string;full_name:string;email:string}>('profiles','id,full_name,email','id',[...new Set(workshops.flatMap(workshop=>workshop.workshop_registrations.map(row=>row.user_id)))])
  const profiles=new Map(profileRows.map(profile=>[profile.id,profile]))

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">ورش العمل</h1>
        <p className="mt-1 text-text-soft">الجدول والمقاعد والتسجيلات.</p>
      </header>

      <CatalogCreatePanel kind="workshop" media={media} />

      <CatalogListTools {...listing}/>
      {workshops.length === 0 ? (
        <EmptyState title="لا ورش بعد" description="أضيفي ورشة من النموذج أعلاه، أو عدّلي البحث والتصفية." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>الورشة</TH>
              <TH>الموعد</TH>
              <TH>المقاعد</TH>
              <TH>التسجيلات</TH>
              <TH>الحالة</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {workshops.map((w) => (
              <TR key={w.id}>
                <TD className="font-semibold text-deep-teal">{w.title}</TD>
                <TD>{dateFmt.format(new Date(w.starts_at))}</TD>
                <TD>
                  {w.seats_reserved.toLocaleString('ar-EG')} / {w.seats_total.toLocaleString('ar-EG')}
                </TD>
                <TD>{(w.workshop_registrations ?? []).length.toLocaleString('ar-EG')}</TD>
                <TD>
                  <Badge tone={(Array.isArray(w.products)?w.products[0]:w.products)?.archived_at?'sand':w.is_published ? 'success' : 'sand'}>{(Array.isArray(w.products)?w.products[0]:w.products)?.archived_at?'مؤرشف':w.is_published?'منشورة':'مسودة'}</Badge>
                </TD>
                <TD>
                  <div className="flex flex-wrap items-start gap-2">
                    {!(Array.isArray(w.products)?w.products[0]:w.products)?.archived_at&&<PublishToggle table="workshops" id={w.id} published={w.is_published}/>}
                    <CatalogEditPanel kind="workshop" media={media} item={(() => {
                      const product = Array.isArray(w.products) ? w.products[0] : w.products
                      return {
                        id: w.id, title: w.title, slug: w.slug, description: w.description,
                        startsAt: w.starts_at, endsAt: w.ends_at, seatsTotal: w.seats_total,
                        locationKind: w.location_kind, locationText: w.location_text,
                        meetingUrl: w.workshop_delivery?.[0]?.meeting_url ?? null, coverUrl: w.cover_url,
                        price: Number(product?.price ?? 0), compareAtPrice: product?.compare_at_price,
                        currency: product?.currency, subtitle: product?.subtitle, sort: product?.sort,
                        isPublished: w.is_published, archivedAt: product?.archived_at,
                      }
                    })()} />
                  </div>
                  <AdminEditorDialog title={`ملفات وتسليم: ${w.title}`} triggerLabel="الملفات والتسليم">
                  <div className="mt-3 grid min-w-0 gap-2"><ProtectedDeliveryUpload kind="workshop-resource" entityId={w.id} label="إضافة مورد للمسجلات" /><ProtectedDeliveryUpload kind="workshop-recording" entityId={w.id} label="رفع تسجيل الورشة" /></div>
                  <div className="mt-2 grid min-w-0 gap-2">
                    <ProtectedDeliveryItems
                      kind="workshop-resource"
                      entityId={w.id}
                      label="موارد الورشة الحالية"
                      items={(w.workshop_resources ?? []).filter((item) => !item.archived_at).map((item) => ({ id: item.id, title: item.title, detail: item.kind }))}
                    />
                    <ProtectedDeliveryItems
                      kind="workshop-recording"
                      entityId={w.id}
                      label="تسجيلات الورشة الحالية"
                      items={(w.workshop_recordings ?? []).filter((item) => !item.archived_at).map((item) => ({ id: item.id, title: item.title, detail: item.published_at ? 'منشور للمسجلات' : 'غير منشور' }))}
                    />
                  </div>
                  {(w.workshop_registrations??[]).length>0&&<details className="mt-3 min-w-0 rounded-xl border border-line bg-ivory/35"><summary className="cursor-pointer list-none px-3 py-2 text-sm font-bold text-deep-teal">إدارة المسجلات ({w.workshop_registrations.length.toLocaleString('ar-EG')})</summary><div className="space-y-3 border-t border-line p-3">{w.workshop_registrations.map(registration=>{const profile=profiles.get(registration.user_id);return <div key={registration.id} className="rounded-lg bg-surface-raised p-3"><p className="text-sm font-semibold text-deep-teal">{profile?.full_name||profile?.email||registration.user_id}</p><WorkshopRegistrationControl id={registration.id} status={registration.status} minutes={registration.workshop_attendance?.[0]?.minutes??0}/></div>})}</div></details>}
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
