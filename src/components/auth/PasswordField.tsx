'use client'

import { useState } from 'react'

// Password input with a show/hide toggle — friendlier typing on phones.
export function PasswordField({
  label,
  name,
  autoComplete,
  hint,
  minLength,
  maxLength,
  disabled,
}: {
  label: string
  name: string
  autoComplete: string
  hint?: string
  minLength?: number
  maxLength?: number
  disabled?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-deep-teal">
        {label}
        <span className="ms-1 text-burgundy">*</span>
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          disabled={disabled}
          required
          dir="ltr"
          className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 pe-12 text-ink transition-colors focus:border-deep-teal focus:outline-2 focus:outline-offset-0 focus:outline-deep-teal/20"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full text-taupe transition-colors hover:text-deep-teal"
        >
          {visible ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M3 3l18 18" strokeLinecap="round" />
              <path d="M6.3 6.5C4.2 7.9 2.7 10 2 12c1 2.5 5 7 10 7 1.9 0 3.6-.6 5.1-1.6M10.5 5.2A10 10 0 0 1 12 5c5 0 9 4.5 10 7-.3.8-1 2-2.1 3.1" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12Z" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {hint && <p className="text-xs text-taupe">{hint}</p>}
    </div>
  )
}
