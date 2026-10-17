import type {Metadata} from 'next'
import {getServerClient} from '@/lib/supabase/server'
import {PageHero} from '@/components/catalog/PageHero'
import {EmptyState} from '@/components/ui/EmptyState'
import {OfferCard} from '@/components/marketing/OfferCard'
export const metadata:Metadata={title:'العروض المتاحة',description:'العروض المعتمدة السارية وشروط الاستفادة منها.'}
export default async function OffersPage(){
 const db=await getServerClient(),now=new Date().toISOString()
 const {data,error}=await db.from('offers').select('id,title,description,badge_text,ends_at,cta_label,cta_href,terms,discount_kind,discount_value').eq('is_active',true).lte('starts_at',now).or(`ends_at.is.null,ends_at.gt.${now}`).order('created_at',{ascending:false}).limit(30)
 if(error)throw new Error('PUBLIC_OFFERS_READ_UNAVAILABLE')
 return <main><PageHero eyebrow="العروض" title="اختاري ما يناسبكِ" lead="تفاصيل واضحة ومواعيد حقيقية. راجعي المنتجات المشمولة والسعر النهائي قبل تأكيد الطلب."/><section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6">{data?.length?data.map(o=><OfferCard key={o.id} offer={{id:o.id,title:o.title,description:o.description,badgeText:o.badge_text,endsAt:o.ends_at,ctaLabel:o.cta_label,ctaHref:o.cta_href,terms:o.terms,discountKind:o.discount_kind,discountValue:o.discount_value==null?null:Number(o.discount_value)}}/>):<EmptyState title="لا توجد عروض سارية الآن" description="تظهر العروض المعتمدة هنا عند إتاحتها." actionHref="/courses" actionLabel="استكشفي الكورسات"/>}</section></main>
}
