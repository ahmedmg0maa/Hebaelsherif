import { Badge } from '@/components/ui/Badge'
import { PRESS_CLASSIFICATION_LABELS, PRESS_KIND_LABELS } from '@/lib/press/governance'
import type { PressMention } from '@/lib/data/press'

export function PressCard({ mention, preview = false }: { mention: PressMention; preview?: boolean }) {
  return (
    <article className="group grid overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-card md:grid-cols-[15rem_1fr]">
      {mention.imageUrl ? (
        <figure className="relative min-h-52 overflow-hidden bg-sand/40">
          <span role="img" aria-label={mention.imageAlt || `صورة ظهور لدى ${mention.outlet}`} className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${mention.imageUrl})` }} />
          {(mention.imageCaption || mention.imageCredit) && <figcaption className="absolute inset-x-0 bottom-0 bg-deep-teal/88 px-3 py-2 text-xs text-on-dark">{mention.imageCaption}{mention.imageCredit ? ` — ${mention.imageCredit}` : ''}</figcaption>}
        </figure>
      ) : <div className="heritage-paper flex min-h-40 items-center justify-center bg-sand/35 px-6 text-center text-sm font-bold text-deep-teal">{mention.outlet}</div>}
      <div className="flex flex-col p-6 md:p-8">
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold">{PRESS_KIND_LABELS[mention.kind]}</Badge>
          <Badge tone={mention.sourceClassification === 'independent_editorial' ? 'teal' : 'sand'}>{PRESS_CLASSIFICATION_LABELS[mention.sourceClassification]}</Badge>
          {preview && <Badge tone="pending">معاينة إدارية</Badge>}
        </div>
        <p className="mt-4 text-sm font-bold text-antique-gold">{mention.outlet} · <time dateTime={mention.publishedOn}>{new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' }).format(new Date(`${mention.publishedOn}T12:00:00Z`))}</time></p>
        <h2 className="mt-2 text-2xl font-bold leading-snug text-deep-teal">{mention.title}</h2>
        {mention.excerpt && <p className="mt-4 line-clamp-4 leading-loose text-text-soft">{mention.excerpt}</p>}
        <a href={mention.originalUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 w-fit items-center font-bold text-burgundy underline decoration-antique-gold/50 underline-offset-4 hover:text-deep-teal">المصدر الأصلي<span className="sr-only"> — يفتح في نافذة جديدة</span></a>
      </div>
    </article>
  )
}
