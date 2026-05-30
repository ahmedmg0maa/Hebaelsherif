'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { NotificationItem } from '@/types'

export function useNotifications(scope: 'user' | 'admin' = 'user') {
  const { firebaseUser } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const endpoint = scope === 'admin' ? '/api/admin/notifications' : '/api/notifications'

  const load = useCallback(async () => {
    if (!firebaseUser) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await response.json()) as { items?: NotificationItem[] }
      setItems(response.ok ? payload.items || [] : [])
    } catch (error) {
      console.warn('Notifications load failed:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [endpoint, firebaseUser])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])

  async function markRead(id: string) {
    if (!firebaseUser) return
    const token = await firebaseUser.getIdToken()
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'mark_read', id }),
    })
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  return { items, loading, unreadCount, reload: load, markRead }
}
