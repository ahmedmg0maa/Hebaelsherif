import { selectedArticleSlugs } from '@/lib/home/articles'
import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { publicArticleCover, readingMinutes } from '@/lib/articles/presentation'

export type HomeOffer = import('@/components/marketing/OfferCard').OfferPresentation

export type HomeArticle = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string | null
  coverUrl: string | null
  readingMinutes: number
}

export type HomeTestimonial = {
  displayName: string
  rating: number
  comment: string
}

export type HomePressMention = { id: string; outlet: string; title: string; originalUrl: string; publishedOn: string }
export type HomeResource = { id: string; slug: string; title: string; excerpt: string; kind: string; topic: string }

export type HomeData = {
  offer: HomeOffer | null
  articles: HomeArticle[]
  testimonials: HomeTestimonial[]
  press: HomePressMention[]
  resources: HomeResource[]
}

// Public social proof and promotions are data-only. Missing configuration or
// query failures render honest empty sections instead of invented fallbacks.
const EMPTY_HOME_DATA: HomeData = { offer: null, articles: [], testimonials: [], press: [], resources: [] }

const hasEnv = hasSupabasePublicConfig

export async function getHomeData(): Promise<HomeData> {
  if (!hasEnv()) return EMPTY_HOME_DATA
  try {
    const supabase = await getServerClient()
    const [offerRes, articlesRes, resourcesRes, reviewsRes, pressRes] = await Promise.all([
      supabase
        .from('offers')
        .select('id,title,description,badge_text,ends_at,cta_label,cta_href,terms,discount_kind,discount_value')
        .eq('show_on_home',true)
        .lte('starts_at',new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('articles')
        .select('slug, title, excerpt, published_at, cover_url, content')
        .eq('is_published', true)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3),
      supabase
        .from('resources')
        .select('id, slug, title, excerpt, kind, topic')
        .eq('status', 'published')
        .eq('is_featured', true)
        .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
        .order('publish_at', { ascending: false })
        .limit(3),
      supabase
        .from('reviews')
        .select('display_name, display_name_consent, rating, comment')
        .eq('status', 'approved')
        .eq('is_approved', true)
        .eq('is_featured', true)
        .eq('verified_purchase', true)
        .not('publication_consent_at', 'is', null)
        .limit(6),
      supabase
        .from('press_mentions')
        .select('id, outlet, title, original_url, published_on')
        .eq('status', 'published')
        .eq('is_featured', true)
        .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
        .order('published_on', { ascending: false })
        .limit(3),
    ])

    // Missing rows remain absent and their sections hide themselves.
    return {
      offer: offerRes.data
        ? {
            id: offerRes.data.id,
            ctaLabel:offerRes.data.cta_label,ctaHref:offerRes.data.cta_href,terms:offerRes.data.terms,discountKind:offerRes.data.discount_kind,discountValue:offerRes.data.discount_value==null?null:Number(offerRes.data.discount_value),
            title: offerRes.data.title,
            description: offerRes.data.description,
            badgeText: offerRes.data.badge_text ?? '',
            endsAt: offerRes.data.ends_at,
          }
        : null,
      articles: (articlesRes.data ?? []).map((a) => ({
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        publishedAt: a.published_at,
        coverUrl: publicArticleCover(a.cover_url),
        readingMinutes: readingMinutes(a.content),
      })),
      testimonials: (reviewsRes.data ?? []).map((r) => ({
        displayName: r.display_name_consent && r.display_name ? r.display_name : 'عميلة موثقة',
        rating: r.rating,
        comment: r.comment,
      })),
      press: (pressRes.data ?? []).map((row) => ({ id: row.id, outlet: row.outlet, title: row.title, originalUrl: row.original_url, publishedOn: row.published_on })),
      resources: (resourcesRes.data ?? []).map((row) => ({ id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt, kind: row.kind, topic: row.topic })),
    }
  } catch {
    return EMPTY_HOME_DATA
  }
}

// Selection is resolved against current publication state on every server read.
export async function getSelectedHomeArticles(slugs: string[]): Promise<HomeArticle[]> {
  const selected = selectedArticleSlugs(slugs)
  if (!hasEnv() || !selected.length) return []
  try {
    const client = await getServerClient()
    const { data, error } = await client.from('articles').select('slug,title,excerpt,published_at,cover_url,content').eq('is_published', true).eq('status', 'published').in('slug', selected).limit(3)
    if (error) return []
    return selected.flatMap(slug => {
      const a = data?.find(row => row.slug === slug)
      return a ? [{ slug: a.slug, title: a.title, excerpt: a.excerpt, publishedAt: a.published_at, coverUrl: publicArticleCover(a.cover_url), readingMinutes: readingMinutes(a.content) }] : []
    })
  } catch { return [] }
}
export async function getHomeArticleOptions(): Promise<{ slug: string; title: string }[]> {
  if (!hasEnv()) return []
  const client = await getServerClient()
  const { data, error } = await client.from('articles').select('slug,title').eq('is_published', true).eq('status', 'published').order('published_at', { ascending: false }).limit(200)
  if (error) throw new Error('ADMIN_ARTICLE_OPTIONS_UNAVAILABLE')
  return data ?? []
}
