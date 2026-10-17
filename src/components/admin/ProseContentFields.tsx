'use client'
import {useState} from 'react'
import {AdminField,AdminTextarea} from './AdminField'
const object=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{}
export function ProseContentFields({initial}:{initial:unknown}){
 const [content,setContent]=useState(()=>object(initial))
 const headingKey='heading' in content?'heading':'title' in content?'title':'heading'
 const bodyKey='body' in content?'body':'text' in content?'text':'body'
 const change=(key:string,value:unknown)=>setContent(previous=>({...previous,[key]:value}))
 const string=(key:string)=>typeof content[key]==='string'?content[key] as string:''
 const list=(key:string)=>Array.isArray(content[key])?(content[key] as unknown[]).filter((v):v is string=>typeof v==='string'):[]
 return <div className="space-y-4">
 <input type="hidden" name="content" value={JSON.stringify(content)}/>
 <AdminField name="section_heading" label="عنوان القسم" required value={string(headingKey)} onChange={e=>change(headingKey,e.target.value)} maxLength={500} hint="عنوان فرعي يظهر فوق نص هذا القسم في الصفحة." example="كيف أستفيد من الجلسة؟"/>
 <AdminTextarea name="section_body" label="نص القسم" required={![...list('paragraphs'),...list('bullets'),...list('items')].some(v=>v.trim())} value={string(bodyKey)} onChange={e=>change(bodyKey,e.target.value)} maxLength={30000} rows={7} hint="النص الذي تقرؤه الزائرة. اكتبي فقرات واضحة دون أكواد." example="تبدأ الجلسة بمناقشة ما يشغلك، ثم تحديد خطوة مناسبة…"/>
 {(['paragraphs','bullets','items'] as const).filter(key=>key in content||key==='paragraphs'||key==='bullets').map(key=><AdminTextarea key={key} name={`section_${key}`} label={key==='paragraphs'?'فقرات إضافية — فقرة في كل سطر':'نقاط القائمة — نقطة في كل سطر'} value={list(key).join('\n')} onChange={e=>change(key,e.target.value.split('\n'))} maxLength={30000} rows={4} hint={key==='paragraphs'?'تظهر الفقرات بعد النص الأساسي. السطر الفارغ لا يظهر.':'تظهر النقاط كقائمة تحت عنوان القسم. اتركيها فارغة إذا لم تحتاجي قائمة.'} example={key==='paragraphs'?'اكتبي فكرة مستقلة في كل سطر':'الموضوع الأول ثم الموضوع الثاني في السطر التالي'}/>)}
 <details className="rounded-xl border border-line bg-ivory/50 p-4"><summary className="cursor-pointer py-2 font-bold text-deep-teal">معاينة القسم قبل الحفظ</summary><h3 className="my-3 text-xl font-bold text-deep-teal">{string(headingKey)}</h3><p className="whitespace-pre-wrap break-words leading-8">{string(bodyKey)}</p>{list('paragraphs').filter(Boolean).map((p,i)=><p key={i} className="mt-3 whitespace-pre-wrap break-words leading-8">{p}</p>)}<ul className="mt-3 list-inside list-disc space-y-2">{[...list('bullets'),...list('items')].filter(Boolean).map((p,i)=><li key={i} className="break-words leading-7">{p}</li>)}</ul></details>
 <p className="text-sm leading-7 text-text-soft">تُحفظ أي بيانات أخرى موجودة لهذا القسم دون تغيير. أقسام الرئيسية لها محررها المخصص للصور والبطاقات والروابط.</p>
 </div>
}
