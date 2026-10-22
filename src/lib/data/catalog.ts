import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { publicArticleCover, readingMinutes } from '@/lib/articles/presentation'
import { isPreviewExperienceEnabled, PREVIEW_BOOK, PREVIEW_COURSE } from '@/lib/preview/experience'

export type PreviewCourseLesson = {
  id: string
  module: string
  title: string
  durationMinutes: number
  summary: string
  body: string[]
  prompt: string
  practice: string[]
}

export type PreviewBookChapter = {
  id: string
  number: string
  title: string
  lead: string
  paragraphs: string[]
  prompt: string
  exercise: string[]
}

export type CatalogCourse = {
  slug: string
  title: string
  subtitle: string
  description: string
  price: number
  compareAtPrice: number | null
  level: string
  durationMinutes: number
  lessonsCount: number
  rating: number
  ratingCount: number
  coverUrl: string | null
  modules: { title: string; lessons: { title: string; durationSeconds: number; isPreview: boolean; previewText?: string }[] }[]
  isPreviewExperience?: boolean
  previewLessons?: PreviewCourseLesson[]
}

export type CatalogBook = {
  slug: string
  title: string
  subtitle: string
  description: string
  price: number
  compareAtPrice: number | null
  pagesCount: number | null
  coverUrl: string | null
  isPreviewExperience?: boolean
  previewChapters?: PreviewBookChapter[]
}

export type CatalogWorkshop = {
  slug: string
  title: string
  subtitle: string
  description: string
  price: number
  compareAtPrice: number | null
  startsAt: string
  endsAt: string
  seatsTotal: number
  seatsReserved: number
  locationKind: string
  coverUrl: string | null
}

export type CatalogService = {
  slug: string
  title: string
  subtitle: string
  description: string
  price: number
  durationMinutes: number
  availability: { weekday: number; startTime: string; endTime: string }[]
  coverUrl: string | null
}

export type CatalogArticle = {
  slug: string
  title: string
  excerpt: string
  content: string
  publishedAt: string | null
  coverUrl: string | null
  readingMinutes: number
}

const hasEnv = hasSupabasePublicConfig

// ——— Published catalog queries ———

export async function listCourses(): Promise<CatalogCourse[]> {
  if (!hasEnv()) return isPreviewExperienceEnabled() ? [PREVIEW_COURSE] : []
  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('courses')
      .select(
        'slug, title, description, level, duration_minutes, cover_url, products!inner(subtitle, price, compare_at_price, is_published), course_modules(title, sort, course_lessons(title, description, duration_seconds, sort, is_preview))',
      )
      .eq('is_published', true)
      .eq('products.is_published', true)
    if (!data) return []
    return data.map((c) => {
      const product = Array.isArray(c.products) ? c.products[0] : c.products
      const modules = (c.course_modules ?? [])
        .sort((a, b) => a.sort - b.sort)
        .map((m) => ({
          title: m.title,
          lessons: (m.course_lessons ?? [])
            .sort((a, b) => a.sort - b.sort)
            .map((l) => ({ title: l.title, durationSeconds: l.duration_seconds, isPreview: l.is_preview, previewText: l.is_preview ? l.description : undefined })),
        }))
      return {
        slug: c.slug,
        title: c.title,
        subtitle: product?.subtitle ?? '',
        description: c.description,
        price: Number(product?.price ?? 0),
        compareAtPrice: product?.compare_at_price ? Number(product.compare_at_price) : null,
        level: c.level,
        durationMinutes: c.duration_minutes,
        lessonsCount: modules.reduce((n, m) => n + m.lessons.length, 0),
        rating: 5,
        ratingCount: 0,
        coverUrl: c.cover_url,
        modules,
      }
    })
  } catch {
    return []
  }
}

export async function getCourse(slug: string): Promise<CatalogCourse | null> {
  const all = await listCourses()
  return all.find((c) => c.slug === slug) ?? null
}

