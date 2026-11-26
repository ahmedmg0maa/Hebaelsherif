import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { PRESS_KINDS, type PressClassification, type PressKind } from '@/lib/press/governance'

export type PressMention = {
  id: string
  outlet: string
  title: string
  kind: PressKind
  sourceClassification: PressClassification
  originalUrl: string
  publishedOn: string
  excerpt: string
  isFeatured: boolean
  imageUrl: string | null
  imageAlt: string
  imageCaption: string
  imageCredit: string
}

type PressRow = {
  id: string; outlet: string; title: string; kind: PressKind; source_classification: PressClassification
  original_url: string; published_on: string; excerpt: string; is_featured: boolean
  media_assets: { bucket: string; path: string; alt: string; caption: string; credit: string; visibility: string; rights_status: string; rights_reference: string; archived_at: string | null } | { bucket: string; path: string; alt: string; caption: string; credit: string; visibility: string; rights_status: string; rights_reference: string; archived_at: string | null }[] | null
}

export async function listPublishedPress(kind?: string, limit = 60): Promise<PressMention[]> {
  if (!hasSupabasePublicConfig()) return []
  const selected = PRESS_KINDS.includes(kind as PressKind) ? kind as PressKind : null
  try {
    const supabase = await getServerClient()
    let query = supabase.from('press_mentions')
      .select('id, outlet, title, kind, source_classification, original_url, published_on, excerpt, is_featured, media_assets(bucket, path, alt, caption, credit, visibility, rights_status, rights_reference, archived_at)')
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
      .order('is_featured', { ascending: false })
      .order('published_on', { ascending: false })
      .limit(limit)
    if (selected) query = query.eq('kind', selected)
    const { data, error } = await query
    if (error) return []
    return ((data ?? []) as PressRow[]).map((row) => {
      const media = Array.isArray(row.media_assets) ? row.media_assets[0] : row.media_assets
      const usable = !media?.archived_at && media?.visibility === 'public' && media.bucket === 'public-media' && media.rights_status !== 'unverified' && Boolean(media.rights_reference)
      return {
        id: row.id, outlet: row.outlet, title: row.title, kind: row.kind, sourceClassification: row.source_classification,
        originalUrl: row.original_url, publishedOn: row.published_on, excerpt: row.excerpt, isFeatured: row.is_featured,
        imageUrl: usable ? supabase.storage.from(media.bucket).getPublicUrl(media.path).data.publicUrl : null,
        imageAlt: usable ? media.alt : '', imageCaption: usable ? media.caption : '', imageCredit: usable ? media.credit : '',
      }
    })
  } catch { return [] }
}
