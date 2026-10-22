import { getSelectedHomeArticles } from '@/lib/data/home'
import type { OwnerProfile } from '@/lib/owner/profile'
import type { HomeData } from '@/lib/data/home'
import type { HomeCopy } from '@/lib/data/cms'
import type { ArticlesContent, CtaContent, EditorialFeatureContent, GuidedStartContent, HomeSection, NewsletterContent, PathwaysContent, PressContent, TestimonialsContent } from '@/lib/home/sections'
import { Hero } from '@/components/home/Hero'
import { TrustStrip } from '@/components/home/TrustStrip'
import { ServiceCards } from '@/components/home/ServiceCards'
import { PublishedCatalog } from '@/components/home/PublishedCatalog'
import { JourneyMap } from '@/components/home/JourneyMap'
import { LearningTour } from '@/components/home/LearningTour'
import { OfferBlock } from '@/components/home/OfferBlock'
import { ReadingShelf } from '@/components/home/ReadingShelf'
import { listBooks } from '@/lib/data/catalog'
import { Testimonials } from '@/components/home/Testimonials'
import { PressHighlights } from '@/components/home/PressHighlights'
import { FeaturedResources } from '@/components/home/FeaturedResources'
import { FinalCta } from '@/components/home/FinalCta'
import { NewsletterSignup } from '@/components/home/NewsletterSignup'
import { Reveal } from '@/components/ui/Reveal'
import type { GuidedAssessmentContent } from '@/lib/assessments/governance'
import { normalizeHomeCopy } from '@/lib/home/hero'
import type { NarrativeContent } from '@/lib/home/sections'
import { NarrativeSection } from './NarrativeSection'

export async function HomeSectionRenderer({ section, copy, data, profile, assessment, preview = false, newsletterEnabled = false }: { section: HomeSection; copy: HomeCopy; data: HomeData; profile?: OwnerProfile; assessment?: { content: GuidedAssessmentContent; version: number } | null; preview?: boolean; newsletterEnabled?: boolean }) {
  if (section.kind === 'hero') return <Hero copy={normalizeHomeCopy(section.content, copy)} profile={profile} media={section.media?.main} />
  let content: React.ReactNode = null
  if (section.kind === 'trust') content = <TrustStrip profile={profile} />
  else if (section.kind === 'manifesto' || section.kind === 'quote') content = <NarrativeSection content={section.content as NarrativeContent} quote={section.kind === 'quote'} media={section.media?.main} />
  else if (section.kind === 'pathways') content = <><ServiceCards content={section.content as PathwaysContent} media={section.media} /><PublishedCatalog /></>
  else if (section.kind === 'guided_start') content = <JourneyMap content={section.content as GuidedStartContent} assessment={assessment} />
  else if (section.kind === 'editorial_feature') content = <LearningTour content={section.content as EditorialFeatureContent} media={section.media?.main} />
  else if (section.kind === 'offer') content = <OfferBlock offer={data.offer} ctaLabel={(section.content as { ctaLabel: string }).ctaLabel} />
  else if (section.kind === 'articles') {
    const articleContent = section.content as ArticlesContent
    const articles = articleContent.selectedSlugs?.length ? await getSelectedHomeArticles(articleContent.selectedSlugs) : data.articles
    content = <ReadingShelf books={(await listBooks()).slice(0,4)} articles={articles} content={articleContent} />
  }
  else if (section.kind === 'resources') content = <FeaturedResources resources={data.resources} content={section.content as ArticlesContent} />
  else if (section.kind === 'testimonials') content = <Testimonials testimonials={data.testimonials} content={section.content as TestimonialsContent} />
  else if (section.kind === 'press') content = <PressHighlights mentions={data.press} content={section.content as PressContent} />
  else if (section.kind === 'newsletter') content = preview || newsletterEnabled ? <NewsletterSignup content={section.content as NewsletterContent} preview={preview} /> : null
  else if (section.kind === 'cta') content = <FinalCta content={section.content as CtaContent} media={section.media?.main} />
  return content ? <Reveal>{content}</Reveal> : null
}
