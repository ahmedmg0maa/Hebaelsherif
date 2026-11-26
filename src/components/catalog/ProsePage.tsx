export type ProseSection = { heading: string; paragraphs: string[]; bullets?: string[] }

export function ProsePage({
  eyebrow,
  title,
  lead,
  sections,
  updatedAt,
}: {
  eyebrow: string
  title: string
  lead: string
  sections: ProseSection[]
  updatedAt?: string
}) {
  return (
    <main className="mx-auto min-w-0 max-w-4xl break-words px-5 py-14 sm:px-8 md:py-20">
      <header className="mb-12 text-center">
        <p className="mb-3 text-sm font-semibold text-burgundy">{eyebrow}</p>
        <h1 className="font-heading text-4xl font-bold leading-snug text-deep-teal sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-xl leading-loose text-text-soft">{lead}</p>
        {updatedAt && <p className="tnum mt-4 text-sm text-text-soft">آخر تحديث: {updatedAt}</p>}
        <span className="mx-auto mt-6 block h-px w-16 bg-antique-gold" aria-hidden />
      </header>
      <div className="space-y-10 rounded-2xl border border-line bg-surface-raised p-5 sm:p-10">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="mb-3 font-heading text-2xl font-bold text-deep-teal">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mb-3 whitespace-pre-wrap leading-loose text-ink">
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="mt-3 space-y-2">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-3 leading-relaxed text-ink">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-antique-gold" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
