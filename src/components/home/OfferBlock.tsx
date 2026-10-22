import {OfferCard} from '@/components/marketing/OfferCard'
import type {HomeOffer} from '@/lib/data/home'
export function OfferBlock({offer,ctaLabel='تفاصيل العرض'}:{offer:HomeOffer|null;ctaLabel?:string}){
 if(!offer)return null
 return <section className="heritage-paper bg-ivory px-4 py-10 sm:px-6"><div className="mx-auto max-w-5xl"><OfferCard offer={{...offer,ctaLabel:offer.ctaLabel||ctaLabel}} dismissible/></div></section>
}
