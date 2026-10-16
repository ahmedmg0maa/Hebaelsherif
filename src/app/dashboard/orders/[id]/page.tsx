import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAccountOrder } from '@/lib/data/customer-account'
import { getPaymentSettings } from '@/lib/data/checkout'
import { customerOrderState } from '@/lib/customer-order-state'
import { formatPrice } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { OrderContinuation } from '@/components/dashboard/OrderContinuation'
import { VerifiedReviewForm } from '@/components/dashboard/VerifiedReviewForm'
export const metadata:Metadata={title:'تفاصيل طلبي'}
const dates=new Intl.DateTimeFormat('ar-EG',{dateStyle:'long',timeStyle:'short',timeZone:'Africa/Cairo'})
const paymentLabels:Record<string,string>={pending:'قيد المراجعة',approved:'معتمد',rejected:'مرفوض',cancelled:'ملغي',refunded:'مسترد'}
export default async function OrderDetail({params}:{params:Promise<{id:string}>}) {
  const order=await getAccountOrder((await params).id)
  if(!order) notFound()
  const state=customerOrderState(order),settings=state.canSubmit?await getPaymentSettings():null
  return <div className="mx-auto max-w-4xl space-y-6"><Link href="/dashboard/orders" className="inline-flex min-h-12 items-center font-semibold text-deep-teal">← جميع طلباتي</Link><header className="rounded-3xl border border-line bg-surface-raised p-6 sm:p-9"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-taupe">تفاصيل الطلب</p><Badge tone={state.tone}>{state.label}</Badge></div><h1 className="mt-4 font-heading text-3xl leading-relaxed text-deep-teal">{order.products.map(p=>p.title).join(' + ')||'طلب شراء'}</h1><p className="mt-4 text-2xl font-semibold text-burgundy">{formatPrice(order.total,order.currency)}</p><dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm text-text-soft"><div><dt className="inline">رقم الطلب: </dt><dd className="inline break-all" dir="ltr">{order.id}</dd></div><div><dt className="inline">تاريخ الإنشاء: </dt><dd className="inline">{dates.format(new Date(order.createdAt))} — بتوقيت القاهرة</dd></div>{state.canSubmit&&order.expiresAt&&<div><dt className="inline">آخر موعد لرفع الإيصال: </dt><dd className="inline">{dates.format(new Date(order.expiresAt))}</dd></div>}</dl></header>
    {state.canSubmit&&settings&&order.expiresAt&&<OrderContinuation orderId={order.id} requestedMethod={order.requestedMethod} expiresAt={order.expiresAt} settings={settings}/>}
    {state.status==='awaiting_review'&&<p role="status" className="rounded-2xl border border-line p-5 leading-loose">إثبات الدفع قيد المراجعة. لا يلزم إرسال إيصال أو تحويل إضافي.</p>}
    {state.status==='paid'&&<section className="rounded-2xl border border-line bg-surface-raised p-6"><h2 className="font-bold text-deep-teal">طلبك مكتمل</h2><p className="mt-2 text-text-soft">تجدين مشترياتك ومواعيدك في حسابك.</p><div className="mt-4 flex flex-wrap gap-3">{[['courses','دوراتي'],['books','كتبي'],['workshops','ورشي'],['bookings','حجوزاتي'],['subscriptions','اشتراكاتي']].map(([path,label])=><Link key={path} className="min-h-12 content-center rounded-xl border border-line px-4 font-semibold text-deep-teal" href={`/dashboard/${path}`}>{label}</Link>)}</div>{order.products.map(product=><VerifiedReviewForm key={product.id} productId={product.id} title={product.title}/>)}</section>}
    {['expired','cancelled','refunded','refund_pending'].includes(state.status)&&<p className="rounded-2xl bg-sand/20 p-5 leading-loose">{state.status==='refund_pending'?'الاسترداد قيد التنفيذ؛ تابعي الحالة من مدفوعاتك.':'هذا الطلب مغلق لاستقبال إثباتات جديدة. إذا احتجتِ مساعدة بشأن مبلغ محوّل، تواصلي معنا مع رقم الطلب.'}</p>}
    {order.payments.length>0&&<section><h2 className="mb-4 font-heading text-2xl text-deep-teal">آخر إثباتات الدفع</h2><ol className="space-y-3">{order.payments.map(payment=><li key={payment.id} className="rounded-xl border border-line bg-surface-raised p-5"><p className="font-bold text-deep-teal">{paymentLabels[payment.status]??'حالة غير متاحة'}</p><time className="text-sm text-taupe" dateTime={payment.createdAt}>{dates.format(new Date(payment.createdAt))}</time>{payment.status==='rejected'&&payment.reason&&<p className="mt-2 text-sm text-burgundy">{payment.reason}</p>}</li>)}</ol></section>}
    <Link href="/contact" className="inline-flex min-h-12 items-center text-sm font-semibold text-deep-teal underline underline-offset-4">مساعدة بشأن الطلب</Link></div>
}
