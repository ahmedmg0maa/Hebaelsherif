'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/permissions'
import { getServiceClient } from '@/lib/supabase/server'

type Result = { ok: true } | { ok: false; error: string }

function refresh() {
  revalidatePath('/admin/services')
  revalidatePath('/admin/bookings')
  revalidatePath('/booking')
  revalidatePath('/services')
}

function governanceError(message: string, fallback: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('coach_schedule_conflict')) return 'لم يُحفظ التعديل لأنه يغلق وقت حجز قائم أو حجز مؤقت. راجعي أجندة الحجوزات وانقلي الموعد أولًا أو اختاري فترة أخرى. لم يُلغَ أي حجز.'
  if (normalized.includes('coach_working_hours')) return 'يجب أن تقع الجلسة وفترتا الراحة كاملتين داخل ساعات عمل هبة، وبعيدًا عن الفترات المغلقة.'
  if (normalized.includes('permission_required')) return 'انتهت صلاحية الجلسة الإدارية أو لا تملكين الصلاحية المطلوبة.'
  if (normalized.includes('not_found')) return 'لم يعد السجل المطلوب موجودًا. حدّثي الصفحة وحاولي مجددًا.'
  if (normalized.includes('overlap') || normalized.includes('unavailable') || normalized.includes('23p01')) return 'الوقت المختار غير متاح أو يتداخل مع موعد قائم.'
  if (normalized.includes('transition_invalid')) return 'هذا الانتقال بين حالات الحجز غير مسموح.'
  if (normalized.includes('invalid')) return 'راجعي القيم المدخلة ثم حاولي مجددًا.'
  return fallback
}

export async function saveAvailabilityException(formData: FormData): Promise<Result> {
  const admin = await requirePermission('availability.manage')
  if (!admin) return { ok: false, error: 'لا تملكين صلاحية إدارة الإتاحة.' }
  const serviceId = String(formData.get('service_id') ?? '')
  const date = String(formData.get('date') ?? '')
  const mode = String(formData.get('mode') ?? 'closed')
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500)
  const startTime = String(formData.get('exception_start') ?? '') || null
  const endTime = String(formData.get('exception_end') ?? '') || null
  if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'اختاري تاريخًا صحيحًا.' }
  if (!['closed', 'custom', 'holiday', 'blackout'].includes(mode)) return { ok: false, error: 'نوع الاستثناء غير صحيح.' }
  if (mode === 'custom' && (!startTime || !endTime || startTime >= endTime))
    return { ok: false, error: 'حددي وقتًا استثنائيًا صحيحًا.' }
  const { error } = await getServiceClient().rpc('admin_upsert_availability_exception', {
    p_actor_id: admin.userId,
    p_service_id: serviceId,
    p_date: date,
    p_kind: mode,
    p_start_time: mode === 'custom' ? startTime : null,
    p_end_time: mode === 'custom' ? endTime : null,
    p_reason: reason,
  })
  if (error) return { ok: false, error: governanceError(error.message, 'تعذّر حفظ الاستثناء.') }
  refresh()
  return { ok: true }
}

export async function saveBookingSlotOverride(formData: FormData): Promise<Result> {
  const admin = await requirePermission('availability.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة الإتاحة.' }
  const serviceId = String(formData.get('service_id') ?? '')
  const date = String(formData.get('date') ?? '')
  const startTime = String(formData.get('start_time') ?? '')
  const mode = String(formData.get('mode') ?? '')
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500)
  if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !['open', 'closed'].includes(mode))
    return { ok: false, error: 'اختاري تاريخًا ووقتًا صحيحين، وحددي فتح الموعد أو إغلاقه.' }
  const { error } = await getServiceClient().rpc('admin_upsert_booking_slot_override', {
    p_actor_id: admin.userId,
    p_service_id: serviceId,
    p_date: date,
    p_start_time: startTime,
    p_mode: mode,
    p_reason: reason,
  })
  if (error) return { ok: false, error: governanceError(error.message, 'تعذّر حفظ تعديل الموعد اليدوي.') }
  refresh(); return { ok: true }
}

export async function deleteBookingSlotOverride(overrideId: string): Promise<Result> {
  const admin = await requirePermission('availability.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة الإتاحة.' }
  const { error } = await getServiceClient().rpc('admin_delete_booking_slot_override', {
    p_actor_id: admin.userId,
    p_override_id: overrideId,
  })
  if (error) return { ok: false, error: governanceError(error.message, 'تعذّر حذف تعديل الموعد اليدوي.') }
  refresh(); return { ok: true }
}

export async function resolveBookingReschedule(requestId: string, approve: boolean, note = ''): Promise<Result> {
  const admin = await requirePermission('bookings.manage')
  if (!admin) return { ok: false, error: 'لا تملكين صلاحية إدارة الحجوزات.' }
  const { error } = await getServiceClient().rpc('resolve_booking_reschedule_governed', {
    p_actor_id: admin.userId,
    p_request_id: requestId,
    p_approve: approve,
    p_admin_note: note.trim().slice(0, 1000),
  })
  if (error) return { ok: false, error: governanceError(error.message, 'تعذّر حسم طلب تغيير الموعد.') }
  refresh(); revalidatePath('/dashboard/bookings')
  return { ok: true }
}

