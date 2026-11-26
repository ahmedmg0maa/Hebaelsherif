import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLearnData } from '@/lib/data/learn'
import { LearnClient } from '@/components/learn/LearnClient'
import { EmptyState } from '@/components/ui/EmptyState'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getLearnData((await params).slug)
  return { title: data ? `تعلّم: ${data.title}` : 'الدورة غير موجودة' }
}

export default async function LearnPage({ params }: Props) {
  const data = await getLearnData((await params).slug)
  if (!data) notFound()

  if (!data.enrolled) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <EmptyState
          title="هذه الدورة ليست في حسابك بعد"
          description="التحقي بالدورة أولًا — وبعد اعتماد دفعتك يفتح المحتوى هنا تلقائيًا."
          actionLabel="صفحة الدورة"
          actionHref={`/courses/${data.slug}`}
        />
      </div>
    )
  }

  return <LearnClient data={data} />
}
