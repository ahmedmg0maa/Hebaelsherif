'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { normalizeNavigationQuery } from '@/lib/admin-navigation'

export type SidebarItem = {
  href: string
  label: string
  icon?: React.ReactNode
  badge?: number
}

export type SidebarSection = {
  title?: string
  items: SidebarItem[]
}

type SidebarProps = {
  brand: React.ReactNode
  sections: SidebarSection[]
  footer?: React.ReactNode
  className?: string
}

function SidebarGlyph({ href }: { href: string }) {
  let path: React.ReactNode
  if (href.endsWith('/overview') || href === '/dashboard')
    path = <><path d="M4 11 12 4l8 7v9H4z" /><path d="M9 20v-6h6v6" /></>
  else if (href.includes('payment')) path = <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>
  else if (href.includes('order')) path = <><path d="M7 4h10l2 3v14H5V7z" /><path d="M8 11h8M8 15h6" /></>
  else if (href.includes('booking')) path = <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3v3H8z" /></>
  else if (href.includes('user') || href.includes('profile') || href.includes('role')) path = <><circle cx="12" cy="8" r="4" /><path d="M5 21c0-4 3-7 7-7s7 3 7 7" /></>
  else if (href.includes('course')) path = <><rect x="3" y="5" width="18" height="13" rx="2" /><path d="M9 22h6M12 18v4M8 10l3 2 5-4" /></>
  else if (href.includes('book')) path = <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 5.5v15M20 18v3H6.5" /></>
  else if (href.includes('workshop')) path = <><path d="M4 20h16M6 20V9l6-5 6 5v11" /><path d="M9 13h6M12 10v6" /></>
  else if (href.includes('article') || href.includes('page')) path = <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h4M9 12h7M9 16h7" /></>
  else if (href.includes('media')) path = <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m5 18 5-5 3 3 2-2 4 4" /></>
  else if (href.includes('review')) path = <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />
  else if (href.includes('offer') || href.includes('coupon')) path = <><path d="M4 7a3 3 0 0 0 0 6v5h16v-5a3 3 0 0 0 0-6V4H4z" /><path d="M12 7v10" /></>
  else if (href.includes('report')) path = <><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M3 20h18" /></>
  else if (href.includes('audit') || href.includes('security')) path = <><path d="M12 3 20 6v6c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6z" /><path d="m9 12 2 2 4-5" /></>
  else if (href.includes('setting') || href.includes('system')) path = <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>
  else if (href.includes('notification')) path = <><path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5z" /><path d="M10 20h4" /></>
  else path = <><circle cx="12" cy="12" r="8" /><path d="M8 12h8" /></>

  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{path}</svg>
}

function Nav({ sections, onNavigate }: { sections: SidebarSection[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const searchId=useId(),normalized=normalizeNavigationQuery(query)
  const filtered = sections.map(section => ({ ...section, items: section.items.filter(item => !normalized || normalizeNavigationQuery(item.label).includes(normalized)) })).filter(section => section.items.length)
  return (
    <nav aria-label="أقسام مساحة العمل" className="flex-1 space-y-6 px-3 py-6">
      {sections.reduce((sum, section) => sum + section.items.length, 0) > 12 && <div className="grid gap-2 px-2 text-sm text-on-dark/80"><label htmlFor={searchId}>الوصول إلى قسم</label><input id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)} aria-describedby={`${searchId}-help`} placeholder="اسم القسم…" className="min-h-12 w-full rounded-xl border border-on-dark/25 bg-on-dark/10 px-3 text-base text-on-dark placeholder:text-on-dark/60" /><p id={`${searchId}-help`} className="text-xs leading-6">لتصفية الأقسام فقط. مثال: الحجوزات. لا يتغير أي سجل.</p></div>}
      {!filtered.length && <p role="status" className="px-3 text-sm text-on-dark/80">لا يوجد قسم بهذا الاسم.</p>}
      {filtered.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && (
            <p className="mb-2 px-3 text-sm font-semibold text-on-dark/75">{section.title}</p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'bg-on-dark/10 font-semibold text-on-dark shadow-card before:absolute before:inset-y-2 before:-end-3 before:w-0.5 before:bg-antique-gold'
                        : 'text-on-dark/70 hover:bg-on-dark/5 hover:text-on-dark',
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-on-dark/10 text-muted-gold opacity-90">
                      {item.icon ?? <SidebarGlyph href={item.href} />}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="tnum rounded-full bg-burgundy px-2 py-0.5 text-xs font-bold text-on-dark">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

// Native modal provides focus containment and Escape handling in both workspaces.
export function Sidebar({ brand, sections, footer, className }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  function onDialogKeyDown(event:React.KeyboardEvent<HTMLDialogElement>){
    if(event.key==='Escape'){event.preventDefault();setOpen(false);return}
    if(event.key!=='Tab')return
    const elements=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(element=>element.getClientRects().length>0)
    const first=elements[0],last=elements.at(-1)
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  }
  useEffect(() => {
    if (!open) return
    const element = dialog.current
    if (!element) return
    const opener = trigger.current
    const overflow = document.body.style.overflow
    element.showModal(); document.body.style.overflow = 'hidden'
    const wide = window.matchMedia('(min-width: 1024px)')
    const closeWide = () => { if (wide.matches) setOpen(false) }
    wide.addEventListener('change', closeWide)
    return () => { wide.removeEventListener('change', closeWide); element.close(); document.body.style.overflow = overflow; opener?.focus({ preventScroll: true }) }
  }, [open])
  return <>
    <div className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-on-dark/15 bg-deep-teal px-4 py-3 text-on-dark lg:hidden">
      {brand}
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-label="فتح القائمة" aria-expanded={open} aria-controls={id} className="flex h-12 w-12 items-center justify-center rounded-full border border-on-dark/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
    </div>
    <dialog ref={dialog} id={id} aria-label="قائمة التنقل" onKeyDown={onDialogKeyDown} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} className="fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-none w-80 max-w-[90vw] border-0 bg-deep-teal p-0 text-on-dark shadow-sidebar backdrop:bg-ink/55">
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-on-dark/15 px-5 py-4">{brand}<button type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" className="h-12 w-12 shrink-0 rounded-full border border-on-dark/30 text-xl">×</button></div>
        <Nav sections={sections} onNavigate={() => setOpen(false)} />
        {footer && <div className="border-t border-on-dark/15 px-5 py-5">{footer}</div>}
      </div>
    </dialog>
    <aside className={cn('sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-e border-on-dark/15 bg-deep-teal text-on-dark lg:flex xl:w-72', className)}>
      <div className="border-b border-on-dark/15 px-5 py-6">{brand}</div>
      <Nav sections={sections} />
      {footer && <div className="border-t border-on-dark/15 px-5 py-5">{footer}</div>}
    </aside>
  </>
}
