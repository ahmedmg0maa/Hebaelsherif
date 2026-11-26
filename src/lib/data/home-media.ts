import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import type { HomeSection } from '@/lib/home/sections'
import { publicArticleCover } from '@/lib/articles/presentation'

export async function resolveHomeMedia(sections: HomeSection[]): Promise<HomeSection[]> {
  const ids = [...new Set(sections.flatMap(section => Object.values(section.content.media ?? {}).map(item => item.assetId)))]
  if (!ids.length || !hasSupabasePublicConfig()) return sections
  try {
    const client = await getServerClient()
    const { data, error } = await client.from('media_assets').select('id,bucket,path').in('id', ids).eq('bucket', 'public-media').eq('visibility', 'public').eq('kind', 'image').is('archived_at', null).in('rights_status', ['owned', 'licensed', 'public_domain']).neq('rights_reference', '')
    if (error) return sections
    const urls = new Map((data ?? []).map(asset => [asset.id, publicArticleCover(client.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl)]))
    return sections.map(section => ({ ...section, media: Object.fromEntries(Object.entries(section.content.media ?? {}).flatMap(([slot, ref]) => { const url = urls.get(ref.assetId); return url ? [[slot, { ...ref, url }]] : [] })) }))
  } catch { return sections }
}
