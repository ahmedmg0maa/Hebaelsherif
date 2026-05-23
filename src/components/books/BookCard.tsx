import Image from 'next/image'
import Link from 'next/link'
import PremiumBadge from '@/components/ui/PremiumBadge'
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
      className="group premium-glow-border block overflow-hidden rounded-[2rem] border border-sand bg-ivory/90 shadow-soft backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-premium"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-sand">
        {book.coverImageUrl ? (
          <Image
            src={book.coverImageUrl}
            alt={book.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        ) : (
          <div className="book-art flex h-full items-end p-5">
            <span className="rounded-full bg-white/60 px-4 py-2 text-xs font-black text-petrol backdrop-blur-md">كتاب رقمي</span>
          </div>
        )}
        {featured ? <PremiumBadge className="absolute right-4 top-4" variant="gold">مميز</PremiumBadge> : null}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-black leading-snug text-charcoal transition group-hover:text-petrol">{book.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-warm-gray">{book.shortDescription || book.description}</p>
        <div className="mt-6 flex items-center justify-between gap-4">
          <span className="text-lg font-black text-petrol">{formatEGP(book.price)}</span>
          <span className="rounded-full border border-petrol/20 bg-petrol/10 px-4 py-2 text-xs font-black text-petrol">التفاصيل</span>
        </div>
      </div>
    </Link>
  )
}
