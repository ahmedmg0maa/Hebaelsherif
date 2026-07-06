export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

export async function GET() {
  try {
    const { url, anonKey } = getSupabasePublicEnv()
    if (!url || !anonKey) return NextResponse.json({ success: true, offer: null })

    const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const nowIso = new Date().toISOString()
    const { data } = await supabase
      .from('offers')
      .select('id,title_ar,description_ar,discount_type,discount_value,ends_at,countdown_enabled,target_type,public_coupon_code,badge_text_ar,cta_label_ar,cta_href')
      .eq('status', 'active')
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ success: true, offer: data ?? null })
  } catch {
    return NextResponse.json({ success: true, offer: null })
  }
}
