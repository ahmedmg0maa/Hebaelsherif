import { NextRequest } from 'next/server'
import { cleanText, jsonError, jsonSuccess, requireUser, trackEvent } from '@/lib/server/admin-guard'

const allowedEvents = new Set([
  'view_home',
  'click_start_here',
  'view_booking',
  'submit_booking',
  'create_order',
  'submit_payment_proof',
  'access_content',
  'complete_lesson',
  'send_contact',
  'join_waitlist',
  'read_book',
])

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: unknown; source?: unknown; properties?: Record<string, unknown> }
    const name = cleanText(body.name, 80)
    if (!allowedEvents.has(name)) return jsonError('حدث غير مدعوم.', 400)

    let userId = ''
    const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
    if (token) {
      const user = await requireUser(req)
      if (!(user instanceof Response)) userId = user.uid
    }

    const db = userId ? (await requireUser(req)) : null
    const serverDb = db && !(db instanceof Response) ? db.db : (await import('@/lib/firebase/admin')).getAdminDb()
    await trackEvent({ db: serverDb, userId, name, source: cleanText(body.source, 80) || 'client', properties: body.properties || {} })
    return jsonSuccess()
  } catch (error) {
    console.error('Events API error:', error)
    return jsonError('تعذر تسجيل الحدث الآن.', 500)
  }
}
