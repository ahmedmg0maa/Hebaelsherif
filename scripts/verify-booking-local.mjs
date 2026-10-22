import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

// Isolated contract test for the booking rules in migration 044. It never reads
// .env and never contacts Supabase. Live database verification stays deferred
// until the owner confirms the production project reference.
const now = new Date('2026-08-19T08:00:00.000Z')
const key = (date, time) => `${date} ${time}`
const minutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m }
const day = (date) => new Date(`${date}T12:00:00Z`).getUTCDay()

class LocalBookingSystem {
  constructor() { this.services = new Map(); this.holds = []; this.bookings = []; this.events = []; this.sequence = 0 }
  addService(service) { this.services.set(service.id, service) }
  slots(serviceId, date) {
    const service = this.services.get(serviceId); const policy = service.policy
    const exception = service.exceptions?.[date]
    if (['closed', 'holiday', 'blackout'].includes(exception?.kind)) return []
    const result = []
    for (let value = 0; value < 24 * 60; value += policy.slotInterval) {
      const time = `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
      if (this.available(serviceId, date, time)) result.push(time)
    }
    return result
  }
  available(serviceId, date, time, ignoreBooking, ignoreHold) {
    const service = this.services.get(serviceId); const p = service.policy
    if (!service || !service.published) return false
    const slotStart = minutes(time); const slotEnd = slotStart + service.duration
    const slotAt = new Date(`${date}T${time}:00+03:00`)
    if (slotAt.getTime() < now.getTime() + p.minimumNotice * 60_000) return false
    if ((slotAt.getTime() - now.getTime()) / 86_400_000 > p.windowDays) return false
    const exception = service.exceptions?.[date]
    if (['closed', 'holiday', 'blackout'].includes(exception?.kind)) return false
    const override = service.overrides?.[key(date, time)]
    if (override?.mode === 'closed') return false
    const inRule = (service.rules[day(date)] ?? []).some(([from, to]) => slotStart >= minutes(from) && slotEnd <= minutes(to))
    if (!inRule && override?.mode !== 'open') return false
    if (exception?.kind === 'custom' && (slotStart < minutes(exception.start) || slotEnd > minutes(exception.end))) return false
    const conflicts = [...this.bookings.filter((b) => b.status !== 'cancelled' && b.id !== ignoreBooking), ...this.holds.filter((h) => h.status === 'active' && h.expiresAt > now && h.id !== ignoreHold)]
    return !conflicts.some((item) => item.serviceId === serviceId && item.date === date && slotStart - p.bufferBefore < minutes(item.time) + service.duration + p.bufferAfter && slotEnd + p.bufferAfter > minutes(item.time) - p.bufferBefore)
  }
  hold(userId, serviceId, date, time) {
    assert(this.available(serviceId, date, time), 'SLOT_UNAVAILABLE')
    const id = `hold-${++this.sequence}`; const service = this.services.get(serviceId)
    this.holds.push({ id, userId, serviceId, date, time, status: 'active', expiresAt: new Date(now.getTime() + service.policy.holdMinutes * 60_000) })
    return id
  }
  expire() { for (const hold of this.holds) if (hold.status === 'active' && hold.expiresAt <= now) hold.status = 'expired' }
  confirmFree(userId, holdId) {
    const hold = this.holds.find((item) => item.id === holdId && item.userId === userId)
    assert(hold?.status === 'active' && hold.expiresAt > now, 'HOLD_EXPIRED')
    const service = this.services.get(hold.serviceId); assert(service.paymentMode === 'free', 'PAYMENT_REQUIRED')
    assert(this.available(hold.serviceId, hold.date, hold.time, undefined, hold.id), 'SLOT_UNAVAILABLE')
    hold.status = 'converted'; const booking = { id: `booking-${++this.sequence}`, userId, serviceId: hold.serviceId, date: hold.date, time: hold.time, status: 'confirmed' }
    this.bookings.push(booking); this.events.push({ bookingId: booking.id, event: 'booking.free_confirmed' }); return booking
  }
  cancel(userId, bookingId) { const booking = this.bookings.find((item) => item.id === bookingId && item.userId === userId); assert(booking?.status === 'confirmed', 'BOOKING_CANNOT_BE_CANCELLED'); booking.status = 'cancelled'; this.events.push({ bookingId, event: 'customer.cancelled' }) }
  reschedule(userId, bookingId, date, time) {
    const booking = this.bookings.find((item) => item.id === bookingId && item.userId === userId); assert(booking?.status === 'confirmed', 'BOOKING_CANNOT_BE_RESCHEDULED')
    assert(this.available(booking.serviceId, date, time, booking.id), 'PROPOSED_SLOT_UNAVAILABLE')
    const old = { date: booking.date, time: booking.time }; booking.date = date; booking.time = time; this.events.push({ bookingId, event: 'admin.reschedule_approved', old }); return booking
  }
}

const migration = 'supabase/migrations/044_booking_operational_workflow_local_only.sql'
assert(existsSync(migration), 'migration 044 missing')
const sql = readFileSync(migration, 'utf8')
for (const token of ['booking_holds', 'create_booking_hold', 'create_free_booking_from_hold', 'create_booking_order_from_hold', 'create_package_booking_from_hold', 'available_booking_calendar', 'booking_runtime_contract', 'resolve_booking_reschedule', 'booking_slot_overrides']) assert(sql.includes(token), `migration missing ${token}`)
const hardeningMigration = 'supabase/migrations/045_booking_least_privilege_local_only.sql'
assert(existsSync(hardeningMigration), 'migration 045 missing')
const hardeningSql = readFileSync(hardeningMigration, 'utf8')
for (const token of ['create_booking_order(uuid,date,time,text,text,text)', 'booking_service_policy(uuid)', 'booking_slot_is_available(uuid,date,time,uuid,uuid)', 'drop policy if exists "bookings: own create pending"']) assert(hardeningSql.includes(token), `booking hardening missing ${token}`)

const system = new LocalBookingSystem()
system.addService({
  id: 'clarity', published: true, paymentMode: 'free', duration: 60,
  policy: { slotInterval: 30, bufferBefore: 30, bufferAfter: 30, minimumNotice: 60, windowDays: 21, holdMinutes: 10 },
  rules: { 0: [['10:00', '14:00']] },
  exceptions: { '2026-08-30': { kind: 'blackout' } },
  overrides: { [key('2026-08-24', '18:00')]: { mode: 'open' }, [key('2026-08-23', '11:00')]: { mode: 'closed' } },
})

assert(system.slots('clarity', '2026-08-23').includes('10:00'), 'weekly Cairo availability missing')
assert(!system.slots('clarity', '2026-08-23').includes('11:00'), 'manual close did not remove slot')
assert(system.slots('clarity', '2026-08-24').includes('18:00'), 'manual open did not expose slot')
assert.equal(system.slots('clarity', '2026-08-30').length, 0, 'blackout date leaked slots')
assert(!system.available('clarity', '2026-08-19', '08:30'), 'minimum notice was not enforced')

const concurrent = await Promise.allSettled([Promise.resolve().then(() => system.hold('customer-a', 'clarity', '2026-08-23', '10:00')), Promise.resolve().then(() => system.hold('customer-b', 'clarity', '2026-08-23', '10:00'))])
assert.equal(concurrent.filter((item) => item.status === 'fulfilled').length, 1, 'two windows acquired the same hold')
const holdId = concurrent.find((item) => item.status === 'fulfilled').value
const holdOwner = system.holds.find((hold) => hold.id === holdId).userId
const booking = system.confirmFree(holdOwner, holdId)
assert.equal(booking.status, 'confirmed', 'free booking did not confirm')
assert(!system.available('clarity', '2026-08-23', '11:30'), 'buffer did not block adjacent slot')
system.cancel(holdOwner, booking.id)
assert(system.available('clarity', '2026-08-23', '10:00'), 'cancellation did not release the original slot')
const again = system.confirmFree(holdOwner, system.hold(holdOwner, 'clarity', '2026-08-23', '10:00'))
assert.throws(() => system.confirmFree(holdOwner, holdId), /HOLD_EXPIRED/, 'duplicate submit reused a converted hold')
system.reschedule(holdOwner, again.id, '2026-08-23', '12:00')
assert(system.available('clarity', '2026-08-23', '10:00'), 'reschedule did not release old slot')
assert(!system.available('clarity', '2026-08-23', '12:00'), 'reschedule did not reserve new slot')

const expiringHoldId = system.hold('customer-c', 'clarity', '2026-08-24', '18:00')
const expiringHold = system.holds.find((hold) => hold.id === expiringHoldId)
expiringHold.expiresAt = new Date(now.getTime() - 1)
system.expire()
assert.equal(expiringHold.status, 'expired', 'expired hold remained active')
assert(system.available('clarity', '2026-08-24', '18:00'), 'expired hold did not release its slot')
assert.throws(() => system.confirmFree('customer-c', expiringHoldId), /HOLD_EXPIRED/, 'expired hold was converted')

const cairoOffset = (instant) => new Intl.DateTimeFormat('en', {
  timeZone: 'Africa/Cairo',
  timeZoneName: 'longOffset',
}).formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value
assert.equal(cairoOffset(new Date('2026-01-15T12:00:00Z')), 'GMT+02:00', 'Cairo winter offset changed unexpectedly')
assert.equal(cairoOffset(new Date('2026-07-15T12:00:00Z')), 'GMT+03:00', 'Cairo daylight-saving offset was not handled')
assert(sql.includes("at time zone 'Africa/Cairo'") && sql.includes("'Africa/Cairo')"), 'migration does not anchor booking dates to Cairo time')

console.log('verify:booking-local passed — isolated admin → availability → customer → hold/expiry → booking/duplicate denial → cancellation/reschedule → Cairo DST contract with 045 hardening source present')
