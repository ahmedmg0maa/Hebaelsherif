import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { listBooks, listCourses, listServices, listWorkshops } from '@/lib/data/catalog'

export type ProgramType = 'bundle' | 'vip' | 'free_resource'
export type ProgramChild = { type: 'course' | 'book' | 'workshop' | 'session'; title: string; subtitle: string; href: string }
export type PublicProgram = {
  id: string; type: ProgramType; slug: string; title: string; subtitle: string; description: string; price: number; compareAtPrice: number | null; currency: string; coverUrl: string | null
  variants: { id: string; name: string; price: number }[]; children: ProgramChild[]
  plan: { title: string; description: string; billingInterval: string; durationDays: number; sessionsIncluded: number; maxSubscribers: number | null; features: string[]; startsAt: string | null; endsAt: string | null } | null
  resource: { slug: string; title: string; excerpt: string } | null
}
type ProductRow = { id:string;type:ProgramType;slug:string;title:string;subtitle:string|null;description:string;price:number;compare_at_price:number|null;currency:string;cover_url:string|null;sort:number;product_variants:{id:string;name:string;price:number;is_active:boolean}[] }
type ChildProduct = { id:string;type:ProgramChild['type'];slug:string;title:string;subtitle:string|null }
type PlanRow = { product_id:string;title:string;description:string;price:number;currency:string;billing_interval:string;duration_days:number;sessions_included:number;max_subscribers:number|null;features:unknown;starts_at:string|null;ends_at:string|null }
type ResourceRow = { related_product_id:string;slug:string;title:string;excerpt:string }

const features = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()).slice(0, 30) : []

export async function listPublishedPrograms(): Promise<PublicProgram[]> {
  if (!hasSupabasePublicConfig()) return []
  try {
    const supabase = await getServerClient(), now = new Date().toISOString()
    const { data: source, error } = await supabase.from('products').select('id,type,slug,title,subtitle,description,price,compare_at_price,currency,cover_url,sort,product_variants(id,name,price,is_active)').in('type',['bundle','vip','free_resource']).eq('is_published',true).order('sort',{ascending:true})
    if (error || !source?.length) return []
    const rows = source as unknown as ProductRow[], bundleIds = rows.filter((row) => row.type==='bundle').map((row) => row.id), vipIds=rows.filter((row)=>row.type==='vip').map((row)=>row.id), freeIds=rows.filter((row)=>row.type==='free_resource').map((row)=>row.id)
    const [bundleRows, planRows, resourceRows, courses, books, workshops, services] = await Promise.all([
      bundleIds.length ? supabase.from('product_bundles').select('bundle_product_id,child_product_id').in('bundle_product_id',bundleIds) : Promise.resolve({data:[]}),
      vipIds.length ? supabase.from('subscription_plans').select('product_id,title,description,price,currency,billing_interval,duration_days,sessions_included,max_subscribers,features,starts_at,ends_at').in('product_id',vipIds).eq('is_active',true).eq('is_published',true).is('archived_at',null).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gt.${now}`) : Promise.resolve({data:[]}),
      freeIds.length ? supabase.from('resources').select('related_product_id,slug,title,excerpt').in('related_product_id',freeIds).eq('status','published').or(`publish_at.is.null,publish_at.lte.${now}`) : Promise.resolve({data:[]}),
      listCourses(),listBooks(),listWorkshops(),listServices(),
    ])
    const links = new Map<string,ProgramChild>()
    for(const item of courses)links.set(`course:${item.slug}`,{type:'course',title:item.title,subtitle:item.subtitle,href:`/courses/${item.slug}`})
    for(const item of books)links.set(`book:${item.slug}`,{type:'book',title:item.title,subtitle:item.subtitle,href:`/books/${item.slug}`})
    for(const item of workshops)links.set(`workshop:${item.slug}`,{type:'workshop',title:item.title,subtitle:item.subtitle,href:`/workshops/${item.slug}`})
    for(const item of services)links.set(`session:${item.slug}`,{type:'session',title:item.title,subtitle:item.subtitle,href:`/booking?service=${encodeURIComponent(item.slug)}`})
    const bundleLinks=(bundleRows.data??[]) as {bundle_product_id:string;child_product_id:string}[],childIds=[...new Set(bundleLinks.map((row)=>row.child_product_id))]
    const childResponse=childIds.length?await supabase.from('products').select('id,type,slug,title,subtitle').in('id',childIds).eq('is_published',true):{data:[]}
    const childProducts=(childResponse.data??[]) as ChildProduct[],childById=new Map(childProducts.map((child)=>[child.id,child]))
    const plans=new Map(((planRows.data??[]) as PlanRow[]).map((plan)=>[plan.product_id,plan])),resources=new Map(((resourceRows.data??[]) as ResourceRow[]).map((resource)=>[resource.related_product_id,resource]))
    return rows.map((row):PublicProgram|null=>{
      const children=bundleLinks.filter((link)=>link.bundle_product_id===row.id).map((link)=>childById.get(link.child_product_id)).filter((child):child is ChildProduct=>Boolean(child)).map((child)=>links.get(`${child.type}:${child.slug}`)).filter((child):child is ProgramChild=>Boolean(child))
      const expectedChildren=bundleLinks.filter((link)=>link.bundle_product_id===row.id).length,plan=plans.get(row.id),resource=resources.get(row.id)
      if(row.title.trim().length<3||(row.subtitle??'').trim().length<3||row.description.trim().length<24||row.price<0||!/^[A-Z]{3}$/.test(row.currency))return null
      if(row.type==='bundle'&&(!children.length||children.length!==expectedChildren))return null
      if(row.type==='vip'&&(!plan||Number(plan.price)!==Number(row.price)||plan.currency!==row.currency))return null
      if(row.type==='free_resource'&&(row.price!==0||!resource))return null
      return{id:row.id,type:row.type,slug:row.slug,title:row.title,subtitle:row.subtitle??'',description:row.description,price:Number(row.price),compareAtPrice:row.compare_at_price?Number(row.compare_at_price):null,currency:row.currency,coverUrl:row.cover_url,variants:(row.product_variants??[]).filter((variant)=>variant.is_active).map((variant)=>({id:variant.id,name:variant.name,price:Number(variant.price)})),children,plan:plan?{title:plan.title,description:plan.description,billingInterval:plan.billing_interval,durationDays:plan.duration_days,sessionsIncluded:plan.sessions_included,maxSubscribers:plan.max_subscribers,features:features(plan.features),startsAt:plan.starts_at,endsAt:plan.ends_at}:null,resource:resource?{slug:resource.slug,title:resource.title,excerpt:resource.excerpt}:null}
    }).filter((row):row is PublicProgram=>Boolean(row))
  } catch { return [] }
}

export async function getPublishedProgram(type:string,slug:string):Promise<PublicProgram|null>{if(!['bundle','vip','free_resource'].includes(type)||!/^[a-z0-9-]{3,80}$/.test(slug))return null;return(await listPublishedPrograms()).find((row)=>row.type===type&&row.slug===slug)??null}
export async function getPublishedProgramBySlug(slug:string):Promise<PublicProgram|null>{if(!/^[a-z0-9-]{3,80}$/.test(slug))return null;return(await listPublishedPrograms()).find((row)=>row.slug===slug)??null}
