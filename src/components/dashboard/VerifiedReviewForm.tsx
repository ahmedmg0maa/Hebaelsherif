'use client'

import Link from 'next/link'
import { useState } from 'react'
import { submitProductReview } from '@/lib/actions/reviews'
import { Button } from '@/components/ui/Button'

export function VerifiedReviewForm({ productId, title }: { productId: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  return (
    <div className="mt-3">
      <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>قيّمي «{title}»</Button>
      {open && (
        <form className="mt-2 grid gap-3 rounded-xl border border-line p-4" onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setMessage(null)
          const form = event.currentTarget
          const data = new FormData(form)
          const result = await submitProductReview(
            productId,
            Number(data.get('rating')),
            String(data.get('comment')),
            data.get('display_name_consent') === 'on',
            data.get('publication_consent') === 'on',
          )
          setSuccess(result.ok)
          setMessage(result.ok ? 'وصلت تجربتك للمراجعة بصفة «شراء موثّق».' : result.error)
          if (result.ok) form.reset()
          setBusy(false)
        }}>
          <label className="grid gap-1 text-xs font-semibold text-deep-teal">التقييم
            <select name="rating" defaultValue="5" className="min-h-10 rounded-lg border border-line bg-surface-raised px-3 text-sm text-ink">
              <option value="5">٥ نجوم</option><option value="4">٤ نجوم</option><option value="3">٣ نجوم</option><option value="2">نجمتان</option><option value="1">نجمة</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-deep-teal">نص التجربة
            <textarea name="comment" rows={4} minLength={10} maxLength={2000} placeholder="اكتبي تجربتك الفعلية دون بيانات شخصية حساسة" className="rounded-lg border border-line bg-surface-raised p-3 text-sm text-ink" required />
          </label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-text-soft"><input name="publication_consent" type="checkbox" required className="mt-0.5" /><span>أوافق على مراجعة ونشر نص تجربتي وفق <Link href="/privacy" className="font-bold text-deep-teal underline">سياسة الخصوصية</Link>. يمكنني طلب سحبها عبر صفحة التواصل.</span></label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-text-soft"><input name="display_name_consent" type="checkbox" className="mt-0.5" /><span>أوافق على إظهار اسمي الأول. من دون هذه الموافقة ستظهر التجربة باسم «عميلة موثقة».</span></label>
          <Button type="submit" size="sm" disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'إرسال للمراجعة'}</Button>
          {message && <p className={success ? 'text-xs text-deep-teal' : 'text-xs text-burgundy'} role={success ? 'status' : 'alert'}>{message}</p>}
        </form>
      )}
    </div>
  )
}
