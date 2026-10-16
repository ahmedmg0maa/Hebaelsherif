'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/permissions'
import { getServiceClient } from '@/lib/supabase/server'

type Result = { ok: true } | { ok: false; error: string }

function refresh() {
  revalidatePath('/admin/bookings')
  revalidatePath('/booking')
  revalidatePath('/services')
}

function governanceError(message: string, fallback: string): string {
  const normalized = message.toLowerCase()
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
    return { ok: false, error: 'راجعي تاريخ ووقت وحالة الـ slot.' }
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
  if (!serviceId || weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) return { ok: false, error: 'راجعي اليوم وبداية النافذة ونهايتها.' }
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
