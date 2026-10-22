import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'

export const TESTIMONIAL_TYPES = ['course', 'book', 'workshop', 'session'] as const
export type TestimonialType = (typeof TESTIMONIAL_TYPES)[number]

export const TESTIMONIAL_TYPE_LABELS: Record<TestimonialType, string> = {
  course: 'دورات',
  book: 'كتب',
  workshop: 'ورش',
  session: 'جلسات',
}

export type PublicTestimonial = {
  id: string
  displayName: string
  rating: number
  comment: string
  ownerResponse: string | null
  createdAt: string
  productTitle: string
  productType: TestimonialType
}

type TestimonialRow = {
  id: string
  display_name: string | null
  display_name_consent: boolean
  rating: number
  comment: string
  owner_response: string | null
  owner_response_published: boolean
  created_at: string
  products: { title: string; type: string; is_published: boolean } | { title: string; type: string; is_published: boolean }[] | null
}

export async function listPublicTestimonials(type?: string): Promise<PublicTestimonial[]> {
  if (!hasSupabasePublicConfig()) return []
  const selectedType = TESTIMONIAL_TYPES.includes(type as TestimonialType) ? type as TestimonialType : null
  try {
    const supabase = await getServerClient()
    let query = supabase
      .from('reviews')
      .select('id, display_name, display_name_consent, rating, comment, owner_response, owner_response_published, created_at, products!inner(title, type, is_published)')
      .eq('status', 'approved')
      .eq('is_approved', true)
      .eq('verified_purchase', true)
      .not('publication_consent_at', 'is', null)
      .eq('products.is_published', true)
      .order('created_at', { ascending: false })
      .limit(60)
    if (selectedType) query = query.eq('products.type', selectedType)
    const { data, error } = await query
    if (error) return []
    return ((data ?? []) as TestimonialRow[]).flatMap((row) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products
      if (!product || !TESTIMONIAL_TYPES.includes(product.type as TestimonialType)) return []
      return [{
        id: row.id,
        displayName: row.display_name_consent && row.display_name ? row.display_name : 'عميلة موثقة',
        rating: row.rating,
        comment: row.comment,
        ownerResponse: row.owner_response_published ? row.owner_response : null,
        createdAt: row.created_at,
        productTitle: product.title,
        productType: product.type as TestimonialType,
      }]
    })
  } catch {
    return []
  }
}
