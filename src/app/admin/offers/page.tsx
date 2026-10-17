import type { Metadata } from 'next'
import {adminOfferPage} from '@/lib/data/admin-marketing-pages'
import type {AdminPageQuery} from '@/lib/data/admin-pagination'
import {AdminListTools} from '@/components/admin/AdminListTools'
import { formatPrice, isPast } from '@/lib/format'
import { Card, CardTitle } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { OfferForm, ActiveToggle, OfferEdit } from '@/components/admin/MarketingForms'

export const metadata: Metadata = { title: 'العروض — الإدارة' }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { timeZone:'Africa/Cairo', day: 'numeric', month: 'short' })

const kindLabels: Record<string, string> = {
  flash_sale: 'تخفيض سريع',
  countdown: 'عدّاد تنازلي',
  seasonal: 'موسمية',
  limited_seats: 'مقاعد محدودة',
  bundle: 'حزمة',
  coupon_campaign: 'حملة كوبونات',
}

const targetLabels: Record<string, string> = {
  course: 'الدورات',
  book: 'الكتب',
  workshop: 'الورش',
  session: 'الجلسات',
}

export default async function AdminOffersPage({searchParams}:{searchParams:Promise<AdminPageQuery>}) {
  const query=await searchParams,result=await adminOfferPage(query),offers=result.rows,products: {id:string;title:string}[]=[]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">العروض</h1>
        <p className="mt-1 text-text-soft">
          يسري الخصم بعد التفعيل وخلال مواعيده على المنتجات المستهدفة وصفحة الدفع. ظهور البطاقة على الرئيسية اختيار مستقل داخل العرض.
        </p>
      </header>

      <Card className="p-8">
        <CardTitle className="mb-6">عرض جديد</CardTitle>
        <OfferForm products={products} />
      </Card>

      <AdminListTools result={result} query={query} label="العروض" searchLabel="بحث باسم العرض" statuses={[{value:"active",label:"مفعّل"},{value:"inactive",label:"موقوف"}]}/>
      {offers.length === 0 ? (
        <EmptyState title="لا عروض بعد" description="أطلقي أول حملة من النموذج أعلاه — بعدّاد تنازلي وشارة تظهر على المنتجات." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>العرض</TH>
              <TH>النوع</TH>
              <TH>الخصم</TH>
              <TH>يستهدف</TH>
              <TH>النافذة</TH>
              <TH>الحالة</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {offers.map((o) => {
              const ended = isPast(o.endsAt), scheduled = !isPast(o.startsAt)
              return (
                <TR key={o.id}>
                  <TD>
                    <p className="font-semibold text-deep-teal">{o.title}</p>
                    {o.badgeText && <p className="text-xs text-antique-gold">{o.badgeText}</p>}
                  </TD>
                  <TD>{kindLabels[o.kind] ?? o.kind}</TD>
                  <TD>
                    {o.discountValue
                      ? o.discountKind === 'percent'
                        ? `${o.discountValue.toLocaleString('ar-EG')}٪`
                        : formatPrice(o.discountValue)
                      : '—'}
                  </TD>
                  <TD>{o.targetTypes.length > 0 ? o.targetTypes.map((t) => targetLabels[t] ?? t).join('، ') : 'الكل'}</TD>
                  <TD>
                    {dateFmt.format(new Date(o.startsAt))} — {o.endsAt ? dateFmt.format(new Date(o.endsAt)) : 'مفتوح'}
                  </TD>
                  <TD>
                    <Badge tone={o.isActive && !ended ? 'success' : 'sand'}>
                      {ended ? 'انتهى' : !o.isActive ? 'موقوف' : scheduled ? 'مجدول' : 'فعّال'}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex flex-wrap items-start gap-2"><ActiveToggle id={o.id} active={o.isActive} kind="offer" /><OfferEdit offer={o} products={products} /></div>
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}
    </div>
  )
}
