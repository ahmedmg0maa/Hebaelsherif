'use client'

import Link from 'next/link'
import { ReadingProgress } from './ReadingProgress'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { BrandLogo } from './BrandLogo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import type { PublicNavigationItem } from '@/lib/data/cms'

const allNav = [
  { href: '/', label: 'الرئيسية' },
  { href: '/start-here', label: 'ابدئي من هنا' },
  { href: '/courses', label: 'الدورات' },
  { href: '/books', label: 'الكتب' },
  { href: '/workshops', label: 'الورش', flag: 'workshops' },
  { href: '/services', label: 'الخدمات' },
  { href: '/programs', label: 'البرامج' },
  { href: '/articles', label: 'المقالات' },
]

function SearchIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4" strokeLinecap="round"/></svg>
}

function UserIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-4.1 2.8-6.2 6.5-6.2s5.8 2.1 6.5 6.2" strokeLinecap="round"/></svg>
}

export function PublicHeader({ flags = {}, items = [] }: { flags?: Record<string, boolean>; items?: PublicNavigationItem[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const previousOverflow = document.body.style.overflow
    const trigger = triggerRef.current
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const controls = [...dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(node => node.getClientRects().length > 0)
      const first = controls[0], last = controls.at(-1)
      if (!first || !last) { event.preventDefault(); return }
      if (!dialog.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) { event.preventDefault(); first.focus() }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    }
    dialog.addEventListener('keydown', trapTab)
    const wide = window.matchMedia('(min-width: 1280px)')
    const closeOnWide = () => { if (wide.matches) setOpen(false) }
    wide.addEventListener('change', closeOnWide)
    return () => {
      wide.removeEventListener('change', closeOnWide)
      dialog.removeEventListener('keydown', trapTab)
      dialog.close()
      document.body.style.overflow = previousOverflow
      trigger?.focus({ preventScroll: true })
    }
  }, [open])
  const interactive = useSyncExternalStore(() => () => {}, () => true, () => false)
  const nav = (items.length ? items : allNav).filter((item) => !('flag' in item) || !item.flag || flags[item.flag] !== false)

  return (
    <header className="public-header sticky top-0 z-50 border-b border-line/80 bg-surface-raised/94 text-ink shadow-[0_10px_30px_rgb(38_56_61_/_0.055)] backdrop-blur-xl dark:border-on-dark/10 dark:bg-[#0B2B35]/94 dark:text-on-dark dark:shadow-[0_16px_40px_rgb(0_0_0_/_0.22)]">
      <div className="mx-auto grid min-h-[80px] max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 sm:px-6 xl:min-h-[88px] xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-14 w-14 sm:h-16 sm:w-16" />
          <Link prefetch={false} href="/" className="min-w-0 focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep-teal" aria-label="هبة الشريف — الصفحة الرئيسية">
            <span className="block truncate font-heading text-[1.3rem] leading-[1.65] font-bold text-deep-teal dark:text-on-dark lg:text-[1.5rem]">هبة الشريف</span>
            <span className="block truncate text-[8px] leading-5 font-bold tracking-[0.18em] text-aqua-deep dark:text-aqua sm:text-[9px]" dir="ltr">HEBA ELSHERIF</span>
          </Link>
        </div>

        <nav className="hidden min-w-0 justify-self-center xl:block" aria-label="التنقل الرئيسي">
          <ul className="flex flex-wrap items-center justify-center gap-0.5 xl:gap-1">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2.5 py-2.5 text-[12px] transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-teal 2xl:px-3.5 2xl:text-sm',
                      active
                        ? 'bg-aqua/12 font-bold text-deep-teal after:absolute after:inset-x-5 after:bottom-1 after:h-px after:bg-aqua-deep dark:bg-on-dark/8 dark:text-on-dark dark:after:bg-aqua'
                        : 'font-semibold text-text-soft hover:bg-aqua/8 hover:text-deep-teal dark:text-on-dark/68 dark:hover:bg-on-dark/7 dark:hover:text-on-dark',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex items-center justify-self-end">
          <div className="hidden items-center gap-1.5 xl:flex">
            <ThemeToggle compact />
            <Link prefetch={false} href="/search" aria-label="البحث في الموقع" title="البحث" aria-current={pathname === '/search' ? 'page' : undefined} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-raised text-deep-teal transition hover:-translate-y-0.5 hover:border-aqua hover:bg-aqua/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua dark:border-on-dark/16 dark:bg-on-dark/6 dark:text-on-dark dark:hover:text-aqua">
              <SearchIcon />
            </Link>
            <Link prefetch={false} href="/auth/login" aria-label="دخول الحساب" title="حسابي" className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-raised text-deep-teal transition hover:-translate-y-0.5 hover:border-aqua hover:bg-aqua/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua dark:border-on-dark/16 dark:bg-on-dark/6 dark:text-on-dark dark:hover:text-aqua">
              <UserIcon />
            </Link>
            <Link prefetch={false} href="/booking" className="ms-1 inline-flex min-h-11 items-center justify-center rounded-full bg-deep-teal px-5 text-sm font-bold text-on-dark shadow-card transition hover:-translate-y-0.5 hover:bg-teal-hover hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua dark:bg-aqua dark:text-deep-teal dark:hover:bg-on-dark">
              احجزي جلستك
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 xl:hidden">
            <Link prefetch={false} href="/search" aria-label="البحث في الموقع" className="flex h-11 w-11 items-center justify-center rounded-full text-deep-teal dark:text-on-dark focus-visible:outline-2 focus-visible:outline-aqua"><SearchIcon /></Link>
            <Link prefetch={false} href="/auth/login" aria-label="دخول الحساب" className="hidden h-11 w-11 items-center justify-center rounded-full text-deep-teal dark:text-on-dark focus-visible:outline-2 focus-visible:outline-aqua sm:flex"><UserIcon /></Link>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((value) => !value)}
              disabled={!interactive}
              aria-expanded={open}
              aria-controls="public-mobile-navigation"
              aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-raised text-deep-teal dark:border-on-dark/18 dark:bg-on-dark/6 dark:text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <dialog ref={dialogRef} id="public-mobile-navigation" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} aria-labelledby="mobile-menu-title" className="fixed inset-y-0 start-auto end-0 m-0 h-dvh max-h-none w-[min(90vw,26rem)] max-w-none overflow-y-auto border-s border-line bg-surface-raised p-5 text-ink shadow-card backdrop:bg-[#082730]/60 dark:bg-[#0B2B35] dark:text-on-dark">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="mobile-menu-title" className="font-heading text-2xl font-bold">القائمة الرئيسية</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-xl">×</button>
        </div>
        <nav className="pb-[max(1.25rem,env(safe-area-inset-bottom))]" aria-label="التنقل الرئيسي للموبايل">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-line bg-ivory/70 px-4 py-3 text-deep-teal dark:border-on-dark/12 dark:bg-on-dark/6 dark:text-on-dark">
            <p className="text-sm font-bold">أين تحبين أن تبدئي؟</p>
            <div className="flex gap-2"><ThemeToggle compact /></div>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn('flex min-h-12 items-center rounded-xl border px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-aqua', active ? 'border-aqua bg-aqua/12 text-deep-teal dark:text-aqua' : 'border-line bg-ivory/55 text-text-soft dark:border-on-dark/12 dark:bg-on-dark/5 dark:text-on-dark/72')}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 dark:border-on-dark/12">
            <Link prefetch={false} href="/auth/login" onClick={() => setOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-full border border-line font-bold text-deep-teal dark:border-on-dark/24 dark:text-on-dark">دخول الحساب</Link>
            <Link prefetch={false} href="/booking" onClick={() => setOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-full bg-deep-teal font-bold text-on-dark dark:bg-aqua dark:text-deep-teal">احجزي جلسة</Link>
          </div>
        </nav>
      </dialog>
    <ReadingProgress />
    </header>
  )
}
