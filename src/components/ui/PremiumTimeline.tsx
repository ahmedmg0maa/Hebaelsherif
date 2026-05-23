interface TimelineItem {
  title: string
  description: string
}

export default function PremiumTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative space-y-4">
      <span className="absolute right-5 top-4 h-[calc(100%-2rem)] w-px bg-sand" />
      {items.map((item, index) => (
        <div key={item.title} className="relative pr-14">
          <span className="absolute right-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-petrol text-xs font-black text-ivory shadow-soft">
            {index + 1}
          </span>
          <div className="rounded-[1.5rem] border border-sand bg-ivory/85 p-5 shadow-soft backdrop-blur-sm">
            <h3 className="text-base font-black text-charcoal">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-warm-gray">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
