'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { adminSearch, type SearchHit } from '@/lib/actions/admin-tools'
import { cn } from '@/lib/cn'
import { logoutCurrentAdminSession } from '@/lib/actions/admin-sessions'
import { getBrowserClient } from '@/lib/supabase/client'

import type { Permission } from '@/lib/auth/permissions'
import { adminNavigation, normalizeNavigationQuery } from '@/lib/admin-navigation'

const kindMeta: Record<SearchHit['kind'], { label: string; tone: string }> = {
  customer: { label: 'عميلة', tone: 'bg-deep-teal/10 text-deep-teal' },
  order: { label: 'طلب', tone: 'bg-cobalt/10 text-cobalt' },
  payment: { label: 'دفعة', tone: 'bg-antique-gold/15 text-burgundy' },
}

// Command-style global search over customers/orders/payments + quick links.
export function AdminTopbar({permissions}:{permissions:readonly Permission[]}) {
  const pathname=usePathname()
  const commands=adminNavigation(permissions).flatMap(section=>section.items.map(item=>({...item,group:section.title??'الإدارة'})))
  const current=[...commands].sort((a,b)=>b.href.length-a.href.length).find(item=>pathname===item.href||pathname.startsWith(`${item.href}/`))
  const canSearchCustomers=permissions.includes('admin.search')&&permissions.includes('users.view')
  const router = useRouter()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const request = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const matchingCommands=q.trim().length>=2?commands.filter(item=>normalizeNavigationQuery(`${item.label} ${item.group}`).includes(normalizeNavigationQuery(q))).slice(0,8):[]

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); inputRef.current?.focus() }
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', shortcuts)
    return () => { document.removeEventListener('keydown', shortcuts); if (debounce.current) clearTimeout(debounce.current); request.current += 1 }
  }, [])

  function onChange(value: string) {
    const version = ++request.current
    setHits(null)
    setBusy(canSearchCustomers && value.trim().length >= 2)
    setQ(value)
    setSearchError(null)
    setOpen(true)
    if (debounce.current) clearTimeout(debounce.current)
    if (!canSearchCustomers || value.trim().length < 2) {
      setHits(null)
      return
    }
    debounce.current = setTimeout(async () => {
      setBusy(true)
      try {
        const res = await adminSearch(value)
        if (version !== request.current) return
        if (res.ok) setHits(res.data.filter(hit=>permissions.includes(hit.kind==='customer'?'users.view':hit.kind==='order'?'orders.view':'payments.view')))
        else { setHits(null); setSearchError(res.error) }
      } catch { if (version === request.current) { setHits(null); setSearchError('تعذر البحث الآن؛ حاولي مرة أخرى.') } }
      finally { if (version === request.current) setBusy(false) }
    }, 350)
  }

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutCurrentAdminSession()
      await getBrowserClient().auth.signOut({ scope: 'local' })
      router.replace('/auth/admin'); router.refresh()
    } catch { setSearchError('تعذر إتمام الخروج. حاولي مرة أخرى.'); setOpen(false) }
    finally { setLoggingOut(false) }
  }

  return (
    <><nav aria-label="مسار الإدارة" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-soft"><Link href="/admin/overview" className="min-h-11 content-center">الإدارة</Link><span aria-hidden>/</span><span>{current?.group}</span><span aria-hidden>/</span><span aria-current="page" className="font-semibold text-deep-teal">{current?.label??'تفاصيل السجل'}</span></nav>
    <div className="mb-7 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-raised/85 p-3 shadow-card backdrop-blur">
      <Link href={`/auth/admin/confirm?reauth=1&redirect=${encodeURIComponent(pathname)}`} className="min-h-11 content-center px-3 text-sm text-deep-teal underline underline-offset-4">تأكيد الدخول</Link>
      <div ref={boxRef} className="relative min-w-0 basis-64 flex-1">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute start-4 top-10 h-4 w-4 text-taupe" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <label htmlFor="admin-search" className="mb-1 block text-sm font-semibold text-deep-teal">
          بحث شامل
        </label>
        <input
          ref={inputRef}
          id="admin-search"
          type="search"
          autoComplete="off"
          maxLength={120}
          aria-controls="admin-search-results"
          aria-describedby="admin-search-help"
          onKeyDown={event => { if (event.key === 'ArrowDown' && open) { event.preventDefault(); boxRef.current?.querySelector<HTMLAnchorElement>('a')?.focus() } }}
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          placeholder={canSearchCustomers?'قسم، اسم عميلة أو بريدها…':'ابحثي عن قسم في الإدارة…'}
          className="min-h-12 w-full rounded-xl border border-line bg-surface-raised py-2.5 ps-11 pe-4 text-sm text-ink shadow-card transition-colors placeholder:text-taupe/60 focus:border-deep-teal focus:outline-2 focus:outline-deep-teal/20"
        />
        <p id="admin-search-help" className="mt-1 text-sm leading-6 text-text-soft">ابحثي دون تعديل البيانات. مثال: الحجوزات · اختياري · من حرفين إلى 120 حرفًا. لا يُحفظ البحث على الجهاز.</p>
        {open && q.trim().length >= 2 && (
          <div id="admin-search-results" role="region" aria-label="نتائج البحث" className="absolute inset-x-0 top-full z-30 mt-2 max-h-[65dvh] overflow-y-auto rounded-2xl border border-line bg-surface-raised shadow-card-hover">
            {matchingCommands.length>0&&<div className="border-b border-line p-2"><p className="px-3 py-2 text-xs font-bold text-taupe">أقسام الإدارة</p><ul>{matchingCommands.map(item=><li key={item.href}><Link href={item.href} onClick={()=>setOpen(false)} className="flex min-h-12 items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm font-semibold text-deep-teal hover:bg-ivory"><span>{item.label}</span><span className="text-xs font-normal text-taupe">{item.group}</span></Link></li>)}</ul></div>}
            <div aria-live="polite">{busy ? (
              <p className="px-5 py-4 text-sm text-taupe">جارٍ البحث…</p>
            ) : searchError ? (
              <p className="px-5 py-4 text-sm font-semibold text-burgundy" role="alert">{searchError}</p>
            ) : !hits || hits.length === 0 ? (
              <p className="px-5 py-4 text-sm text-taupe">{matchingCommands.length?'اختاري قسمًا للانتقال إليه.':'لا نتائج مطابقة. جرّبي كلمة أقصر.'}</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {hits.map((h, i) => (
                  <li key={i}>
                    <Link
                      href={h.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ivory/70"
                    >
                      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold', kindMeta[h.kind].tone)}>
                        {kindMeta[h.kind].label}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-deep-teal">{h.title}</span>
                        <span className="block truncate text-xs text-taupe" dir="ltr">
                          {h.subtitle}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}</div>
          </div>
        )}
      </div>

      {searchError && !open && <p role="alert" className="text-sm text-burgundy">{searchError}</p>}
      <div className="flex gap-2">
        {[
          { href: '/admin/payments', label: 'المدفوعات' },
          { href: '/admin/offers', label: 'عرض جديد' },
          { href: '/admin/articles', label: 'مقال جديد' },
        ].filter(l=>commands.some(item=>item.href===l.href)).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="hidden min-h-12 items-center rounded-xl border border-line bg-surface-raised px-4 py-2 text-sm font-semibold text-deep-teal shadow-card transition-all hover:-translate-y-0.5 hover:border-antique-gold sm:inline-flex"
          >
            {l.label}
          </Link>
        ))}
        <button type="button" onClick={() => void logout()} disabled={loggingOut} className="min-h-12 rounded-xl border border-burgundy/30 bg-surface-raised px-4 py-2 text-sm font-semibold text-burgundy transition-colors hover:bg-burgundy/8 disabled:opacity-60">
          {loggingOut ? 'جارٍ الخروج…' : 'خروج آمن'}
        </button>
      </div>
    </div></>
  )
}
