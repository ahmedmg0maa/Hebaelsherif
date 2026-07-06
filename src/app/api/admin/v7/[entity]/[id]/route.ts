export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminDb } from '@/lib/supabase/admin-compat'
import { adminErrorResponse, requireAdminSession } from '@/lib/server/admin-auth'
import { writeAdminLog } from '@/lib/server/audit'
import { V7_ENTITIES } from '@/lib/admin/v7-entities'

const UUID_RE = /^[0-9a-f-]{36}$/i

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params
  try {
    const config = V7_ENTITIES[entity]
    if (!config || !UUID_RE.test(id)) return NextResponse.json({ success: false, error: 'العنصر غير موجود.' }, { status: 404 })
    const session = await requireAdminSession(req, config.roles)

    const body = await req.json().catch(() => ({}))
    const partialSchema = (config.schema as unknown as { partial: () => typeof config.schema }).partial()
    const parsed = partialSchema.safeParse(body)
    if (!parsed.success || Object.keys(parsed.data as Record<string, unknown>).length === 0) {
      return NextResponse.json({ success: false, error: 'لا توجد تعديلات صالحة.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: before } = await supabase.from(config.table).select('*').eq('id', id).maybeSingle()
    if (!before) return NextResponse.json({ success: false, error: 'العنصر غير موجود.' }, { status: 404 })

    const { data, error } = await supabase.from(config.table).update(parsed.data).eq('id', id).select().single()
    if (error) throw error

    await writeAdminLog(getAdminDb(), {
      session,
      action: `${entity}_updated`,
      targetType: config.table,
      targetId: id,
      before: before as Record<string, unknown>,
      after: parsed.data as Record<string, unknown>,
    })

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    console.error(`Admin v7 update error (${entity}):`, error)
    const { status, error: translated } = adminErrorResponse(error)
    return NextResponse.json({ success: false, error: translated }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params
  try {
    const config = V7_ENTITIES[entity]
    if (!config || !UUID_RE.test(id)) return NextResponse.json({ success: false, error: 'العنصر غير موجود.' }, { status: 404 })
    const session = await requireAdminSession(req, config.roles)

    const supabase = createSupabaseAdminClient()
    const { data: before } = await supabase.from(config.table).select('*').eq('id', id).maybeSingle()
    if (!before) return NextResponse.json({ success: false, error: 'العنصر غير موجود.' }, { status: 404 })

    const { error } = await supabase.from(config.table).delete().eq('id', id)
    if (error) throw error

    await writeAdminLog(getAdminDb(), {
      session,
      action: `${entity}_deleted`,
      targetType: config.table,
      targetId: id,
      before: before as Record<string, unknown>,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Admin v7 delete error (${entity}):`, error)
    const { status, error: translated } = adminErrorResponse(error)
    return NextResponse.json({ success: false, error: translated }, { status })
  }
}
