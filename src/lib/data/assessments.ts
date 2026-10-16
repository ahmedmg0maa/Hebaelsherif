import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { validateGuidedAssessmentContent, type GuidedAssessmentContent } from '@/lib/assessments/governance'

export type PublishedGuidedAssessment = { id: string; version: number; name: string; publishedAt: string | null; content: GuidedAssessmentContent }

type PublishedRow = {
  id: string
  version: number
  content: unknown
  published_at: string | null
  guided_assessments: { name: string; slug: string; published_version_id: string } | { name: string; slug: string; published_version_id: string }[] | null
}

export async function getPublishedGuidedAssessment(): Promise<PublishedGuidedAssessment | null> {
  if (!hasSupabasePublicConfig()) return null
  try {
    const supabase = await getServerClient()
    const { data, error } = await supabase.from('guided_assessment_versions')
      .select('id, version, content, published_at, guided_assessments!inner(name, slug, published_version_id)')
      .eq('status', 'published').eq('guided_assessments.slug', 'start-here').limit(1).maybeSingle()
    if (error || !data) return null
    const row = data as unknown as PublishedRow
    const assessment = Array.isArray(row.guided_assessments) ? row.guided_assessments[0] : row.guided_assessments
    if (!assessment || assessment.published_version_id !== row.id) return null
    const content = validateGuidedAssessmentContent(row.content)
    return content.ok ? { id: row.id, version: row.version, name: assessment.name, publishedAt: row.published_at, content: content.value } : null
  } catch { return null }
}
