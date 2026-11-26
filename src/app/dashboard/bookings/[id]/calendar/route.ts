import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { isUuid } from '@/lib/delivery/security'

const privateHeaders = {
  'cache-control': 'private, no-store',
  pragma: 'no-cache',
  expires: '0',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'content-language': 'ar',
}

function privateResponse(message: string, status: number) {
  return new NextResponse(message, { status, headers: privateHeaders })
}

function icsText(value: string) {
  return value.replace(/[\\,;\n\r]/g, (character) => character === '\n' || character === '\r' ? '\\n' : `\\${character}`)
}

function icsDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function foldIcsLine(line: string) {
  const encoder = new TextEncoder()
  const output: string[] = ['']
  let octets = 0
  for (const character of line) {
    const size = encoder.encode(character).byteLength
    if (octets + size > 75) {
      output.push(` ${character}`)
      octets = 1 + size
    } else {
      output[output.length - 1] += character
      octets += size
    }
  }
  return output.join('\r\n')
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabasePublicConfig()) return privateResponse('التقويم غير متاح في هذه البيئة.', 404)
  const { id } = await params
  if (!isUuid(id)) return privateResponse('الحجز غير موجود.', 404)
  const supabase = await getServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return privateResponse('سجّلي الدخول أولًا.', 401)
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, starts_at, ends_at, status, services!inner(title)')
    .eq('id', id)
    .eq('user_id', user.id)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()
  if (error) return privateResponse('تعذّر التحقق من الحجز الآن.', 503)
  if (!booking) return privateResponse('الحجز غير موجود.', 404)
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
  const stamp = icsDate(new Date().toISOString())
  const startsAt = icsDate(booking.starts_at)
  const endsAt = icsDate(booking.ends_at)
  if (!stamp || !startsAt || !endsAt || new Date(booking.ends_at) <= new Date(booking.starts_at)) {
    return privateResponse('تعذّر إنشاء ملف التقويم لهذا الحجز.', 503)
  }
  const tentative = booking.status === 'pending'
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Heba ElSherif//Booking//AR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:booking-${booking.id}@hebaelsherif.com`, `DTSTAMP:${stamp}`, `DTSTART:${startsAt}`, `DTEND:${endsAt}`,
    `STATUS:${tentative ? 'TENTATIVE' : 'CONFIRMED'}`, 'TRANSP:OPAQUE', 'SEQUENCE:0',
    `SUMMARY:${icsText(`${tentative ? 'بانتظار التأكيد — ' : ''}${service?.title ?? 'جلسة'}`)}`,
    'DESCRIPTION:موعد عبر منصة هبة الشريف. الأوقات محفوظة بتوقيت القاهرة وتُصدّر بصيغة UTC.', 'END:VEVENT', 'END:VCALENDAR', '',
  ].map(foldIcsLine).join('\r\n')
  return new NextResponse(body, { headers: {
    ...privateHeaders,
    'content-type': 'text/calendar; charset=utf-8',
    'content-disposition': `attachment; filename="booking-${booking.id}.ics"`,
  } })
}
