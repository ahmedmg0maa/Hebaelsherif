import type { ReactNode } from 'react'

interface PremiumFormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: ReactNode
  hint?: string
}

export default function PremiumFormField({ label, error, required = false, children, hint }: PremiumFormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="premium-label">
        {label}
        {required ? <span className="mr-1 text-petrol">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs leading-6 text-warm-gray">{hint}</p> : null}
      {error ? <p className="text-xs font-bold leading-6 text-petrol">{error}</p> : null}
    </div>
  )
}
