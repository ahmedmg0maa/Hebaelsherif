export const orderStates: Record<string,{label:string;tone:'success'|'pending'|'sand'|'danger'|'cobalt'}> = {
  pending_payment:{label:'بانتظار إثبات الدفع',tone:'pending'},awaiting_review:{label:'قيد المراجعة',tone:'cobalt'},paid:{label:'مدفوع',tone:'success'},refund_pending:{label:'الاسترداد قيد التنفيذ',tone:'cobalt'},expired:{label:'منتهي',tone:'sand'},cancelled:{label:'ملغي',tone:'sand'},refunded:{label:'مسترد',tone:'danger'},
}
export function customerOrderState(order:{status:string;expiresAt:string|null}, now=Date.now()) {
  const expired=order.expiresAt!==null && (!Number.isFinite(Date.parse(order.expiresAt)) || Date.parse(order.expiresAt)<=now)
  const status=order.status==='pending_payment' && expired ? 'expired' : order.status
  return {...(orderStates[status] ?? {label:'حالة غير متاحة',tone:'sand' as const}),status,canSubmit:status==='pending_payment' && !!order.expiresAt && !expired}
}
export function accountPage(value:unknown) {
  return typeof value==='string' && /^\d{1,6}$/.test(value) ? Math.min(100000,Math.max(1,Number(value))) : 1
}

export function subscriptionState(sub:{status:string;endsAt:string;startsAt:string;archivedAt:string|null;balance:number},now=Date.now()) {
  const ended=Date.parse(sub.endsAt)<=now,early=Date.parse(sub.startsAt)>now
  const usable=sub.status==='active'&&!sub.archivedAt&&!ended&&!early&&sub.balance>0
  const labels:Record<string,string>={active:'نشط',pending:'بانتظار التفعيل',paused:'متوقف مؤقتًا',cancelled:'ملغي',expired:'منتهي'}
  const label=sub.archivedAt?'مؤرشف':ended&&sub.status==='active'?'منتهي':early&&sub.status==='active'?'لم يبدأ بعد':labels[sub.status]??'غير متاح'
  return {usable,label}
}
