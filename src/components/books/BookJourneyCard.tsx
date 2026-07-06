import Image from 'next/image'
import Link from 'next/link'
import type { Book } from '@/types'
import { formatEGP } from '@/lib/utils/formatters'

export default function BookJourneyCard({ book }: { book: Book }) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-sand bg-ivory shadow-soft transition hover:-translate-y-1 dark:border-gold/25 dark:bg-white/10">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        <Image src={book.coverImageUrl || '/images/books/book-default.jpg'} alt={book.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <div className="space-y-3 p-5">
        <p className="text-xs font-black text-gold">كتاب رقمي</p>
        <h3 className="text-xl font-black text-charcoal dark:text-ivory">{book.title}</h3>
        <p className="line-clamp-3 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{book.shortDescription || book.emotionalPromise || book.description}</p>
        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="font-black text-petrol dark:text-gold">{formatEGP(book.price || 0)}</span>
          <Link href={`/books/${book.slug}`} className="rounded-full bg-gold px-4 py-2 text-xs font-black text-deepTeal">التفاصيل</Link>
        </div>
      </div>
    </article>
  )
}
