import { AccountPagination } from '@/components/dashboard/AccountPagination'
import { accountPage } from '@/lib/customer-order-state'
import { getCollectionCount } from '@/lib/data/customer-account'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getMyNotifications } from '@/lib/data/dashboard'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MarkReadButton } from '@/components/dashboard/MarkReadButton'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'الإشعارات' }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })

const kindColors: Record<string, string> = {
  info: 'bg-cobalt',
  success: 'bg-deep-teal',
  warning: 'bg-antique-gold',
  error: 'bg-burgundy',
}

export default async function NotificationsPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const page=accountPage((await searchParams).page)
  const [notifications,total]=await Promise.all([getMyNotifications(page),getCollectionCount('notifications')])
  const unread = notifications.filter((n) => !n.readAt).length

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold leading-snug text-deep-teal">الإشعارات</h1>
          <p className="mt-1 text-text-soft">
            {unread > 0 ? `لديك ${unread.toLocaleString('ar-EG')} إشعارات غير مقروءة في هذه الصفحة` : 'لا إشعارات غير مقروءة في هذه الصفحة'}
          </p>
        </div>
        {unread > 0 && <MarkReadButton />}
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          title="لا إشعارات بعد"
          description="سنخبرك هنا بكل جديد: اعتماد مدفوعاتك، تأكيد حجوزاتك، ومحتوى جديد يضاف لك."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const body = (
              <div className="flex gap-4">
                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', kindColors[n.kind] ?? 'bg-cobalt', n.readAt && 'opacity-30')} aria-hidden />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className={cn('font-bold', n.readAt ? 'text-text-soft' : 'text-deep-teal')}>{n.title}</h2>
                    <time className="tnum shrink-0 text-xs text-taupe">{dateFmt.format(new Date(n.createdAt))}</time>
                  </div>
                  {n.body && <p className="mt-1 text-sm leading-relaxed text-text-soft">{n.body}</p>}
                </div>
              </div>
            )
            return (
              <Card key={n.id} className={cn('p-5', !n.readAt && 'border-antique-gold/50')}>
                {n.link ? <Link href={n.link}>{body}</Link> : body}
              </Card>
            )
          })}
        </div>
      )}
      <div className="mt-6"><AccountPagination page={page} total={total} base="/dashboard/notifications"/></div>
    </div>
  )
}
