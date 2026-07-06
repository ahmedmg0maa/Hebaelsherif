'use client'

import { useEffect, useState } from 'react'
import type { CourseProgress } from '@/types'
import { collection, getDocs, limit, query, where } from '@/lib/supabase/data-client-compat'
import { db } from '@/lib/supabase/client-compat'

export function useCourseProgress(userId?: string, courseId?: string) {
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(Boolean(userId && courseId))

  useEffect(() => {
    if (!userId || !courseId) {
      setProgress(null)
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const progressQuery = query(collection(db, 'course_progress'), where('userId', '==', userId), where('courseId', '==', courseId), limit(1))
        const snapshot = await getDocs(progressQuery)
        const first = snapshot.docs[0]
        if (!cancelled) setProgress(first ? ({ ...(first.data() as Record<string, unknown>), userId, courseId } as CourseProgress) : null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [userId, courseId])

  return { progress, loading }
}
