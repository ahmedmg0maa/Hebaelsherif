import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCheckoutProduct, getPaymentSettings } from '@/lib/data/checkout'
import { CheckoutClient } from '@/components/checkout/CheckoutClient'

export const metadata: Metadata = { title: 'إتمام الطلب' }

type Props = { params: Promise<{ productType: string; slug: string }> }

export default async function CheckoutPage({ params }: Props) {
  const { productType, slug } = await params
  const [product, settings] = await Promise.all([
    getCheckoutProduct(productType, slug),
    getPaymentSettings(),
  ])
  if (!product) notFound()

  return (
    <main className="min-h-screen bg-ivory">
      <CheckoutClient product={product} settings={settings} />
    </main>
  )
}