export async function deleteAvailabilityException(exceptionId: string): Promise<Result> {
  const admin = await requirePermission('availability.manage')
  if (!admin) return { ok: false, error: 'لا تملكين صلاحية إدارة الإتاحة.' }
  const { error } = await getServiceClient().rpc('admin_delete_availability_exception', {
    p_actor_id: admin.userId,
    p_exception_id: exceptionId,
  })
  if (error) return { ok: false, error: governanceError(error.message, 'تعذّر حذف الاستثناء.') }
  refresh()
  return { ok: true }
}

export async function saveAvailabilityWindow(formData: FormData): Promise<Result> {
  const admin = await requirePermission('availability.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة الإتاحة.' }
  const serviceId = String(formData.get('service_id') ?? '')
  const weekday = Number(formData.get('weekday'))
  const startTime = String(formData.get('start_time') ?? '')
  const endTime = String(formData.get('end_time') ?? '')
  if (!serviceId || !Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !validTime(startTime) || !validTime(endTime) || startTime >= endTime) return { ok: false, error: 'راجعي اليوم وبداية الفترة ونهايتها؛ النهاية يجب أن تأتي بعد البداية.' }
  const { error } = await getServiceClient().rpc('admin_create_availability_window', {
    p_actor_id: admin.userId,
    p_service_id: serviceId,
    p_weekday: weekday,
    p_start_time: startTime,
    p_end_time: endTime,
  })
  if (error) return { ok: false, error: governanceError(error.message, 'تعذّر حفظ نافذة الإتاحة.') }
  refresh(); return { ok: true }
}

export async function deleteAvailabilityWindow(windowId: string): Promise<Result> {
  const admin = await requirePermission('availability.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة الإتاحة.' }
  const { error } = await getServiceClient().rpc('admin_delete_availability_window', {
    p_actor_id: admin.userId,
    p_window_id: windowId,
  })
  if (error) return { ok: false, error: governanceError(error.message, 'تعذّر حذف نافذة الإتاحة.') }
  refresh(); return { ok: true }
}

const validTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s

export async function saveCoachHours(form: FormData): Promise<Result> {
 const admin=await requirePermission('availability.manage')
 if(!admin) return {ok:false,error:'لا تملكين صلاحية إدارة المواعيد.'}
 const hours=Array.from({length:7},(_,weekday)=>({weekday,is_open:form.get(`open_${weekday}`)==='on',start_time:String(form.get(`start_${weekday}`)??''),end_time:String(form.get(`end_${weekday}`)??'')}))
 if(hours.some(h=>!validTime(h.start_time)||!validTime(h.end_time)||h.start_time>=h.end_time)) return {ok:false,error:'راجعي ساعات كل يوم. اكتبي بداية ونهاية صحيحتين، والنهاية بعد البداية.'}
 const {error}=await getServiceClient().rpc('admin_save_coach_hours',{p_actor_id:admin.userId,p_hours:hours})
 if(error) return {ok:false,error:governanceError(error.message,'تعذّر حفظ جدول العمل. لم تتغير المواعيد.')}
 refresh();return {ok:true}
}
export async function saveCoachException(form: FormData): Promise<Result> {
 const admin=await requirePermission('availability.manage')
 if(!admin) return {ok:false,error:'لا تملكين صلاحية إدارة المواعيد.'}
 const date=String(form.get('date')??''),kind=String(form.get('kind')??''),wholeDay=form.get('whole_day')==='on'
 const start=wholeDay?'00:00':String(form.get('start_time')??''),end=wholeDay?'24:00':String(form.get('end_time')??''),reason=String(form.get('reason')??'').trim()
 if(!validDate(date)||!['open','closed'].includes(kind)||(!validTime(start))||(!validTime(end)&&!(wholeDay&&end==='24:00'))||start>=end||reason.length>500|| (wholeDay&&kind!=='closed')) return {ok:false,error:'اختاري تاريخًا ونوعًا وفترة صحيحة. إغلاق اليوم الكامل متاح للإغلاق فقط، والسبب بحد أقصى 500 حرف.'}
 const {error}=await getServiceClient().rpc('admin_save_coach_exception',{p_actor_id:admin.userId,p_date:date,p_kind:kind,p_start:start,p_end:end,p_reason:reason})
 if(error)return {ok:false,error:governanceError(error.message,'تعذّر حفظ الفترة الاستثنائية.')}
 refresh();return {ok:true}
}
export async function deleteCoachException(id: string): Promise<Result> {
 const admin=await requirePermission('availability.manage')
 if(!admin)return {ok:false,error:'لا تملكين صلاحية إدارة المواعيد.'}
 const {error}=await getServiceClient().rpc('admin_delete_coach_exception',{p_actor_id:admin.userId,p_id:id})
 if(error)return {ok:false,error:governanceError(error.message,'تعذّرت استعادة الجدول المعتاد.')}
 refresh();return {ok:true}
}
