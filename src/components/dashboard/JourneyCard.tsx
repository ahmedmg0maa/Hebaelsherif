import Link from 'next/link'

export default function JourneyCard({ title, description, href, action = 'متابعة' }: { title: string; description: string; href: string; action?: string }) {
  return (
    <article className="rounded-[1.75rem] border border-sand bg-ivory p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
      <h3 className="text-lg font-black text-charcoal dark:text-ivory">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{description}</p>
      <Link href={href} className="mt-5 inline-flex rounded-full bg-gold px-4 py-2 text-xs font-black text-deepTeal">{action}</Link>
    </article>
  )
}
