import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './public-config.mjs'

const { url, key: anonKey } = getSupabasePublicConfig()
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) throw new Error('Missing Supabase service environment variable')

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const email = `codex-booking-${randomUUID()}@example.com`
const password = `Codex!${randomUUID()}Aa7`
let userId
let orderId
let bookingId
let verified = false

try {
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'حجز اختبار ذري' },
  })
  if (created.error || !created.data.user) throw created.error ?? new Error('QA user was not created')
  userId = created.data.user.id

  const { data: services, error: serviceError } = await service
    .from('services')
    .select('id, availability_rules(weekday,start_time), availability_exceptions(date,is_closed)')
    .eq('is_active', true)
    .limit(1)
  if (serviceError || !services?.[0]) throw serviceError ?? new Error('No active service')

  const selectedService = services[0]
  const rule = [...(selectedService.availability_rules ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time))[0]
  if (!rule) throw new Error('No availability rule for the active service')
  const closed = new Set(
    (selectedService.availability_exceptions ?? []).filter((item) => item.is_closed).map((item) => item.date),
  )
  const now = new Date()
  let date
  for (let offset = 7; offset <= 28; offset += 1) {
    const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, 12))
    const iso = candidate.toISOString().slice(0, 10)
    if (candidate.getUTCDay() === rule.weekday && !closed.has(iso)) {
      date = iso
      break
    }
  }
  if (!date) throw new Error('No QA date found inside the booking window')

  const customer = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const signedIn = await customer.auth.signInWithPassword({ email, password })
  if (signedIn.error) throw signedIn.error

  const rate = await customer.rpc('consume_action_rate_limit', {
    p_scope: 'coupon',
    p_max_hits: 10,
    p_window_seconds: 300,
  })
  if (rate.error || rate.data?.allowed !== true) throw rate.error ?? new Error('Durable rate limiter rejected first hit')

  const booked = await customer.rpc('create_booking_order', {
    p_service_id: selectedService.id,
    p_date: date,
    p_time: rule.start_time,
    p_full_name: 'حجز اختبار ذري',
    p_phone: '01000000001',
    p_notes: 'QA — deleted automatically',
  })
  if (booked.error || !booked.data) throw booked.error ?? new Error('Atomic booking RPC returned no data')
  orderId = booked.data.orderId
  bookingId = booked.data.bookingId

  const [{ data: order }, { data: booking }] = await Promise.all([
    service.from('orders').select('id,user_id,total,status').eq('id', orderId).single(),
    service.from('bookings').select('id,user_id,order_id,status,starts_at,ends_at').eq('id', bookingId).single(),
  ])
  if (!order || !booking || order.user_id !== userId || booking.user_id !== userId || booking.order_id !== order.id)
    throw new Error('Atomic booking/order relationship verification failed')

  verified = true
} finally {
  if (bookingId) await service.from('bookings').delete().eq('id', bookingId)
  if (orderId) {
    await service.from('order_items').delete().eq('order_id', orderId)
    await service.from('orders').delete().eq('id', orderId)
  }
  if (userId) {
    await service.from('audit_logs').delete().eq('actor_id', userId)
    await service.from('action_rate_limits').delete().eq('user_id', userId)
    const deleted = await service.auth.admin.deleteUser(userId)
    if (deleted.error) throw deleted.error
  }
}

if (verified) console.log(JSON.stringify({ atomicBooking: true, durableRateLimit: true, linkedOrder: true, cleanup: true }))
