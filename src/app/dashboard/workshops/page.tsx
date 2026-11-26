import { AccountPagination } from '@/components/dashboard/AccountPagination'
import { accountPage } from '@/lib/customer-order-state'
import { getCollectionCount } from '@/lib/data/customer-account'
import type { Metadata } from 'next'
import { getMyWorkshops } from '@/lib/data/dashboard'
import { isPast } from '@/lib/format'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = { title: 'ورشي' }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })

export default async function MyWorkshopsPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const page=accountPage((await searchParams).page)
  const [workshops,total]=await Promise.all([getMyWorkshops(page),getCollectionCount('workshops')])

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold leading-snug text-deep-teal">ورشي</h1>
        <p className="mt-1 text-text-soft">ورشك القادمة والسابقة مع روابط الحضور والتسجيلات.</p>
      </header>

      {workshops.length === 0 ? (
        <EmptyState
          title="لم تسجّلي في أي ورشة بعد"
          description="الورش المباشرة مساحة رائعة للتطبيق الجماعي — اطّلعي على الجدول القادم."
          actionLabel="جدول الورش"
          actionHref="/workshops"
        />
      ) : (
        <div className="space-y-5">
          {workshops.map((w) => {
            const past = isPast(w.endsAt)
            return (
              <Card key={w.slug} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-deep-teal">{w.title}</h2>
                    <Badge tone={past ? 'sand' : w.status === 'waitlisted' ? 'pending' : 'success'}>
                      {past ? 'انتهت' : w.status === 'waitlisted' ? 'قائمة الانتظار' : 'مسجّلة'}
                    </Badge>
                  </div>
                  <p className="tnum mt-1 text-sm text-taupe">
                    {dateFmt.format(new Date(w.startsAt))} · {w.locationKind === 'online' ? 'أونلاين' : 'حضوري'}
                  </p>
                </div>
                {!past && w.meetingUrl && w.status === 'registered' && (
                  <Button href={w.meetingUrl} target="_blank" variant="secondary" size="sm" className="shrink-0">
                    رابط الحضور
                  </Button>
                )}
                {past && (
                  <Button href={`/workshops/${w.slug}`} variant="ghost" size="sm" className="shrink-0">
                    صفحة الورشة
                  </Button>
                )}
                {(w.resources.length>0||w.recordings.length>0)&&<div className="flex flex-wrap gap-2">{w.resources.map(resource=><Button key={resource.id} href={`/dashboard/workshops/${w.slug}/resources/${resource.id}`} variant="ghost" size="sm">{resource.title}</Button>)}{w.recordings.map(recording=><Button key={recording.id} href={`/dashboard/workshops/${w.slug}/recordings/${recording.id}`} variant="secondary" size="sm">{recording.title}</Button>)}</div>}
              </Card>
            )
          })}
        </div>
      )}
      <div className="mt-6"><AccountPagination page={page} total={total} base="/dashboard/workshops"/></div>
    </div>
  )
}
