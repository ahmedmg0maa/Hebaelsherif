'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-10" role="alert" aria-live="assertive">
      <Card className="space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-deep-teal">تعذّر تحميل بيانات حسابك الآن</h1>
        <p className="text-sm leading-7 text-text-soft">
          لم نعرض حالة فارغة لأننا لم نتأكد من بياناتك. أعيدي المحاولة، ولن تتأثر مشترياتك أو حجوزاتك.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>إعادة المحاولة</Button>
          <Button href="/contact" variant="secondary">التواصل مع الدعم</Button>
        </div>
      </Card>
    </div>
  )
}
