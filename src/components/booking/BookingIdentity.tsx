 'use client'
import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/client'
import { validateNewPassword } from '@/lib/auth/password-policy'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { PasswordField } from '@/components/auth/PasswordField'

export function BookingIdentity({ fullName, onReady }: { fullName: string; onReady: () => void }) {
 const [mode, setMode] = useState<'login'|'register'>('register')
 const [busy, setBusy] = useState(false)
 const [message, setMessage] = useState('')
 const [confirmationEmail, setConfirmationEmail] = useState('')
 const [resendAt, setResendAt] = useState(0)
 const [now, setNow] = useState(() => Date.now())
 const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000))
 function startCooldown() { const time = Date.now(); setNow(time); setResendAt(time + 60_000) }
 useEffect(() => {
  if (!resendAt) return
  const timer = setInterval(() => { const time = Date.now(); setNow(time); if (time >= resendAt) clearInterval(timer) }, 1000)
  return () => clearInterval(timer)
 }, [resendAt])
 async function resendConfirmation() {
  if (busy || cooldown > 0 || !confirmationEmail) return
  setBusy(true); setMessage('')
  try {
   const { error } = await getBrowserClient().auth.resend({ type: 'signup', email: confirmationEmail, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/booking` } })
   setMessage(error ? 'تعذر إرسال رابط الآن. راجعي البريد غير المرغوب وحاولي بعد دقيقة.' : 'طُلب إرسال رابط التأكيد مجددًا. افتحي أحدث رسالة ثم عودي لإكمال الحجز.')
  } catch { setMessage('تعذر الاتصال. حاولي بعد دقيقة؛ اختياراتك محفوظة.') }
  finally { startCooldown(); setBusy(false) }
 }
 async function submit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault(); if (busy) return
  setBusy(true); setMessage('')
  const form = new FormData(event.currentTarget), email = String(form.get('email')).trim(), password = String(form.get('password'))
  try {
   const auth = getBrowserClient().auth
   if (mode === 'register') {
    const invalid = validateNewPassword(password,password)
    if (invalid) { setMessage(invalid); return }
    if (fullName.trim().length < 2) { setMessage('اكتبي اسمك في بيانات التواصل أولًا.'); return }
    const result = await auth.signUp({email,password,options:{data:{full_name:fullName.trim()},emailRedirectTo:`${window.location.origin}/auth/callback?next=/booking`}})
    if (result.error) {setMessage('تعذر إنشاء الوصول. جرّبي تسجيل الدخول إن كان لكِ حساب.');return}
    if (result.data.session) onReady()
    else {
     setConfirmationEmail(email); startCooldown()
     setMessage('افتحي رابط التأكيد في بريدك ثم عودي إلى الحجز. حفظنا اختيار الجلسة والموعد في هذا المتصفح، وسيُعاد التحقق من توفره عند المتابعة.')
    }
   } else {
    const {error} = await auth.signInWithPassword({email,password})
    if (error) setMessage('راجعي البريد وكلمة المرور، أو استخدمي استعادة كلمة المرور.')
    else onReady()
   }
  } catch {setMessage('تعذر الاتصال. اختيارات الحجز ما زالت محفوظة؛ حاولي مرة أخرى.')}
  finally {setBusy(false)}
 }
 return <div className="mt-6 rounded-2xl border border-line bg-ivory/60 p-5">
  <h3 className="font-bold text-deep-teal">احفظي حجزك وتابعيه من مكان واحد</h3>
  <p className="mt-1 text-sm leading-7 text-text-soft">في أول زيارة أنشئي حسابك هنا. سيجمع حجوزاتك ودروسك ومتابعة الدفع في مكان واحد، دون أسئلة عن سبب الجلسة.</p>
  <div className="my-4 flex gap-2" aria-label="طريقة الدخول">
   <Button type="button" disabled={busy} size="sm" variant={mode==='register'?'primary':'secondary'} onClick={()=>setMode('register')}>أول زيارة</Button>
   <Button type="button" disabled={busy} size="sm" variant={mode==='login'?'primary':'secondary'} onClick={()=>setMode('login')}>لديّ حساب</Button>
  </div>
  <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
   <FormField label="البريد الإلكتروني" type="email" name="email" required maxLength={320} disabled={busy} autoComplete="email" dir="ltr" />
   <PasswordField label="كلمة المرور" name="password" disabled={busy} autoComplete={mode==='login'?'current-password':'new-password'} />
   <Button type="submit" disabled={busy}>{busy?'جارٍ المتابعة…':mode==='login'?'دخول ومتابعة الحجز':'إنشاء حساب ومتابعة الحجز'}</Button>
   <a href="/auth/reset-password" className="self-center text-sm underline">استعادة كلمة المرور</a>
  </form>
  {message&&<p role="status" className="mt-3 text-sm leading-7 text-burgundy">{message}</p>}
  {confirmationEmail && <div className="mt-4 space-y-2 rounded-xl border border-line bg-surface-raised p-4"><p className="text-sm leading-7 text-text-soft">لم تصلكِ الرسالة؟ راجعي البريد غير المرغوب. أكملي رابط التأكيد من هذا المتصفح للحفاظ على اختياراتك.</p><Button type="button" size="sm" variant="secondary" disabled={busy || cooldown > 0} onClick={resendConfirmation}>{cooldown > 0 ? `إعادة الإرسال بعد ${cooldown.toLocaleString('ar-EG')} ث` : 'إعادة إرسال رابط التأكيد'}</Button></div>}
 </div>
}
