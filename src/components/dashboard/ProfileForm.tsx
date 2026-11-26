'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile, changePassword } from '@/lib/actions/account'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/auth/PasswordField'
import type { MyProfile } from '@/lib/data/dashboard'
import { PASSWORD_HINT, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/lib/auth/password-policy'

function Feedback({ state }: { state: { ok: boolean; msg: string } | null }) {
  if (!state) return null
  return (
    <p
      role={state.ok ? 'status' : 'alert'}
      className={
        state.ok
          ? 'rounded-xl bg-deep-teal/8 px-4 py-3 text-sm font-medium text-deep-teal'
          : 'rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy'
      }
    >
      {state.msg}
    </p>
  )
}

export function ProfileForm({ profile }: { profile: MyProfile | null }) {
  const [state, setState] = useState<{ ok: boolean; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    const res = await updateProfile(new FormData(e.currentTarget))
    setState(res.ok ? { ok: true, msg: 'تم حفظ بياناتك بنجاح.' } : { ok: false, msg: res.error })
    setBusy(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormField label="الاسم الكامل" name="full_name" defaultValue={profile?.fullName ?? ''} minLength={2} maxLength={120} required />
      <FormField label="البريد الإلكتروني" name="email" defaultValue={profile?.email ?? ''} disabled dir="ltr" hint="البريد مرتبط بحسابك ولا يمكن تغييره من هنا" />
      <FormField
        label="رقم الهاتف"
        name="phone"
        type="tel"
        defaultValue={profile?.phone ?? ''}
        minLength={7}
        maxLength={30}
        pattern="\+?[0-9][0-9 ()-]{5,28}[0-9]"
        hint="من ٧ إلى ٣٠ رمزًا؛ يمكن استخدام + والمسافات والأقواس والشرطة"
        dir="ltr"
      />
      <Feedback state={state} />
      <Button type="submit" disabled={busy}>
        {busy ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
      </Button>
    </form>
  )
}

export function PasswordForm() {
  const [state, setState] = useState<{ ok: boolean; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    const res = await changePassword(new FormData(form))
    if (res.ok) {
      form.reset()
      router.replace('/auth/login?password=changed')
      router.refresh()
      return
    }
    setState({ ok: false, msg: res.error })
    setBusy(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PasswordField
        label="كلمة المرور الحالية"
        name="current_password"
        autoComplete="current-password"
        maxLength={PASSWORD_MAX_LENGTH}
      />
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
      <Feedback state={state} />
      <Button type="submit" variant="secondary" disabled={busy}>
        {busy ? 'لحظات…' : 'تغيير كلمة المرور'}
      </Button>
    </form>
  )
}
