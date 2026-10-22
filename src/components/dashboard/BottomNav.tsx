'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const items = [
  {
    href: '/dashboard',
    label: 'الرئيسية',
    icon: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    href: '/dashboard/courses',
    label: 'دوراتي',
    icon: <path d="M4 6h16v11H4zM8 21h8M12 17v4" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    href: '/dashboard/books',
    label: 'كتبي',
    icon: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5ZM4 5.5v15M20 18v3H6.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    href: '/dashboard/payments',
    label: 'مدفوعاتي',
    icon: <path d="M3 7h18v11H3zM3 11h18M7 15h4" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    href: '/dashboard/profile',
    label: 'ملفي',
    icon: <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9c0-3.9 3.1-7 7-7s7 3.1 7 7" strokeLinecap="round" strokeLinejoin="round" />,
  },
]

// App-style bottom tab bar for phones (hidden ≥lg where the sidebar takes over).
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="التنقل السريع"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-raised/95 backdrop-blur-md lg:hidden"
    >
      <ul className="flex">
        {items.map((item) => {
          const active =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition-colors motion-safe:active:scale-95',
                  active ? 'text-deep-teal' : 'text-taupe',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-deep-teal/10',
                  )}
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {item.icon}
                  </svg>
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
