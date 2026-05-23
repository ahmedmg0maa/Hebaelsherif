import Image from 'next/image'

interface ImageSlotProps {
  src?: string
  fallbackSrc?: string
  alt?: string
  ratio?: 'video' | 'portrait' | 'square' | 'wide' | 'free'
  label?: string
  hint?: string
  className?: string
  priority?: boolean
  variant?: 'portrait' | 'course' | 'book' | 'session' | 'soft'
}

const ratioClasses = {
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
  wide: 'aspect-[16/7]',
  free: '',
}

const variantClasses = {
  portrait: 'from-cream via-ivory to-gold/18',
  course: 'from-petrol/12 via-ivory to-gold/18',
  book: 'from-olive/12 via-ivory to-gold/16',
  session: 'from-burgundy/10 via-ivory to-petrol/10',
  soft: 'from-sand/70 via-ivory to-cream',
}

export default function ImageSlot({
  src,
  fallbackSrc = '',
  alt = 'Heba ElSherif visual space',
  ratio = 'video',
  label = 'Visual slot',
  hint = 'Brand image can be added later.',
  className = '',
  priority = false,
  variant = 'soft',
}: ImageSlotProps) {
  const imageSrc = src?.trim() || fallbackSrc.trim()

  return (
    <div
      className={`group relative overflow-hidden rounded-[2rem] border border-sand bg-gradient-to-br ${variantClasses[variant]} shadow-soft ${ratioClasses[ratio]} ${className}`}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          priority={priority}
          className="object-cover transition duration-700 group-hover:scale-[1.025]"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <span className="sr-only">{label}. {hint}</span>
          <div className="absolute -right-16 top-8 h-52 w-52 rounded-full bg-gold/18 blur-3xl" />
          <div className="absolute -left-16 bottom-8 h-56 w-56 rounded-full bg-petrol/12 blur-3xl" />
          <div className="absolute inset-x-8 bottom-8 top-8 rounded-[1.75rem] border border-white/45 bg-white/14 backdrop-blur-[1px]" />
          <div className="absolute left-8 top-8 h-24 w-24 rounded-full border border-gold/30" />
          <div className="absolute bottom-10 right-10 h-32 w-24 rounded-full border border-petrol/20" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent,rgba(255,255,255,.26),transparent)]" />
        </div>
      )}
    </div>
  )
}
