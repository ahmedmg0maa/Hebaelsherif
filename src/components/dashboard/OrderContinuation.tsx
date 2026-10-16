'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PaymentSettings } from '@/lib/data/checkout'
import { ResubmitProof } from './ResubmitProof'
const labels={instapay:'إنستاباي',wallet:'محفظة إلكترونية',bank_transfer:'تحويل بنكي'} as const
type Method=keyof typeof labels
export function OrderContinuation({orderId,requestedMethod,expiresAt,settings}:{orderId:string;requestedMethod:string|null;expiresAt:string;settings:PaymentSettings}) {
  const router=useRouter()
  const methods=(Object.keys(labels) as Method[]).filter(method=>(requestedMethod===null||method===requestedMethod)&&(method==='bank_transfer'?settings.bank:settings[method]))
  const [method,setMethod]=useState<Method|undefined>(methods[0]),[expired,setExpired]=useState(false),[locked,setLocked]=useState(false)
  useEffect(()=>{const timer=setInterval(()=>{if(Date.parse(expiresAt)<=Date.now()){clearInterval(timer);setExpired(true);router.refresh()}},1000);return()=>clearInterval(timer)},[expiresAt,router])
  if(expired) return <p role="status" className="rounded-xl bg-sand/30 p-5">انتهت مهلة الطلب. إذا حوّلتِ المبلغ بالفعل، تواصلي معنا قبل إجراء تحويل آخر.</p>
  if(!method||!methods.includes(method)) return <p role="status" className="rounded-xl border border-line p-5">بيانات وسيلة الدفع غير متاحة لهذا الطلب. تواصلي معنا قبل التحويل.</p>
  return <section className="space-y-5 rounded-3xl border border-antique-gold/50 bg-surface-raised p-5 sm:p-8"><div><h2 className="font-heading text-2xl text-deep-teal">أكملي طلبك</h2><p className="mt-2 text-sm leading-loose text-text-soft">إذا حوّلتِ المبلغ بالفعل، ارفعي الإيصال فقط. إعادة محاولة الرفع لا تحتاج إلى تحويل جديد.</p></div><fieldset disabled={locked}><legend className="mb-3 text-sm font-bold text-deep-teal">وسيلة الدفع</legend><div className="flex flex-wrap gap-3">{methods.map(value=><label key={value} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 has-checked:border-deep-teal has-checked:bg-deep-teal/5"><input type="radio" name="order-method" checked={value===method} onChange={()=>setMethod(value)}/>{labels[value]}</label>)}</div></fieldset><dl className="rounded-xl bg-ivory p-5 text-sm leading-loose"><dt className="font-semibold text-deep-teal">بيانات التحويل</dt><dd className="break-all" dir="ltr">{method==='instapay'?settings.instapay?.handle:method==='wallet'?settings.wallet?.number:settings.bank?.iban}</dd><dd>{method==='instapay'?settings.instapay?.name:method==='wallet'?settings.wallet?.provider:`${settings.bank?.bank??''} · ${settings.bank?.name??''}`}</dd></dl><ResubmitProof key={method} orderId={orderId} method={method} onAttemptLock={setLocked}/></section>
}
