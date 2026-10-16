import type { Metadata } from 'next'
import Link from 'next/link'
import { getMySubscriptions } from '@/lib/data/customer-account'
import { accountPage,subscriptionState } from '@/lib/customer-order-state'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { AccountPagination } from '@/components/dashboard/AccountPagination'
export const metadata:Metadata={title:'اشتراكاتي'}
const dates=new Intl.DateTimeFormat('ar-EG',{dateStyle:'long',timeZone:'Africa/Cairo'})
export default async function SubscriptionsPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const page=accountPage((await searchParams).page),{items,total}=await getMySubscriptions(page)
  return <div className="mx-auto max-w-5xl space-y-6"><header><p className="mb-2 text-sm font-semibold text-burgundy">مساحة الاستمرار</p><h1 className="font-heading text-3xl text-deep-teal">اشتراكاتي ورصيد الجلسات</h1><p className="mt-3 leading-loose text-text-soft">شروط الباقة محفوظة وقت تفعيلها. الحجز يخضع للرصيد وتوافر الموعد.</p></header>
    {items.length===0?<EmptyState title="لا اشتراكات في هذه الصفحة" description="تظهر الباقة ورصيدها هنا بعد تسجيلها على حسابك." actionHref={page>1?'/dashboard/subscriptions':'/services'} actionLabel={page>1?'أول صفحة':'استكشفي الخدمات'}/>:<div className="grid gap-5 lg:grid-cols-2">{items.map(sub=>{const {usable,label}=subscriptionState(sub);return <article key={sub.id} className="flex flex-col rounded-3xl border border-line bg-surface-raised p-6 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-2xl text-deep-teal">{sub.title}</h2><Badge tone={usable?'success':'sand'}>{label}</Badge></div><div className="my-6 rounded-2xl bg-deep-teal/5 p-5"><p className="text-sm text-text-soft">الرصيد المسجل</p><p className="mt-2 text-3xl font-semibold text-deep-teal">{sub.balance.toLocaleString('ar-EG')} <span className="text-base font-normal">جلسة</span></p><p className="mt-2 text-xs leading-loose text-taupe">الباقة الأصلية: {sub.sessionsIncluded.toLocaleString('ar-EG')} جلسة؛ الرصيد يشمل التعديلات والاستردادات المسجلة.</p></div><dl className="space-y-3 text-sm"><div><dt className="text-taupe">الفترة — بتوقيت القاهرة</dt><dd className="mt-1 leading-loose">{dates.format(new Date(sub.startsAt))} ← {dates.format(new Date(sub.endsAt))}</dd></div><div><dt className="text-taupe">الخدمات المشمولة</dt><dd className="mt-1 leading-loose">{sub.eligibleServices.map(service=>service.title).join('، ')||'لا توجد خدمات مرتبطة؛ تواصلي معنا للمراجعة.'}</dd></div></dl><div className="mt-auto flex flex-wrap items-center gap-4 pt-6">{usable&&sub.eligibleServices.length>0&&<Button href="/booking" size="sm">احجزي من رصيدك</Button>}{sub.orderId&&<Link className="min-h-12 content-center text-sm font-semibold text-deep-teal underline underline-offset-4" href={`/dashboard/orders/${sub.orderId}`}>تفاصيل الطلب</Link>}</div></article>})}</div>}
    <AccountPagination page={page} total={total} base="/dashboard/subscriptions"/></div>
}
