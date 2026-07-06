export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminDb } from '@/lib/supabase/admin-compat'
import { adminErrorResponse, requireAdminSession, writeRoles } from '@/lib/server/admin-auth'
import { writeAdminLog } from '@/lib/server/audit'

const UUID_RE = /^[0-9a-f-]{36}$/i
const ALLOWED_STATUSES = new Set(['pending', 'payment_submitted', 'confirmed', 'waitlisted', 'cancelled', 'rejected', 'attended'])

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    if (!UUID_RE.test(id)) return NextResponse.json({ success: false, error: 'الورشة غير موجودة.' }, { status: 404 })
    await requireAdminSession(req, writeRoles)

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('workshop_registrations')
      .select('id,user_id,customer_name,customer_email,customer_phone,status,payment_status,amount,notes,admin_notes,created_at')
      .eq('workshop_id', id)
      .order('created_at', { ascending: true })
    if (error) throw error

    return NextResponse.json({ success: true, items: data ?? [] })
  } catch (error) {
    console.error('Admin workshop registrations list error:', error)
    const { status, error: translated } = adminErrorResponse(error)
    return NextResponse.json({ success: false, error: translated }, { status })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    if (!UUID_RE.test(id)) return NextResponse.json({ success: false, error: 'الورشة غير موجودة.' }, { status: 404 })
    const session = await requireAdminSession(req, writeRoles)

    const body = (await req.json().catch(() => ({}))) as { registrationId?: unknown; status?: unknown; adminNotes?: unknown }
    const registrationId = typeof body.registrationId === 'string' ? body.registrationId : ''
    const nextStatus = typeof body.status === 'string' ? body.status : ''
    if (!UUID_RE.test(registrationId)) return NextResponse.json({ success: false, error: 'التسجيل غير موجود.' }, { status: 400 })

    const update: Record<string, unknown> = {}
    if (nextStatus) {
      if (!ALLOWED_STATUSES.has(nextStatus)) return NextResponse.json({ success: false, error: 'الحالة غير صحيحة.' }, { status: 400 })
      update.status = nextStatus
      if (nextStatus === 'confirmed') update.payment_status = 'confirmed'
    }
    if (typeof body.adminNotes === 'string') update.admin_notes = body.adminNotes.slice(0, 1000)
    if (Object.keys(update).length === 0) return NextResponse.json({ success: false, error: 'لا توجد تعديلات.' }, { status: 400 })

    const supabase = createSupabaseAdminClient()
    const { data: before } = await supabase
      .from('workshop_registrations')
      .select('id,workshop_id,user_id,status,payment_status')
      .eq('id', registrationId)
      .eq('workshop_id', id)
      .maybeSingle()
    if (!before) return NextResponse.json({ success: false, error: 'التسجيل غير موجود.' }, { status: 404 })

    const { data, error } = await supabase
      .from('workshop_registrations')
      .update(update)
      .eq('id', registrationId)
      .select()
      .single()
    if (error) throw error

    if (nextStatus && before.user_id) {
      const titles: Record<string, [string, string]> = {
        confirmed: ['تم تأكيد مقعدك في الورشة', 'تم تأكيد تسجيلك. ستجدين تفاصيل الحضور داخل لوحتك قبل الموعد.'],
        rejected: ['تمت مراجعة تسجيل الورشة', 'تعذر تأكيد التسجيل. تواصلي معنا إذا كان لديك استفسار.'],
        cancelled: ['تم إلغاء تسجيل الورشة', 'تم إلغاء تسجيلك في الورشة.'],
        waitlisted: ['أنتِ في قائمة الانتظار', 'سنخبرك فور توفر مقعد في الورشة.'],
      }
      const note = titles[nextStatus]
      if (note) {
        await supabase.from('notifications').insert({
          user_id: before.user_id,
          audience: 'user',
          type: `workshop_${nextStatus}`,
          title: note[0],
          body: note[1],
          href: '/dashboard',
        })
      }
    }

    await writeAdminLog(getAdminDb(), {
      session,
      action: 'workshop_registration_updated',
      targetType: 'workshop_registrations',
      targetId: registrationId,
      before: before as Record<string, unknown>,
      after: update,
    })

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    console.error('Admin workshop registration update error:', error)
    const { status, error: translated } = adminErrorResponse(error)
    return NextResponse.json({ success: false, error: translated }, { status })
  }
}
