import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="font-heading text-8xl font-bold text-sand">٤٠٤</p>
      <h1 className="text-3xl font-bold text-deep-teal">هذه الصفحة غير موجودة</h1>
      <p className="max-w-md leading-loose text-text-soft">
        ربما تغيّر الرابط أو حُذفت الصفحة. لا بأس — كل الطرق هنا تؤدي لمكان جميل.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button href="/">العودة للرئيسية</Button>
        <Button href="/courses" variant="secondary">
          تصفّحي الدورات
        </Button>
      </div>
      <Link href="/contact" className="text-sm text-taupe underline-offset-4 hover:text-burgundy hover:underline">
        أو راسلينا إن كنتِ تبحثين عن شيء محدد
      </Link>
    </main>
  )
}
