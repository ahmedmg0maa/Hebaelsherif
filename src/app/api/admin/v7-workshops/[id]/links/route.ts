export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminDb } from '@/lib/supabase/admin-compat'
import { adminErrorResponse, contentRoles, requireAdminSession } from '@/lib/server/admin-auth'
import { writeAdminLog } from '@/lib/server/audit'

const UUID_RE = /^[0-9a-f-]{36}$/i

function cleanUrl(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^https:\/\//i.test(trimmed)) return undefined
  return trimmed.slice(0, 800)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    if (!UUID_RE.test(id)) return NextResponse.json({ success: false, error: 'الورشة غير موجودة.' }, { status: 404 })
    await requireAdminSession(req, contentRoles)

    const supabase = createSupabaseAdminClient()
    const { data } = await supabase.from('workshop_access_links').select('*').eq('workshop_id', id).maybeSingle()
    return NextResponse.json({ success: true, item: data ?? { workshop_id: id, live_url: null, replay_url: null } })
  } catch (error) {
    const { status, error: translated } = adminErrorResponse(error)
    return NextResponse.json({ success: false, error: translated }, { status })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    if (!UUID_RE.test(id)) return NextResponse.json({ success: false, error: 'الورشة غير موجودة.' }, { status: 404 })
    const session = await requireAdminSession(req, contentRoles)

    const body = (await req.json().catch(() => ({}))) as { liveUrl?: unknown; replayUrl?: unknown }
    const liveUrl = cleanUrl(body.liveUrl)
    const replayUrl = cleanUrl(body.replayUrl)
    if (liveUrl === undefined || replayUrl === undefined) {
      return NextResponse.json({ success: false, error: 'الروابط يجب أن تبدأ بـ https.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: workshop } = await supabase.from('workshops').select('id,title_ar').eq('id', id).maybeSingle()
    if (!workshop) return NextResponse.json({ success: false, error: 'الورشة غير موجودة.' }, { status: 404 })

    const { data, error } = await supabase
      .from('workshop_access_links')
      .upsert({ workshop_id: id, live_url: liveUrl, replay_url: replayUrl, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error

    await writeAdminLog(getAdminDb(), {
      session,
      action: 'workshop_links_saved',
      targetType: 'workshop_access_links',
      targetId: id,
      after: { live_url: Boolean(liveUrl), replay_url: Boolean(replayUrl) },
      message: `روابط ورشة: ${(workshop as { title_ar?: string }).title_ar || id}`,
    })

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    console.error('Admin workshop links error:', error)
    const { status, error: translated } = adminErrorResponse(error)
    return NextResponse.json({ success: false, error: translated }, { status })
  }
}
