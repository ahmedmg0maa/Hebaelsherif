'use client'

import {useState,useSyncExternalStore} from 'react'
import {Button} from '@/components/ui/Button'
import {Countdown} from '@/components/ui/Countdown'
export type OfferPresentation={id:string;title:string;description:string;badgeText?:string|null;endsAt:string|null;ctaLabel:string;ctaHref:string;terms:string;discountKind:string|null;discountValue:number|null}
const subscribe=(callback:()=>void)=>{window.addEventListener('storage',callback);return ()=>window.removeEventListener('storage',callback)}
export function OfferCard({offer,preview=false,dismissible=false}:{offer:OfferPresentation;preview?:boolean;dismissible?:boolean}){
 const key=`heba.offer.dismissed.${offer.id}.${offer.endsAt??'open'}`
 const dismissed=useSyncExternalStore(subscribe,()=>{try{return localStorage.getItem(key)==='yes'}catch{return false}},()=>false)
 const [closed,setClosed]=useState(false),[expired,setExpired]=useState(false)
 if(!preview&&(closed||expired||(dismissible&&dismissed)))return null
 return <article className="relative overflow-hidden rounded-2xl border border-antique-gold/45 bg-surface-raised p-5 text-center shadow-card sm:p-8" aria-label={offer.title}>
 {dismissible&&!preview&&<button type="button" aria-label="إغلاق هذا العرض" className="absolute end-2 top-2 flex h-12 w-12 items-center justify-center rounded-full text-xl text-deep-teal hover:bg-sand/30" onClick={()=>{try{localStorage.setItem(key,'yes');window.dispatchEvent(new Event('storage'))}catch{}setClosed(true)}}>×</button>}
 <div className="mx-auto max-w-2xl space-y-4">
 {offer.badgeText&&<p className="mx-auto w-fit rounded-full bg-antique-gold/15 px-4 py-2 text-sm font-bold text-deep-teal">{offer.badgeText}</p>}
 <h2 className="px-6 font-heading text-2xl leading-relaxed text-deep-teal sm:text-3xl">{offer.title}</h2>
 <p className="whitespace-pre-line text-base leading-8 text-text-soft">{offer.description}</p>
 {offer.discountValue!=null&&<p className="text-lg font-bold text-deep-teal">خصم {offer.discountValue.toLocaleString('ar-EG')}{offer.discountKind==='percent'?'٪':' ج.م'} على المنتجات المشمولة</p>}
 {offer.endsAt&&<Countdown target={offer.endsAt} onExpire={()=>setExpired(true)}/>}
 <p className="text-sm leading-7 text-text-soft">يُطبّق أفضل عرض واحد على المنتج. لا يُجمع الكوبون مع العرض إلا إذا كان الكوبون يسمح بذلك؛ عند السماح يُحسب بعد خصم العرض. تظهر القيمة النهائية قبل تأكيد الطلب.</p>
 {preview?<span className="inline-flex min-h-12 items-center rounded-xl bg-deep-teal px-6 font-bold text-on-dark">{offer.ctaLabel}</span>:<Button href={offer.ctaHref}>{offer.ctaLabel}</Button>}
 {offer.terms&&<p className="whitespace-pre-line border-t border-line pt-4 text-sm leading-7 text-text-soft">{offer.terms}</p>}
 </div></article>
}
