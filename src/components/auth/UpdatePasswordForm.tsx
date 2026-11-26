'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeRecoveredPassword } from '@/lib/actions/account'
import { PASSWORD_HINT, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/lib/auth/password-policy'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/Button'

export function UpdatePasswordForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await completeRecoveredPassword(new FormData(event.currentTarget))
    if (!result.ok) {
      setError(result.error)
      setBusy(false)
      return
    }
    router.replace('/auth/login?password=changed')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PasswordField
        label="كلمة المرور الجديدة"
        name="password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
      />
      <PasswordField
        label="تأكيد كلمة المرور الجديدة"
        name="password_confirmation"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
      />
      {error && <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy" role="alert">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور الجديدة'}
      </Button>
    </form>
  )
}
