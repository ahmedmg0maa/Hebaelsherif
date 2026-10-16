'use client'

import { useActionState } from 'react'
import { loginPreviewAdmin, type PreviewAdminLoginState } from '@/lib/actions/preview-admin'

const initialState: PreviewAdminLoginState = { error: null }

export function PreviewAdminLogin() {
  const [state, action, pending] = useActionState(loginPreviewAdmin, initialState)
  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="grid gap-2 text-sm font-bold text-deep-teal">
        البريد الإلكتروني للإدارة
        <input name="email" type="email" required autoComplete="username" dir="ltr" className="min-h-12 rounded-2xl border border-line bg-surface-raised px-4 text-left text-base text-ink shadow-inner outline-none transition focus:border-aqua focus:ring-4 focus:ring-aqua/12" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-deep-teal">
        كلمة مرور الإدارة
        <input name="password" type="password" required autoComplete="current-password" className="min-h-12 rounded-2xl border border-line bg-surface-raised px-4 text-base text-ink shadow-inner outline-none transition focus:border-aqua focus:ring-4 focus:ring-aqua/12" />
      </label>
      {state.error && <p role="alert" className="rounded-2xl border border-[#B75B62]/20 bg-[#B75B62]/8 px-4 py-3 text-sm font-semibold text-[#8E3F46]">{state.error}</p>}
      <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-deep-teal px-6 font-bold text-on-dark shadow-card transition hover:-translate-y-0.5 hover:bg-teal-hover disabled:cursor-wait disabled:opacity-60">
        {pending ? 'جارٍ التحقق…' : 'دخول مساحة المراجعة'}
      </button>
    </form>
  )
}
