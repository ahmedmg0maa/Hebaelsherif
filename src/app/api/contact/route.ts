import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase/admin'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: unknown; email?: unknown; phone?: unknown; topic?: unknown; message?: unknown }
    const name = clean(body.name)
    const email = clean(body.email).toLowerCase()
    const phone = clean(body.phone)
    const topic = clean(body.topic) || 'استفسار عام'
    const message = clean(body.message)

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'اكتبي الاسم بشكل صحيح.' }, { status: 400 })
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'اكتبي بريدًا إلكترونيًا صحيحًا.' }, { status: 400 })
    }

    if (!message || message.length < 10) {
      return NextResponse.json({ error: 'اكتبي رسالتك بتفاصيل كافية.' }, { status: 400 })
    }

    const db = getAdminDb()
    const now = Timestamp.now()

    await db.collection('contact_messages').add({
      name,
      email,
      phone,
      topic,
      message,
      status: 'new',
      source: 'contact_page',
      createdAt: now,
      updatedAt: now,
    })

    await db.collection('admin_logs').add({
      adminId: 'system',
      action: 'contact_message_created',
      targetType: 'contact_message',
      after: { email, topic },
      createdAt: now,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json({ error: 'لم نتمكن من إرسال الرسالة الآن. حاولي مرة أخرى بعد قليل.' }, { status: 500 })
  }
}
