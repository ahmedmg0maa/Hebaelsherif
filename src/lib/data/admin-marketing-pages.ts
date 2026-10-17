import {adminPagedList,type AdminPageQuery} from './admin-pagination'
import type {AdminOffer,AdminCoupon} from './admin'
const active={active:{column:'is_active',value:true},inactive:{column:'is_active',value:false}}
export async function adminOfferPage(input:AdminPageQuery){
 const result=await adminPagedList<Omit<AdminOffer,'targetTypes'>>('offers','id,kind,title,description,badgeText:badge_text,ctaLabel:cta_label,ctaHref:cta_href,terms,showOnHome:show_on_home,discountKind:discount_kind,discountValue:discount_value,startsAt:starts_at,endsAt:ends_at,isActive:is_active,usageLimit:usage_limit,targets:offer_targets(product_type,product_id,category)',input,{searchColumn:'title',statusFilters:active})
 return {...result,rows:result.rows.map((row):AdminOffer=>({...row,discountValue:row.discountValue===null?null:Number(row.discountValue),targetTypes:row.targets.map(target=>target.product_type||'منتج محدد')}))}
}
export async function adminCouponPage(input:AdminPageQuery){
 const result=await adminPagedList<Omit<AdminCoupon,'redemptions'>&{uses:{count:number}[]}>('coupons','id,code,kind,value,allowWithOffers:allow_with_offers,maxUses:max_uses,maxUsesPerUser:max_uses_per_user,startsAt:starts_at,endsAt:ends_at,isActive:is_active,uses:coupon_redemptions(count)',input,{searchColumn:'code',statusFilters:active})
 return {...result,rows:result.rows.map((row):AdminCoupon=>({...row,value:Number(row.value),redemptions:row.uses[0]?.count??0}))}
}
