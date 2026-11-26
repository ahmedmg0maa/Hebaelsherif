'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

type CountdownProps = {
  target: string | Date
  className?: string
  tone?: 'light' | 'dark'
  onExpire?: () => void
  expiredLabel?: string
}

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now())
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
    expired: ms === 0,
  }
}

const labels = { days: 'يوم', hours: 'ساعة', minutes: 'دقيقة', seconds: 'ثانية' } as const

export function Countdown({ target, className, tone = 'light', onExpire, expiredLabel = 'انتهى العرض' }: CountdownProps) {
  const targetDate = typeof target === 'string' ? new Date(target) : target
  const [time, setTime] = useState<ReturnType<typeof diff> | null>(null)

  useEffect(() => {
    // First tick is deferred to a macrotask: avoids both a hydration mismatch
    // (server can't know client time) and synchronous setState in the effect.
    const tick = () => {
      const t = diff(targetDate)
      setTime(t)
      if (t.expired) {
        clearInterval(id)
        onExpire?.()
      }
    }
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate.getTime()])

  const cell =
    tone === 'dark'
      ? 'bg-on-dark/10 text-on-dark border-on-dark/15'
      : 'bg-surface-raised text-deep-teal border-line'

  if (time?.expired) {
    return <p className={cn('text-sm font-semibold text-burgundy', className)}>{expiredLabel}</p>
  }

  return (
    <div dir="ltr" className={cn('flex items-center justify-center gap-2', className)} role="timer" aria-live="off">
      {(['days', 'hours', 'minutes', 'seconds'] as const).map((k) => (
        <div key={k} className={cn('flex min-w-16 flex-col items-center rounded-xl border px-3 py-2 shadow-card', cell)}>
          <span className="tnum text-2xl font-bold">
            {time ? time[k].toLocaleString('ar-EG', { minimumIntegerDigits: 2 }) : '--'}
          </span>
          <span className="text-xs opacity-70">{labels[k]}</span>
        </div>
      ))}
    </div>
  )
}
