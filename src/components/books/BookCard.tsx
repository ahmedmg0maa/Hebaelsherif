import Link from 'next/link'
import PremiumBadge from '@/components/ui/PremiumBadge'
import ImageSlot from '@/components/ui/ImageSlot'
import { formatEGP } from '@/lib/utils/formatters'
import type { Book } from '@/types'

interface BookCardProps {
  book: Book
  featured?: boolean
}

export default function BookCard({ book, featured = false }: BookCardProps) {
  return (
    <Link
      href={`/books/${book.slug}`}
      className="group premium-glow-border block overflow-hidden rounded-[2rem] border border-sand bg-ivory/90 shadow-soft backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-premium dark:bg-deep-teal/55"
    >
      <div className="relative p-3">
        <ImageSlot
          src={book.coverImageUrl}
          alt={book.title}
          ratio="book"
          variant="book"
          label="غلاف الكتاب"
          hint="غلاف بصري للكتاب."
          className="rounded-[1.65rem] shadow-soft"
          showLabel={!book.coverImageUrl}
        />

        <div className="absolute right-6 top-6 flex flex-wrap gap-2">
          {featured ? <PremiumBadge variant="gold">مميز</PremiumBadge> : null}
          {book.category ? <PremiumBadge variant="olive">{book.category}</PremiumBadge> : null}
        </div>
      </div>

      <div className="p-6 pt-3">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-black text-warm-gray">
          <span className="rounded-full border border-sand bg-cream px-3 py-1">كتاب رقمي</span>
          {book.pagesCount ? (
            <span className="rounded-full border border-sand bg-cream px-3 py-1">{book.pagesCount} صفحة</span>
          ) : null}
          {book.rating ? (
            <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-gold">★ {book.rating}</span>
          ) : null}
        </div>

        <h3 className="text-xl font-black leading-snug text-charcoal transition group-hover:text-petrol">
          {book.title}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-7 text-warm-gray">
          {book.shortDescription || book.emotionalPromise || book.description}
        </p>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-sand pt-5">
          {Number(book.price) > 0 ? <span className="text-lg font-black text-petrol dark:text-gold">{formatEGP(book.price)}</span> : <span className="text-lg font-black text-petrol dark:text-gold">يُعلن عند الفتح</span>}
          <span className="rounded-full border border-petrol/20 bg-petrol/10 px-4 py-2 text-xs font-black text-petrol transition group-hover:bg-petrol group-hover:text-cream">
            تفاصيل الكتاب
          </span>
        </div>
      </div>
    </Link>
  )
}
