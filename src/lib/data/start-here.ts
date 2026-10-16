import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { defaultStartHereContent, normalizeStartHereContent } from '@/lib/start-here/content'

export async function getStartHereContent() {
  if (!hasSupabasePublicConfig()) return defaultStartHereContent
  try {
    const supabase = await getServerClient()
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'start_here_experience').eq('is_public', true).maybeSingle()
    return error || !data ? defaultStartHereContent : normalizeStartHereContent(data.value)
  } catch {
    return defaultStartHereContent
  }
}

