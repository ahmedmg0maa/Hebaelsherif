import Image from 'next/image'
import { HeroLight } from '@/components/motion/HeroLight'
import { Button } from '@/components/ui/Button'
import type { HomeCopy } from '@/lib/data/cms'
import type { OwnerProfile } from '@/lib/owner/profile'
import type { ResolvedHomeMedia } from '@/lib/home/media'
import { HOME_PRESENTATION } from '@/lib/home/presentation'

export function Hero({copy,profile,media}:{copy:HomeCopy;profile?:OwnerProfile;media?:ResolvedHomeMedia}) {
 return <section className="learning-hero" aria-labelledby="home-hero-title">
  <HeroLight />
  <div className="learning-hero-copy journey-surface">
   <p className="hero-detail hero-detail-1 text-sm font-semibold leading-7 text-deep-teal">{copy.eyebrow}</p>
   <p className="hero-detail hero-detail-1 mt-3 text-sm text-burgundy">التغيير الحقيقي يبدأ بالفهم</p>
   <h1 id="home-hero-title" className="hero-detail hero-detail-2 learning-hero-title mt-5 font-heading font-bold text-deep-teal">
    <span>{copy.headlineStart} {copy.headlineAccent}</span>{' '}
    <span>{copy.headlineMiddle} {copy.headlinePath}</span>{' '}
    <span>{copy.headlineEnd} <span className="text-burgundy">{copy.headlineAwareness}</span></span>
   </h1>
   <p className="hero-detail hero-detail-3 learning-hero-lead mt-6 max-w-lg text-base leading-[2] text-text-soft sm:text-lg">{copy.lead}</p>
   <div className="hero-detail hero-detail-4 hero-actions mt-7 flex flex-wrap gap-3">
    <Button href={HOME_PRESENTATION.heroLinks.secondary} size="lg" className="rounded-xl">{copy.secondaryCta}<span aria-hidden>←</span></Button>
    <Button href={HOME_PRESENTATION.heroLinks.primary} variant="secondary" size="lg" className="rounded-xl">{copy.primaryCta}</Button>
   </div>
   {profile?.professionalLine && profile.professionalLine !== copy.eyebrow && <p className="hero-detail hero-detail-4 learning-hero-profile mt-5 text-xs leading-7 text-text-soft">{profile.professionalLine}</p>}
  </div>
  <div className="learning-hero-photo">
   <Image src={media?.url??HOME_PRESENTATION.heroImage.url} alt={media?.alt??HOME_PRESENTATION.heroImage.alt} fill preload fetchPriority="high" unoptimized sizes="(min-width:1024px) 52vw,100vw" className="object-cover" style={{objectPosition:media?`${media.x}% ${media.y}%`:'50% 50%'}} />
   <div className="learning-photo-caption"><span className="h-2 w-2 rounded-full bg-antique-gold" aria-hidden />{copy.imageTitle} · {copy.imageLead}</div>
  </div>
 </section>
}
