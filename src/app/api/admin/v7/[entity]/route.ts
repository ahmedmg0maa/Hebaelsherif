export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminDb } from '@/lib/supabase/admin-compat'
import { adminErrorResponse, requireAdminSession } from '@/lib/server/admin-auth'
import { writeAdminLog } from '@/lib/server/audit'
import { V7_ENTITIES } from '@/lib/admin/v7-entities'

export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params
  try {
    const config = V7_ENTITIES[entity]
    if (!config) return NextResponse.json({ success: false, error: 'القسم غير موجود.' }, { status: 404 })
    await requireAdminSession(req, config.roles)

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from(config.table)
      .select(config.listColumns)
      .order(config.orderBy, { ascending: false })
      .limit(300)

    if (error) throw error
    return NextResponse.json({ success: true, items: data ?? [] })
  } catch (error) {
    console.error(`Admin v7 list error (${entity}):`, error)
    const { status, error: translated } = adminErrorResponse(error)
    return NextResponse.json({ success: false, error: translated }, { status })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params
  try {
    const config = V7_ENTITIES[entity]
    if (!config) return NextResponse.json({ success: false, error: 'القسم غير موجود.' }, { status: 404 })
    const session = await requireAdminSession(req, config.roles)

    const body = await req.json().catch(() => ({}))
    const parsed = config.schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'البيانات غير مكتملة أو غير صحيحة.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.from(config.table).insert(parsed.data).select().single()
    if (error) {
      if (String((error as { code?: string }).code) === '23505') {
        return NextResponse.json({ success: false, error: 'يوجد عنصر بنفس الكود/الرابط بالفعل.' }, { status: 409 })
      }
      throw error
    }

    await writeAdminLog(getAdminDb(), {
      session,
      action: `${entity}_created`,
      targetType: config.table,
      targetId: String((data as Record<string, unknown>).id),
      after: parsed.data as Record<string, unknown>,
    })

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    console.error(`Admin v7 create error (${entity}):`, error)
    const { status, error: translated } = adminErrorResponse(error)
    return NextResponse.json({ success: false, error: translated }, { status })
  }
}
