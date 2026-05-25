'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AiGuide from './AiGuide'

export default function GlobalExperience() {
  const pathname = usePathname()

  useEffect(() => {
    const stored = window.localStorage.getItem('heba-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldDark = stored ? stored === 'dark' : prefersDark
    document.documentElement.classList.toggle('dark', shouldDark)
  }, [])

  if (pathname?.startsWith('/admin')) return null

  return <AiGuide />
}
