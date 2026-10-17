import Image from 'next/image'
import Link from 'next/link'
import {requirePermission} from '@/lib/auth/permissions'
import {getServiceClient} from '@/lib/supabase/server'
import {loadHomeDraftSource,loadHomeDraftMedia} from '@/lib/data/home-draft'
import {captureHomeSnapshot,compareHomeSnapshots,homeDraftSections,type HomeSnapshot} from '@/lib/home/draft'
import {PreviewButton} from '@/components/admin/PreviewButton'
export default async function HomeDraftComparison(){
 await requirePermission('content.manage',{redirectOnFailure:true})
 const db=getServiceClient()
 const {data:page,error}=await db.from('pages').select('id,title,status,page_sections(id,name,kind,sort,is_visible,content)').eq('slug','home').maybeSingle()
 if(error)throw Error('HOME_DRAFT_READ_UNAVAILABLE')
 if(!page)return <section className="mx-auto max-w-4xl space-y-4 p-6"><h1 className="text-3xl font-bold text-deep-teal">مقارنة الرئيسية</h1><p>لا توجد مسودة محفوظة بعد. جهّزي نسخة من الرئيسية الحالية أولًا؛ لا تتغير الصفحة العامة.</p><Link href="/admin/pages" className="underline">العودة إلى الصفحات</Link></section>
 const [{data:baseline,error:baselineError},source]=await Promise.all([db.from('home_draft_baselines').select('snapshot,captured_at').eq('page_id',page.id).maybeSingle(),loadHomeDraftSource()])
 if(baselineError)throw Error('HOME_BASELINE_READ_UNAVAILABLE')
 const draftSections=homeDraftSections(page.page_sections),draftMedia=await loadHomeDraftMedia(draftSections)
 const draft=captureHomeSnapshot(draftSections,source.copy,source.profile,draftMedia),publicNow=source.snapshot
 const comparison=compareHomeSnapshots(publicNow,draft),atCapture=baseline?.snapshot as HomeSnapshot|undefined
 const sourceChanged=atCapture?compareHomeSnapshots(atCapture,publicNow):null
 return <section className="mx-auto max-w-6xl space-y-6 p-4">
  <h1 className="text-3xl font-bold text-deep-teal">مقارنة مسودة الرئيسية بما يظهر للزائرة</h1>
  <p className="text-sm leading-7 text-text-soft">المقارنة تعرض النصوص والصور وروابطها والترتيب والظهور المحفوظة. الصور هنا للمقارنة؛ راجعي تخطيط القسم وقصه النهائي في المعاينة الخاصة. بطاقات المنتجات وتعريف هبة تبقى مرتبطة بمصادرها الحية. لا يحدث نشر من هذه الشاشة؛ راجعي المعاينة قبل اختيار النشر في محرر الصفحة.</p>
  <div className="flex flex-wrap gap-4"><PreviewButton type="page" id={page.id}/><Link href="/" target="_blank" className="inline-flex min-h-12 items-center underline">فتح الرئيسية العامة</Link><Link href="/admin/pages" className="inline-flex min-h-12 items-center underline">العودة للتحرير</Link></div>
  <p className="rounded-xl border border-line p-4 text-sm">حالة الصفحة: {page.status==='draft'?'مسودة غير منشورة':page.status==='published'?'منشورة':'راجعي حالة النشر'}. {baseline?'توجد نسخة مرجعية محفوظة عند التجهيز.':'هذه الصفحة سبقت أداة التجهيز؛ لا توجد نسخة مرجعية محفوظة لها.'}</p>
  {sourceChanged&&(sourceChanged.presentationChanged||sourceChanged.sections.some(s=>s.added||s.removed||s.orderChanged||s.visibilityChanged||s.contentChanged||s.imagesChanged))&&<p role="status" className="rounded-xl border border-burgundy p-4 text-burgundy">تغيّرت الرئيسية العامة منذ تجهيز المسودة. قارني التغييرات الحالية قبل النشر؛ لم نستبدل مسودتك.</p>}
  {comparison.presentationChanged&&<p role="status" className="text-burgundy">تغيّرت صور أو روابط التصميم الأساسية؛ راجعي نسخة التصميم قبل النشر.</p>}
  {comparison.sections.map(s=><article key={s.kind} className="space-y-3 rounded-2xl border border-line bg-surface-raised p-5"><h2 className="text-xl font-bold text-deep-teal">{s.name}</h2><p className="text-sm">{s.added?'قسم مضاف':s.removed?'قسم محذوف من المسودة':!s.contentChanged&&!s.imagesChanged&&!s.orderChanged&&!s.visibilityChanged?'مطابق للرئيسية الحالية':'توجد تغييرات محفوظة'}{s.orderChanged?' · الترتيب مختلف':''}{s.visibilityChanged?' · الظهور مختلف':''}{s.imagesChanged?' · الصورة أو القص مختلفان':''}</p>{s.kind==='trust'&&<p className="text-sm leading-7 text-text-soft">هذا القسم يعرض الاعتمادات الموثقة من «تعريف هبة». نصوص القالب القديمة لا تتحكم في عرضه.</p>}{s.ignoredContentChanged&&<p role="status" className="text-burgundy">تغيّرت نصوص قديمة لا يستخدمها هذا القسم؛ راجعي تعريف هبة لتغيير الاعتمادات الظاهرة.</p>}<div className="grid gap-4 md:grid-cols-2"><div><h3 className="font-bold">المعروض للزائرة الآن</h3>{s.beforeImages.map((image,index)=><Image key={index} src={image.url} alt={image.alt} width={560} height={315} unoptimized className="mt-3 aspect-video w-full rounded-xl object-cover" style={{objectPosition:`${image.x}% ${image.y}%`}}/>)}{s.beforeText.map((t,i)=><p key={i} className="mt-2 break-words text-sm leading-7" dir="auto">{t}</p>)}</div><div><h3 className="font-bold">المسودة المحفوظة</h3>{s.afterImages.map((image,index)=><Image key={index} src={image.url} alt={image.alt} width={560} height={315} unoptimized className="mt-3 aspect-video w-full rounded-xl object-cover" style={{objectPosition:`${image.x}% ${image.y}%`}}/>)}{s.afterText.map((t,i)=><p key={i} className="mt-2 break-words text-sm leading-7" dir="auto">{t}</p>)}</div></div></article>)}
 </section>
}
