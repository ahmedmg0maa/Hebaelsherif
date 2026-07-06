'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AiGuide from './AiGuide'

export default function GlobalExperience() {
  const pathname = usePathname()

  useEffect(() => {
    const stored = window.localStorage.getItem('heba-theme')
    const shouldDark = stored === 'dark'
    document.documentElement.classList.toggle('dark', shouldDark)
  }, [])

  if (pathname?.startsWith('/admin')) return null

  return <AiGuide />
}
