import type { Metadata } from 'next'
import Link from 'next/link'
import { getOrderHistory } from '@/lib/data/customer-account'
import { formatPrice } from '@/lib/format'
import { accountPage, customerOrderState } from '@/lib/customer-order-state'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AccountPagination } from '@/components/dashboard/AccountPagination'
export const metadata:Metadata={title:'طلباتي'}
const dates=new Intl.DateTimeFormat('ar-EG',{dateStyle:'long',timeZone:'Africa/Cairo'})
export default async function MyOrdersPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const page=accountPage((await searchParams).page),{items,total}=await getOrderHistory(page)
  return <div className="mx-auto max-w-5xl space-y-6"><header><p className="mb-2 text-sm font-semibold text-burgundy">كل خطوة محفوظة</p><h1 className="font-heading text-3xl text-deep-teal">طلباتي</h1><p className="mt-3 text-text-soft">مشترياتك وإثباتات الدفع والوصول إلى المحتوى، في مكان واحد.</p></header>
    {items.length===0?<EmptyState title="لا طلبات في هذه الصفحة" description="تظهر عملية الشراء هنا من إنشائها حتى اكتمالها." actionHref={page>1?'/dashboard/orders':'/courses'} actionLabel={page>1?'أول صفحة':'استكشفي الدورات'}/>:<ul className="space-y-4">{items.map(order=>{const state=customerOrderState(order);return <li key={order.id} className="rounded-2xl border border-line bg-surface-raised p-5 shadow-card sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="max-w-2xl font-heading text-xl leading-loose text-deep-teal">{order.products.map(p=>p.title).join(' + ')||'طلب شراء'}</h2><Badge tone={state.tone}>{state.label}</Badge></div><div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4"><div><p className="font-bold text-burgundy">{formatPrice(order.total,order.currency)}</p><time dateTime={order.createdAt} className="text-xs text-taupe">{dates.format(new Date(order.createdAt))}</time></div><Link href={`/dashboard/orders/${order.id}`} className="inline-flex min-h-12 items-center rounded-xl border border-deep-teal/30 px-5 font-semibold text-deep-teal hover:bg-deep-teal/5">{state.canSubmit?'استكمال إثبات الدفع':'تفاصيل الطلب'}</Link></div></li>})}</ul>}
    <AccountPagination page={page} total={total} base="/dashboard/orders"/>
  </div>
}
