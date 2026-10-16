import { createHash } from 'node:crypto'
import type { Metadata } from 'next'
import { Card } from '@/components/ui/Card'
import { UnsubscribeConfirmation } from '@/components/newsletter/UnsubscribeConfirmation'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'إلغاء الاشتراك', robots: { index: false, follow: false } }

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let status: string | null = null
  if (/^[0-9a-f]{64}$/.test(token) && hasSupabaseServerSecret()) {
    const hash = createHash('sha256').update(token).digest('hex')
    const { data } = await getServiceClient().from('newsletter_subscribers').select('status').eq('unsubscribe_token_hash', hash).maybeSingle()
    status = data?.status ?? null
  }
  return <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-6 py-16"><Card className="w-full text-center"><h1 className="text-3xl font-bold text-deep-teal">إدارة اشتراك النشرة</h1>{status === 'subscribed' ? <><p className="mt-3 leading-loose text-text-soft">لن تتغير حالتك بمجرد فتح الرابط. أكّدي الإلغاء من الزر التالي.</p><UnsubscribeConfirmation token={token} /></> : status === 'unsubscribed' ? <p className="mt-3 leading-loose text-text-soft">هذا الاشتراك ملغى بالفعل.</p> : <p className="mt-3 leading-loose text-text-soft">الرابط غير صالح أو لم يعد نشطًا.</p>}</Card></main>
}
