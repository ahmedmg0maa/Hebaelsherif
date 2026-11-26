import { defaultOwnerProfile, type OwnerProfile } from '@/lib/owner/profile'

export function TrustStrip({ profile = defaultOwnerProfile }: { profile?: OwnerProfile }) {
  const credentials = profile.credentials.filter(item => item.verified)
  if (!credentials.length) return null
  return <section className="journey-surface border-y border-line bg-surface-raised px-5 py-7 sm:px-8" aria-label="الاعتمادات والخبرة">
    <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-12 gap-y-6">
      {credentials.map((item, index) => <div key={index} className="flex min-w-0 flex-1 basis-60 items-center justify-center gap-5 sm:justify-start">
        <p className="shrink-0 font-heading text-3xl font-bold text-deep-teal" dir="auto">{item.value}</p>
        <p className="max-w-52 text-sm leading-loose text-text-soft">{item.label}</p>
      </div>)}
    </div>
  </section>
}
