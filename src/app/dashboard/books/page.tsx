import { AccountPagination } from '@/components/dashboard/AccountPagination'
import { accountPage } from '@/lib/customer-order-state'
import { getCollectionCount } from '@/lib/data/customer-account'
import type { Metadata } from 'next'
import { getMyBooks } from '@/lib/data/dashboard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = { title: 'كتبي' }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'long', year: 'numeric' })

export default async function MyBooksPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const page=accountPage((await searchParams).page)
  const [books,total]=await Promise.all([getMyBooks(page),getCollectionCount('books')])

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold leading-snug text-deep-teal">كتبي</h1>
        <p className="mt-1 text-text-soft">مكتبتك الخاصة — كتبك وملفاتك المتاحة للتحميل الآمن.</p>
      </header>

      {books.length === 0 ? (
        <EmptyState
          title="مكتبتك فارغة حاليًا"
          description="حين تشترين كتابًا وتُعتمد دفعتك يظهر هنا جاهزًا للتحميل الفوري."
          actionLabel="تصفّحي الكتب"
          actionHref="/books"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {books.map((b) => (
            <Card key={b.slug} hover className="flex gap-5">
              <div className="flex flex-1 flex-col">
                <h2 className="font-bold text-deep-teal">{b.title}</h2>
                <p className="tnum mt-1 flex-1 text-sm text-text-soft">
                  {b.pagesCount ? `${b.pagesCount.toLocaleString('ar-EG')} صفحة · ` : ''}
                  أُضيف {dateFmt.format(new Date(b.grantedAt))}
                </p>
                <Button href={`/dashboard/books/${b.slug}/download`} variant="secondary" size="sm" className="self-start">
                  تحميل الكتاب
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-6"><AccountPagination page={page} total={total} base="/dashboard/books"/></div>
    </div>
  )
}
