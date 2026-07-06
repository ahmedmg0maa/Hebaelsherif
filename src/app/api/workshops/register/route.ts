export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertSupabasePublicEnv } from '@/lib/supabase/env'

function bearer(req: NextRequest) {
  const header = req.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
}

function createUserSupabaseClient(token: string): any {
  const { url, anonKey } = assertSupabasePublicEnv()
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('ALREADY_REGISTERED')) return 'أنتِ مسجلة بالفعل في هذه الورشة.'
  if (message.includes('WORKSHOP_NOT_AVAILABLE')) return 'هذه الورشة غير متاحة حاليًا.'
  if (message.includes('REGISTRATION_CLOSED')) return 'التسجيل مغلق لهذه الورشة.'
  if (message.includes('WORKSHOP_ALREADY_STARTED')) return 'بدأت هذه الورشة بالفعل ولا يمكن التسجيل الآن.'
  if (message.includes('UNAUTHENTICATED')) return 'يجب تسجيل الدخول أولًا.'
  return 'تعذر إتمام التسجيل الآن. حاولي مرة أخرى.'
}

export async function POST(req: NextRequest) {
  try {
    const token = bearer(req)
    if (!token) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { workshopId?: unknown; notes?: unknown }
    const workshopId = typeof body.workshopId === 'string' ? body.workshopId.trim() : ''
    if (!/^[0-9a-f-]{36}$/i.test(workshopId)) {
      return NextResponse.json({ error: 'بيانات الورشة غير صحيحة.' }, { status: 400 })
    }

    const userClient = createUserSupabaseClient(token)
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 })
    }

    const profile = userData.user
    const { data, error } = await userClient.rpc('register_workshop_with_lock', {
      p_workshop_id: workshopId,
      payload: {
        name: profile.user_metadata?.full_name || profile.email || '',
        email: profile.email || '',
        phone: profile.user_metadata?.phone || '',
        notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : '',
      },
    })

    if (error) {
      return NextResponse.json({ error: normalizeError(error) }, { status: 400 })
    }

    const result = (data ?? {}) as { registrationId?: string; status?: string }
    return NextResponse.json({ success: true, registrationId: result.registrationId, status: result.status })
  } catch (error) {
    console.error('Workshop register API error:', error)
    return NextResponse.json({ error: 'تعذر إتمام التسجيل الآن.' }, { status: 500 })
  }
}
