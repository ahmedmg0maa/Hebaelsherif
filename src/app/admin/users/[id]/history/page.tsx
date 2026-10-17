import Link from 'next/link'
import {notFound} from 'next/navigation'
import {requirePermission} from '@/lib/auth/permissions'
import {getServiceClient} from '@/lib/supabase/server'
import {adminCustomerHistory,CUSTOMER_HISTORY_KINDS} from '@/lib/data/admin-customer-history'
import type {AdminPageQuery} from '@/lib/data/admin-pagination'
import {AdminListTools} from '@/components/admin/AdminListTools'
import {AdminSelect} from '@/components/admin/AdminField'
import {CustomerNoteControl,CustomerTagControl} from '@/components/admin/Customer360Actions'
import {formatPrice} from '@/lib/format'
const fmt=new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'})
const states:Record<string,string>={active:'نشط',archived:'مؤرشف',pending:'بانتظار المراجعة',pending_payment:'بانتظار الدفع',awaiting_review:'قيد مراجعة الدفع',paid:'مدفوع',cancelled:'ملغى',expired:'انتهت صلاحيته',refunded:'مسترد',refund_pending:'استرداد قيد المراجعة',approved:'مقبول',rejected:'مرفوض',confirmed:'مؤكد',completed:'مكتمل',no_show:'لم تحضر',paused:'متوقف'}
export default async function CustomerHistoryPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<AdminPageQuery>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound()
 const actor=await requirePermission('users.view',{redirectOnFailure:true});if(!actor?.userId)throw Error('ADMIN_CUSTOMER_ACCESS_UNAVAILABLE')
 const query=await searchParams
 let result
 try{result=await adminCustomerHistory(actor.userId,id,query)}catch(error){if(error instanceof Error&&error.message==='ADMIN_CUSTOMER_MISSING')notFound();throw error}
 const {data:canManage,error:permissionError}=await getServiceClient().rpc('has_permission',{permission_name:'users.manage',uid:actor.userId})
 if(permissionError)throw Error('ADMIN_CUSTOMER_PERMISSION_READ_UNAVAILABLE')
 return <main className="mx-auto max-w-5xl space-y-6"><header><Link href={`/admin/users/${id}`} className="inline-flex min-h-12 items-center underline">العودة إلى ملف العميلة</Link><h1 className="text-3xl font-bold text-deep-teal">سجل العميلة الكامل</h1><p className="mt-3 text-sm leading-7 text-text-soft">تصفحي السجلات الأقدم بالبحث والصفحات. هذه قراءة مسجلة بالصلاحية؛ لا تُغيّر حالة طلب أو دفع أو حجز.</p></header><form method="get" className="flex flex-wrap items-end gap-3"><AdminSelect name="kind" label="نوع السجل" defaultValue={result.kind} hint="يفتح سجلًا مستقلًا للعميلة نفسها، ويبدأ البحث من الصفحة الأولى." example="الملاحظات الداخلية للعثور على ملاحظة قديمة" options={Object.entries(CUSTOMER_HISTORY_KINDS).map(([value,label])=>({value,label}))}/><button className="min-h-12 rounded-full bg-deep-teal px-5 font-bold text-on-dark">عرض السجل</button></form><AdminListTools result={result} query={{...query,kind:result.kind}} label={CUSTOMER_HISTORY_KINDS[result.kind]} searchLabel="بحث في هذا السجل" example={result.kind==='notes'?'جزء من نص الملاحظة':'جزء من العنوان أو رقم السجل'} statuses={result.kind==='notes'?[{value:'active',label:'نشطة'},{value:'archived',label:'مؤرشفة'}]:[]}/><section className="space-y-3">{result.rows.map(row=><article key={row.id} className="space-y-2 rounded-2xl border border-line bg-surface-raised p-4"><p className="text-sm font-bold text-deep-teal">{row.title||CUSTOMER_HISTORY_KINDS[result.kind]} · {states[row.status]||row.status}</p><p className="text-sm text-text-soft">{fmt.format(new Date(row.created_at))}</p>{row.note&&<p className="whitespace-pre-wrap break-words text-sm leading-7">{row.note}</p>}{(row.total!==undefined||row.amount!==undefined)&&<p>{formatPrice(Number(row.total??row.amount),row.currency||'EGP')}</p>}{row.ends_at&&<p className="text-sm">تنتهي في: {fmt.format(new Date(row.ends_at))}</p>}{row.note&&canManage===true&&<CustomerNoteControl userId={id} noteId={row.id} archived={Boolean(row.archived_at)}/>}{result.kind==='tags'&&row.title&&canManage===true&&<CustomerTagControl userId={id} tagId={row.id} label={row.title}/>}<p className="break-all text-xs text-text-soft" dir="ltr">{row.id}</p></article>)}</section></main>
}
