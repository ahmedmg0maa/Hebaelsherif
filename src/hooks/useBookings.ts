'use client'

import { useEffect, useState } from 'react'
import type { Booking } from '@/types'
import { collection, getDocs, orderBy, query, where } from '@/lib/supabase/data-client-compat'
import { db } from '@/lib/supabase/client-compat'

export function useBookings(userId?: string) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      setBookings([])
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const bookingQuery = query(collection(db, 'bookings'), where('userId', '==', userId), orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(bookingQuery)
        if (!cancelled) setBookings(snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) }) as Booking))
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الحجوزات.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [userId])

  return { bookings, loading, error }
}
