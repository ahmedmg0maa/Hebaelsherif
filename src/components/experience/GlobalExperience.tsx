'use client'

import { useEffect } from 'react'
import AiGuide from './AiGuide'

export default function GlobalExperience() {
  useEffect(() => {
    const stored = window.localStorage.getItem('heba-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldDark = stored ? stored === 'dark' : prefersDark
    document.documentElement.classList.toggle('dark', shouldDark)
  }, [])

  return <AiGuide />
}
