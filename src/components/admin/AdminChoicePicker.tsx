 'use client'
import {useEffect,useRef,useState} from 'react'
import {resolveAdminChoices,searchAdminChoices,type AdminChoice} from '@/lib/actions/admin-choices'
import {AdminField} from './AdminField'
import {Button} from '@/components/ui/Button'
type Kind=Parameters<typeof searchAdminChoices>[0]
const savedState:Record<NonNullable<AdminChoice['state']>,string>={available:'',archived:'مؤرشف — محفوظ في هذا النموذج',hidden:'غير منشور — محفوظ في هذا النموذج',inactive:'غير مفعّل — محفوظ في هذا النموذج',unavailable:'قد يكون محذوفًا أو خارج صلاحية العرض؛ المعرّف محفوظ'}
function useSavedChoices(kind:Kind,ids:string[]){
 const key=JSON.stringify(ids),[items,setItems]=useState<Record<string,AdminChoice>>({}),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let current=true;const ids=JSON.parse(key) as string[];if(!ids.length)return
  resolveAdminChoices(kind,ids).then(response=>{if(!current)return;if(response.ok){setItems(Object.fromEntries(response.items.map(item=>[item.id,item])));setError('')}else setError(response.error)}).catch(()=>{if(current)setError('تعذّر قراءة الأسماء. المعرّفات المحفوظة لم تتغير؛ أعيدي المحاولة.')})
  return()=>{current=false}
 },[key,kind,attempt])
 return {items,error,retry:()=>setAttempt(value=>value+1)}
}
function SavedChoiceLabel({choice,fallback,error}:{choice?:AdminChoice;fallback?:string;error?:string}){return <span>{choice?.label||fallback||(error?'الاسم غير متاح حاليًا — المعرّف محفوظ':'جاري قراءة اسم الاختيار المحفوظ…')}{choice?.state&&savedState[choice.state]&&<span className="ms-2 text-sm text-text-soft">({savedState[choice.state]})</span>}</span>}
function SavedChoiceError({error,retry}:{error:string;retry:()=>void}){return error?<div><p role="alert" className="text-sm text-burgundy">{error}</p><Button type="button" variant="ghost" size="sm" onClick={retry}>إعادة قراءة الأسماء</Button></div>:null}
export function AdminChoiceSearch({kind,label,onSelect,selected=[],sourceId}:{kind:Kind;label:string;onSelect:(choice:AdminChoice)=>void;selected?:string[];sourceId?:string}){
 const [q,setQ]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{items:AdminChoice[];total:number;page:number;pageSize:number}|null>(null)
 const request=useRef(0),appliedQuery=useRef('')
 async function load(page:number,query=q){const id=++request.current;setBusy(true);setError('');try{const response=await searchAdminChoices(kind,query,page,sourceId);if(request.current!==id)return;if(!response.ok){setError(response.error);return}setResult(response);appliedQuery.current=query}catch{if(request.current===id)setError('تعذّر تحميل القائمة. اختياراتك الحالية محفوظة؛ حاولي مجددًا.')}finally{if(request.current===id)setBusy(false)}}
 return <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer font-bold text-deep-teal">بحث واختيار: {label}</summary><div className="mt-3 space-y-3" aria-busy={busy}>
 <AdminField name={`choice-search-${kind}`} type="search" label={`البحث في ${label}`} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();if(!busy)void load(1)}}} maxLength={120} hint="اكتبي الاسم ثم اضغطي Enter أو زر البحث. البحث لا يحفظ النموذج ولا يغيّر الاختيارات المحفوظة، ويعرض العناصر المتاحة للاختيار الآن." example={kind==='customer'?'جزء من اسم العميلة أو بريدها':'جزء من العنوان'}/>
 <Button type="button" size="sm" disabled={busy} onClick={()=>load(1)}>{busy?'جاري القراءة…':'بحث في كل السجلات'}</Button>
 {error&&<p role="alert" className="text-sm text-burgundy">{error}</p>}
 {!result&&!error&&<p className="text-sm text-text-soft">اضغطي بحث لعرض الاختيارات. لم تُقرأ القائمة بعد.</p>}
 {result&&!error&&<><p role="status" className="text-sm text-text-soft">{result.total?`${result.total.toLocaleString('ar-EG')} نتيجة · صفحة ${result.page.toLocaleString('ar-EG')} من ${Math.max(1,Math.ceil(result.total/result.pageSize)).toLocaleString('ar-EG')}`:'لا توجد نتائج مطابقة.'}</p><div className="grid max-h-80 gap-2 overflow-y-auto">{result.items.map(choice=><button key={choice.id} type="button" disabled={busy} aria-pressed={selected.includes(choice.id)} onClick={()=>onSelect(choice)} className="flex min-h-12 items-center gap-3 rounded-xl border border-line p-3 text-start text-sm font-bold text-deep-teal aria-pressed:border-deep-teal">{choice.url&&<span role="img" aria-label={choice.alt||choice.label} className="h-12 w-16 shrink-0 rounded-lg bg-cover bg-center" style={{backgroundImage:`url(${choice.url})`}}/>}{choice.label}{selected.includes(choice.id)&&' ✓'}</button>)}</div><div className="flex flex-wrap gap-3">{result.page>1&&<Button type="button" size="sm" disabled={busy} onClick={()=>load(result.page-1,appliedQuery.current)}>السابق</Button>}{result.page*result.pageSize<result.total&&<Button type="button" size="sm" disabled={busy} onClick={()=>load(result.page+1,appliedQuery.current)}>التالي</Button>}</div></>}
 </div></details>
}
export function AdminChoicePicker({kind,name,label,value,defaultValue='',initialLabel,onChange,required=false,sourceId}:{kind:Kind;name:string;label:string;value?:string;defaultValue?:string;initialLabel?:string;onChange?:(id:string,choice:AdminChoice|null)=>void;required?:boolean;sourceId?:string}){
 const [local,setLocal]=useState(defaultValue),[picked,setPicked]=useState<AdminChoice|null>(null),id=value??local
 const saved=useSavedChoices(kind,id?[id]:[])
 function choose(next:string,choice:AdminChoice|null){setLocal(next);setPicked(choice);onChange?.(next,choice)}
 return <fieldset className="space-y-2 rounded-xl border border-line p-3"><legend className="px-2 font-bold text-deep-teal">{label}{required?' — مطلوب':''}</legend><input type="hidden" name={name} value={id}/><p className="text-sm text-text-soft">{id?<SavedChoiceLabel choice={saved.items[id]??(picked?.id===id?picked:undefined)} fallback={initialLabel} error={saved.error}/>:'لم يُحدد اختيار.'} · يُحفظ مع النموذج بعد مراجعتك.</p>{id&&<><SavedChoiceError error={saved.error} retry={saved.retry}/><Button type="button" size="sm" variant="ghost" onClick={()=>choose('',null)}>إزالة الاختيار</Button></>}<AdminChoiceSearch kind={kind} label={label} sourceId={sourceId} selected={id?[id]:[]} onSelect={choice=>choose(choice.id,choice)}/></fieldset>
}
export function BundleChildrenPicker({initial,kind='bundle-child',name='children',label='محتوى الحزمة'}:{initial:string[];kind?:Kind;name?:string;label?:string}){
 const [selected,setSelected]=useState(initial),[picked,setPicked]=useState<Record<string,AdminChoice>>({}),saved=useSavedChoices(kind,selected)
 return <fieldset className="space-y-3"><legend className="font-bold text-deep-teal">{label}</legend><p className="text-sm text-text-soft">كل الاختيارات محفوظة أثناء التنقل والبحث، حتى المنتجات غير الظاهرة في الصفحة الحالية. مثال: ابحثي بالاسم ثم اختاري السجل المطلوب. المؤرشف يبقى مرتبطًا حتى تختاري إزالته.</p>{selected.length>0&&<SavedChoiceError error={saved.error} retry={saved.retry}/>}{selected.map(id=><div key={id} className="flex flex-wrap items-center gap-2"><input type="hidden" name={name} value={id}/><SavedChoiceLabel choice={saved.items[id]??picked[id]} error={saved.error}/><Button type="button" variant="ghost" size="sm" onClick={()=>setSelected(items=>items.filter(item=>item!==id))}>إزالة الاختيار</Button></div>)}<AdminChoiceSearch kind={kind} label={label} selected={selected} onSelect={choice=>{setPicked(items=>({...items,[choice.id]:choice}));setSelected(items=>items.includes(choice.id)?items.filter(id=>id!==choice.id):[...items,choice.id])}}/></fieldset>
}