export async function listBooks(): Promise<CatalogBook[]> {
  if (!hasEnv()) return isPreviewExperienceEnabled() ? [PREVIEW_BOOK] : []
  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('books')
      .select('slug, title, description, pages_count, cover_url, products!inner(subtitle, price, compare_at_price, is_published)')
      .eq('is_published', true)
      .eq('products.is_published', true)
    if (!data) return []
    return data.map((b) => {
      const product = Array.isArray(b.products) ? b.products[0] : b.products
      return {
        slug: b.slug,
        title: b.title,
        subtitle: product?.subtitle ?? '',
        description: b.description,
        price: Number(product?.price ?? 0),
        compareAtPrice: product?.compare_at_price ? Number(product.compare_at_price) : null,
        pagesCount: b.pages_count,
        coverUrl: b.cover_url,
      }
    })
  } catch {
    return []
  }
}

export async function getBook(slug: string): Promise<CatalogBook | null> {
  const all = await listBooks()
  return all.find((b) => b.slug === slug) ?? null
}

export async function listWorkshops(): Promise<CatalogWorkshop[]> {
  if (!hasEnv()) return []
  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('workshops')
      .select(
        'slug, title, description, starts_at, ends_at, seats_total, seats_reserved, location_kind, cover_url, products!inner(subtitle, price, compare_at_price, is_published)',
      )
      .eq('is_published', true)
      .eq('products.is_published', true)
      .order('starts_at', { ascending: true })
    if (!data) return []
    return data.map((w) => {
      const product = Array.isArray(w.products) ? w.products[0] : w.products
      return {
        slug: w.slug,
        title: w.title,
        subtitle: product?.subtitle ?? '',
        description: w.description,
        price: Number(product?.price ?? 0),
        compareAtPrice: product?.compare_at_price ? Number(product.compare_at_price) : null,
        startsAt: w.starts_at,
        endsAt: w.ends_at,
        seatsTotal: w.seats_total,
        seatsReserved: w.seats_reserved,
        locationKind: w.location_kind,
        coverUrl: w.cover_url,
      }
    })
  } catch {
    return []
  }
}

export async function getWorkshop(slug: string): Promise<CatalogWorkshop | null> {
  const all = await listWorkshops()
  return all.find((w) => w.slug === slug) ?? null
}

export async function listServices(): Promise<CatalogService[]> {
  if (!hasEnv()) return []
  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('services')
      .select('slug, title, description, duration_minutes, price, products!inner(subtitle, is_published, cover_url), availability_rules(weekday, start_time, end_time)')
      .eq('is_active', true)
      .eq('products.is_published', true)
    if (!data) return []
    return data.map((s) => {
      const product = Array.isArray(s.products) ? s.products[0] : s.products
      return {
        slug: s.slug,
        title: s.title,
        subtitle: product?.subtitle ?? '',
        description: s.description,
        price: Number(s.price),
        durationMinutes: s.duration_minutes,
        availability: (s.availability_rules ?? []).map((r) => ({
          weekday: r.weekday,
          startTime: r.start_time,
          endTime: r.end_time,
        })),
        coverUrl: product?.cover_url ?? null,
      }
    })
  } catch {
    return []
  }
}

export async function listArticles(): Promise<CatalogArticle[]> {
  if (!hasEnv()) return []
  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('articles')
      .select('slug, title, excerpt, content, published_at, cover_url')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
    if (!data) return []
    return data.map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      content: a.content,
      publishedAt: a.published_at,
      coverUrl: publicArticleCover(a.cover_url),
      readingMinutes: readingMinutes(a.content),
    }))
  } catch {
    return []
  }
}

export async function getArticle(slug: string): Promise<CatalogArticle | null> {
  const all = await listArticles()
  return all.find((a) => a.slug === slug) ?? null
}

// Formatting helpers live in '@/lib/format' (client-safe); re-exported here for server pages.
export { formatPrice, formatDuration, weekdayNames } from '../format'
