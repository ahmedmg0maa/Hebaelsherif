export const RESOURCE_KINDS = ['article', 'video', 'podcast'] as const
export const RESOURCE_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const
export type ResourceKind = (typeof RESOURCE_KINDS)[number]
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number]
export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = { article: 'مقال/دليل', video: 'فيديو', podcast: 'بودكاست' }

export type ResourceInput = { id: string | null; slug: string; title: string; excerpt: string; body: string; kind: ResourceKind; topic: string; durationMinutes: number; externalUrl: string | null; mediaAssetId: string | null; transcript: string; captions: string; relatedProductId: string | null; status: ResourceStatus; publishAt: string | null; isFeatured: boolean; seoTitle: string | null; seoDescription: string | null }
export type ResourceValidation = { ok: true; value: ResourceInput } | { ok: false; error: string }
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeResourceInput(formData: FormData, now=new Date()):ResourceValidation{
  const id=String(formData.get('id')??'').trim(),media=String(formData.get('media_asset_id')??'').trim(),product=String(formData.get('related_product_id')??'').trim()
  if([id,media,product].some(value=>value&&!UUID.test(value)))return{ok:false,error:'مرجع السجل أو الوسيط أو المنتج غير صالح.'}
  const slug=String(formData.get('slug')??'').trim().toLowerCase(),title=String(formData.get('title')??'').trim(),excerpt=String(formData.get('excerpt')??'').trim(),body=String(formData.get('body')??'').trim()
  const kind=String(formData.get('kind')??''),topic=String(formData.get('topic')??'').trim(),durationMinutes=Number(formData.get('duration_minutes')??0)
  const external=String(formData.get('external_url')??'').trim(),transcript=String(formData.get('transcript')??'').trim(),captions=String(formData.get('captions')??'').trim(),status=String(formData.get('status')??'draft'),publishRaw=String(formData.get('publish_at')??'').trim()
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>100||title.length<4||title.length>180||excerpt.length<20||excerpt.length>500)return{ok:false,error:'راجعي الرابط والعنوان والمقتطف.'}
  if(!RESOURCE_KINDS.includes(kind as ResourceKind)||topic.length<2||topic.length>80||!Number.isInteger(durationMinutes)||durationMinutes<0||durationMinutes>1440)return{ok:false,error:'نوع المورد أو موضوعه أو مدته غير صالح.'}
  if(external){try{if(new URL(external).protocol!=='https:')throw new Error()}catch{return{ok:false,error:'الرابط الخارجي يجب أن يكون HTTPS صالحًا.'}}}
  if(body.length>30000||transcript.length>30000||captions.length>30000)return{ok:false,error:'يتجاوز أحد النصوص الحد المسموح.'}
  if(!RESOURCE_STATUSES.includes(status as ResourceStatus))return{ok:false,error:'حالة النشر غير صالحة.'}
  const publishAt=publishRaw?parseCairoLocalDateTime(publishRaw):null;if(status==='scheduled'&&(!publishAt||publishAt<=now))return{ok:false,error:'اختاري موعد نشر مستقبليًا بتوقيت القاهرة.'}
  const publicState=status==='published'||status==='scheduled'
  if(publicState&&kind==='article'&&body.length<50)return{ok:false,error:'أضيفي محتوى المقال أو الدليل قبل النشر.'}
  if(publicState&&(kind==='video'||kind==='podcast')&&(durationMinutes<1||(!external&&!media)))return{ok:false,error:'المورد الصوتي/المرئي المنشور يحتاج مدة ومصدرًا عامًا.'}
  if(publicState&&(kind==='video'||kind==='podcast')&&transcript.length<20&&captions.length<20)return{ok:false,error:'أضيفي نصًا مفرغًا أو وصفًا نصيًا صالحًا للإتاحة قبل النشر.'}
  const seoTitle=String(formData.get('seo_title')??'').trim(),seoDescription=String(formData.get('seo_description')??'').trim();if(seoTitle.length>180||seoDescription.length>320)return{ok:false,error:'حقول SEO أطول من المسموح.'}
  return{ok:true,value:{id:id||null,slug,title,excerpt,body,kind:kind as ResourceKind,topic,durationMinutes,externalUrl:external||null,mediaAssetId:media||null,transcript,captions,relatedProductId:product||null,status:status as ResourceStatus,publishAt:publishAt?.toISOString()??null,isFeatured:formData.get('is_featured')==='on',seoTitle:seoTitle||null,seoDescription:seoDescription||null}}
}
import { parseCairoLocalDateTime } from '../booking/cairo-time.ts'
