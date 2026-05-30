import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { cleanText, serverError } from '@/lib/admin/server'

const allowedEvents = new Set([
  'view_home', 'click_start_here', 'view_booking', 'submit_booking', 'create_order',
  'submit_payment_proof', 'access_content', 'complete_lesson', 'send_contact', 'join_waitlist',
  'view_course', 'view_book', 'open_dashboard', 'read_book', 'start_course',
])

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const event = cleanText(body.event)
    if (!allowedEvents.has(event)) return NextResponse.json({ success: true, ignored: true })

    let userId = ''
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (token) {
      try {
        const decoded = await getAdminAuth().verifyIdToken(token)
        userId = decoded.uid
      } catch {
        userId = ''
      }
    }

    await getAdminDb().collection('analytics_events').add({
      event,
      userId,
      path: cleanText(body.path),
      source: cleanText(body.source),
      entityType: cleanText(body.entityType),
      entityId: cleanText(body.entityId),
      utmSource: cleanText(body.utmSource),
      utmMedium: cleanText(body.utmMedium),
      utmCampaign: cleanText(body.utmCampaign),
      createdAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Track event error:', error)
    return serverError('تعذر تسجيل الحدث.')
  }
}
