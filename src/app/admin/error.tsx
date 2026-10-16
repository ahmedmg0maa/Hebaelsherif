'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
export default function AdminError({reset}:{reset:()=>void}) {
  return <section role="alert" className="mx-auto max-w-2xl rounded-3xl border border-line bg-surface-raised p-8 sm:p-12"><p className="text-sm font-bold text-burgundy">تعذّر تحميل هذا القسم</p><h1 className="mt-3 font-heading text-3xl text-deep-teal">بياناتك تستحق نتيجة مؤكدة.</h1><p className="my-5 leading-loose text-text-soft">لم نعرض البيانات المتعذرة كقائمة فارغة. أعيدي تحميل القسم. إذا تعذّر تأكيد حفظ، تحققي من السجل قبل إرسال العملية مجددًا.</p><div className="flex flex-wrap items-center gap-4"><Button onClick={reset}>إعادة المحاولة</Button><Link href="/admin/overview" className="min-h-12 content-center font-semibold text-deep-teal">نظرة عامة</Link></div></section>
}
