import Link from 'next/link'
import {AdminField,AdminSelect} from './AdminField'
import type {AdminPageQuery,AdminPageResult} from '@/lib/data/admin-pagination'
type Props={result:Omit<AdminPageResult<unknown>,'rows'>;query:AdminPageQuery;label:string;searchLabel?:string;example?:string;statuses?:{value:string;label:string}[]}
export function AdminListTools({result,query,label,searchLabel='بحث بالعنوان',example='جزء من الاسم أو العنوان',statuses=[]}:Props){
 const {prefix,q,status,page,pageSize,total,configured}=result
 const own=new Set([prefix+'q',prefix+'status',prefix+'page'])
 const preserved=Object.entries(query).filter(([key,value])=>!own.has(key)&&typeof value==='string')
 function href(next:number,clear=false){const p=new URLSearchParams();for(const [key,value] of preserved)p.set(key,value!);if(!clear){if(q)p.set(prefix+'q',q);if(status!=='all')p.set(prefix+'status',status);p.set(prefix+'page',String(next))}return '?'+p.toString()}
 if(!configured)return <p role="status" className="rounded-xl border border-line p-4">تعذّرت تهيئة قراءة {label}. لا تُعد هذه نتيجة فارغة من قاعدة البيانات.</p>
 const pages=Math.max(1,Math.ceil(total/pageSize))
 return <section className="space-y-3 rounded-2xl border border-line bg-surface-raised p-4" aria-label={`بحث وتصفح ${label}`}>
  <form method="get" className="flex flex-wrap items-start gap-3">
   {preserved.map(([key,value])=><input key={key} type="hidden" name={key} value={value}/>)}
   <AdminField name={prefix+'q'} label={searchLabel} defaultValue={q} type="search" maxLength={120} hint="يبحث في قاعدة البيانات كلها، بما فيها السجلات القديمة. لا يغيّر أي سجل." example={example}/>
   {statuses.length>0&&<AdminSelect name={prefix+'status'} label="الحالة المعروضة" defaultValue={status} hint="تصفية للنتائج فقط، ولا تحفظ حالة جديدة للسجل." example={statuses[0].label} options={[{value:'all',label:'كل الحالات'},...statuses]}/>}
   <button type="submit" className="min-h-12 rounded-full bg-deep-teal px-5 font-bold text-on-dark">بحث وتطبيق</button>
   <Link className="inline-flex min-h-12 items-center px-3 text-sm underline" href={href(1,true)}>مسح تصفية هذه القائمة</Link>
  </form>
  <p role="status" className="text-sm text-text-soft">{total?`عرض ${((page-1)*pageSize+1).toLocaleString('ar-EG')}–${Math.min(page*pageSize,total).toLocaleString('ar-EG')} من ${total.toLocaleString('ar-EG')} نتيجة`:'لا توجد نتائج مطابقة للبحث والتصفية.'} · صفحة {page.toLocaleString('ar-EG')} من {pages.toLocaleString('ar-EG')}</p>
  {pages>1&&<nav className="flex flex-wrap gap-4" aria-label={`صفحات ${label}`}>{page>1&&<Link className="inline-flex min-h-12 items-center underline" href={href(page-1)}>السابق</Link>}{page<pages&&<Link className="inline-flex min-h-12 items-center underline" href={href(page+1)}>التالي</Link>}{page!==pages&&<Link className="inline-flex min-h-12 items-center underline" href={href(pages)}>آخر صفحة</Link>}</nav>}
 </section>
}
