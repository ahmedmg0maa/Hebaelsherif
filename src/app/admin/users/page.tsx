'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Booking, Order, User } from '@/types'
import { formatArabicDateTime, formatEGP, formatNumber } from '@/lib/utils/formatters'
import { getAmount, isPaidOrder, toMillis } from '@/lib/admin/operations'
import {
  AdminActionButton,
  AdminPageHeader,
  AdminPanel,
  EmptyState,
  Field,
  inputClass,
  MetricCard,
  ToneBadge,
} from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { runAdminAction } from '@/lib/admin/client'

interface UserItem extends User {
  disabled?: boolean
  lastLoginAt?: unknown
  displayName?: string
  photoURL?: string
}

function mapDocs<T>(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...(docItem.data() as Record<string, unknown>),
  })) as T[]
}

export default function AdminUsersPage() {
  const { firebaseUser } = useAuth()
  const [users, setUsers] = useState<UserItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [usersSnap, ordersSnap, bookingsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'bookings')),
      ])
      setUsers(
        mapDocs<UserItem>(usersSnap).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)),
      )
      setOrders(mapDocs<Order>(ordersSnap))
      setBookings(mapDocs<Booking>(bookingsSnap))
    } catch (loadError) {
      console.error('Users load error:', loadError)
      setError('تعذر تحميل العملاء.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function setRole(user: UserItem, role: 'user' | 'admin') {
    if (!window.confirm(`تغيير دور ${user.email} إلى ${role === 'admin' ? 'أدمن' : 'مستخدم'}؟`))
      return
    setSavingId(user.uid)
    setMessage('')
    setError('')
    try {
      await runAdminAction(firebaseUser, {
        action: 'user_role_changed',
        targetType: 'users',
        targetId: user.uid,
        values: { role },
      })
      setUsers((current) =>
        current.map((item) => (item.uid === user.uid ? { ...item, role } : item)),
      )
      setMessage('تم تحديث دور المستخدم عبر API آمن.')
    } catch (roleError) {
      console.error('Role update error:', roleError)
      setError(
        roleError instanceof Error ? roleError.message : 'تعذر تحديث الدور. تأكد من الصلاحيات.',
      )
    } finally {
      setSavingId('')
    }
  }

  const userMetrics = useMemo(() => {
    const byUser = users.map((user) => {
      const userOrders = orders.filter((order) => order.userId === user.uid)
      const userBookings = bookings.filter((booking) => booking.userId === user.uid)
      const paidTotal = userOrders
        .filter(isPaidOrder)
        .reduce((sum, order) => sum + getAmount(order), 0)
      return { user, orders: userOrders, bookings: userBookings, paidTotal }
    })
    return byUser
  }, [bookings, orders, users])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return userMetrics.filter(({ user, orders: userOrders, bookings: userBookings, paidTotal }) => {
      const matchesSearch =
        !query ||
        [user.name, user.displayName, user.email, user.phone, user.uid]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'admins' && user.role === 'admin') ||
        (filter === 'paid' && paidTotal > 0) ||
        (filter === 'booked' && userBookings.length > 0) ||
        (filter === 'orders' && userOrders.length > 0)
      return matchesSearch && matchesFilter
    })
  }, [filter, search, userMetrics])

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === 'admin').length,
      paid: userMetrics.filter((item) => item.paidTotal > 0).length,
      booked: userMetrics.filter((item) => item.bookings.length > 0).length,
      revenue: userMetrics.reduce((sum, item) => sum + item.paidTotal, 0),
    }),
    [userMetrics, users],
  )

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="العملاء والمستخدمون"
        description="فهم العملاء من زاوية الطلبات والحجوزات والإيرادات، مع تحكم حذر في أدوار المستخدمين."
      />

      {message ? (
        <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="كل العملاء" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="Admins" value={formatNumber(stats.admins)} tone="gold" />
        <MetricCard label="دفعوا" value={formatNumber(stats.paid)} tone="success" />
        <MetricCard label="لديهم حجوزات" value={formatNumber(stats.booked)} tone="petrol" />
        <MetricCard label="إجمالي مدفوع" value={formatEGP(stats.revenue)} tone="gold" />
      </div>

      <AdminPanel title="فلترة العملاء" description="ابحث عن عميلة وشاهد طلباتها وحجوزاتها بسرعة.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="النوع">
            <select
              className={inputClass}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">كل العملاء</option>
              <option value="admins">Admins</option>
              <option value="paid">عملاء دفعوا</option>
              <option value="booked">لديهم حجوزات</option>
              <option value="orders">لديهم طلبات</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="بحث">
              <input
                className={inputClass}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="اسم، بريد، هاتف..."
              />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="قائمة العملاء"
        description="البيانات المعروضة محسوبة من الطلبات والحجوزات الحقيقية."
      >
        {filtered.length === 0 ? (
          <EmptyState title="لا توجد نتائج" description="غير الفلتر أو البحث لعرض العملاء." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map(({ user, orders: userOrders, bookings: userBookings, paidTotal }) => (
              <article
                key={user.uid}
                className="rounded-[1.75rem] border border-sand bg-cream/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-charcoal dark:text-ivory">
                    {user.name || user.displayName || user.email}
                  </h3>
                  <ToneBadge tone={user.role === 'admin' ? 'gold' : 'muted'}>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </ToneBadge>
                  {paidTotal > 0 ? <ToneBadge tone="success">عميل دافع</ToneBadge> : null}
                  {userBookings.length > 0 ? <ToneBadge tone="petrol">حجز جلسة</ToneBadge> : null}
                </div>
                <div className="grid gap-3 text-sm font-bold text-warm-gray dark:text-cream md:grid-cols-2">
                  <p>
                    البريد: <span className="text-charcoal dark:text-ivory">{user.email}</span>
                  </p>
                  <p>
                    الهاتف:{' '}
                    <span className="text-charcoal dark:text-ivory">
                      {user.phone || 'غير متوفر'}
                    </span>
                  </p>
                  <p>
                    الطلبات:{' '}
                    <span className="text-charcoal dark:text-ivory">
                      {formatNumber(userOrders.length)}
                    </span>
                  </p>
                  <p>
                    الحجوزات:{' '}
                    <span className="text-charcoal dark:text-ivory">
                      {formatNumber(userBookings.length)}
                    </span>
                  </p>
                  <p>
                    إجمالي المدفوع:{' '}
                    <span className="text-charcoal dark:text-ivory">{formatEGP(paidTotal)}</span>
                  </p>
                  <p>
                    التسجيل:{' '}
                    <span className="text-charcoal dark:text-ivory">
                      {formatArabicDateTime(user.createdAt)}
                    </span>
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {user.role === 'admin' ? (
                    <AdminActionButton
                      disabled={savingId === user.uid}
                      tone="warning"
                      onClick={() => setRole(user, 'user')}
                    >
                      إزالة Admin
                    </AdminActionButton>
                  ) : (
                    <AdminActionButton
                      disabled={savingId === user.uid}
                      tone="gold"
                      onClick={() => setRole(user, 'admin')}
                    >
                      تعيين Admin
                    </AdminActionButton>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
