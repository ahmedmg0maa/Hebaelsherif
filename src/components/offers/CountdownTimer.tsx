'use client'

import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  endsAt: string
  onExpire?: () => void
}

interface Remaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  done: boolean
}

function calc(endsAt: string): Remaining {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (!Number.isFinite(diff) || diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done: false,
  }
}

const units: Array<{ key: keyof Omit<Remaining, 'done'>; label: string }> = [
  { key: 'days', label: 'يوم' },
  { key: 'hours', label: 'ساعة' },
  { key: 'minutes', label: 'دقيقة' },
  { key: 'seconds', label: 'ثانية' },
]

export default function CountdownTimer({ endsAt, onExpire }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<Remaining>(() => calc(endsAt))

  useEffect(() => {
    const interval = setInterval(() => {
      const next = calc(endsAt)
      setRemaining(next)
      if (next.done) {
        clearInterval(interval)
        onExpire?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [endsAt, onExpire])

  if (remaining.done) return null

  return (
    <div className="flex items-center gap-2" role="timer" aria-live="off">
      {units.map((unit) => (
        <div key={unit.key} className="min-w-[3.2rem] rounded-2xl border border-gold/30 bg-ivory/80 px-2 py-2 text-center shadow-soft backdrop-blur-sm">
          <span className="latin-numerals block text-lg font-black leading-none text-petrol">
            {String(remaining[unit.key]).padStart(2, '0')}
          </span>
          <span className="mt-1 block text-[10px] font-black text-warm-gray">{unit.label}</span>
        </div>
      ))}
    </div>
  )
}
