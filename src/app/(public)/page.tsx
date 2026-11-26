import { getHomeData } from '@/lib/data/home'
import { getHomeCopy, getOwnerProfile, getPublishedCmsPage, getPublishedHomeSections } from '@/lib/data/cms'
import { HomeSectionRenderer } from '@/components/home/HomeSectionRenderer'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { hasSupabaseServerSecret } from '@/lib/supabase/server'
import { getPublishedGuidedAssessment } from '@/lib/data/assessments'

export const revalidate = 300

export default async function HomePage() {
  const [data, copy, sections, approvedPrivacy, assessment, profile] = await Promise.all([getHomeData(), getHomeCopy(), getPublishedHomeSections(), getPublishedCmsPage('privacy'), getPublishedGuidedAssessment(), getOwnerProfile()])
  const newsletterEnabled = Boolean(approvedPrivacy) && hasSupabasePublicConfig() && hasSupabaseServerSecret()

  return (
    <main>
      {sections.map((section) => (
        <div key={section.id} className="contents">
          <HomeSectionRenderer section={section} copy={copy} data={data} profile={profile} assessment={assessment} newsletterEnabled={newsletterEnabled} />
        </div>
      ))}
    </main>
  )
}
