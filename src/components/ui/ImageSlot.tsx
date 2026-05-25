import Image from 'next/image'
import BrandOrnament from '@/components/brand/BrandOrnament'

type SlotRatio = 'video' | 'portrait' | 'square' | 'wide' | 'book' | 'free'
type SlotVariant = 'portrait' | 'course' | 'book' | 'session' | 'hero' | 'brand' | 'soft'

interface ImageSlotProps {
  src?: string
  fallbackSrc?: string
  alt?: string
  ratio?: SlotRatio
  label?: string
  hint?: string
  className?: string
  priority?: boolean
  variant?: SlotVariant
  showLabel?: boolean
}

const ratioClasses: Record<SlotRatio, string> = {
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
  wide: 'aspect-[16/7]',
  book: 'aspect-[2.8/4]',
  free: '',
}

const variantClasses: Record<SlotVariant, string> = {
  portrait: 'from-cream via-ivory to-gold/20',
  course: 'from-petrol/12 via-ivory to-gold/18',
  book: 'from-olive/12 via-ivory to-gold/16',
  session: 'from-burgundy/8 via-ivory to-petrol/10',
  hero: 'from-cream via-ivory to-petrol/10',
  brand: 'from-petrol/10 via-cream to-aqua/10',
  soft: 'from-sand/70 via-ivory to-cream',
}

export default function ImageSlot({
  src,
  fallbackSrc = '',
  alt = 'Heba ElSherif visual space',
  ratio = 'video',
  label = 'مساحة الصورة',
  hint = 'تكوين بصري هادئ من هوية هبة الشريف.',
  className = '',
  priority = false,
  variant = 'soft',
  showLabel = true,
}: ImageSlotProps) {
  const imageSrc = src?.trim() || fallbackSrc.trim()

  return (
    <div
      className={`group botanical-frame paper-texture relative overflow-hidden rounded-[2.25rem] border border-sand bg-gradient-to-br shadow-soft ${variantClasses[variant]} ${ratioClasses[ratio]} ${className}`}
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
          <div className="absolute -right-16 top-8 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
          <div className="absolute -left-16 bottom-8 h-60 w-60 rounded-full bg-petrol/14 blur-3xl" />
          <div className="absolute inset-x-8 bottom-8 top-8 rounded-[2rem] border border-gold/25 bg-ivory/20 backdrop-blur-[1px] dark:border-gold/10 dark:bg-deep-teal/20" />
          <div className="ornamental-corner ornamental-corner-top" />
          <div className="ornamental-corner ornamental-corner-bottom" />
          <div className="absolute left-8 top-8 h-24 w-24 rounded-full border border-gold/30" />
          <div className="absolute bottom-10 right-10 h-32 w-24 rounded-full border border-petrol/20" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent,rgb(var(--color-cream)/.22),transparent)]" />

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
            <div className="relative mb-5 h-24 w-32 overflow-hidden rounded-[1.75rem] border border-gold/25 bg-ivory/72 p-2 text-petrol shadow-soft backdrop-blur-sm dark:bg-cream/90">
              <Image src="/images/brand/logo-symbol.png" alt="" fill className="object-contain p-2" sizes="128px" />
            </div>
            <BrandOrnament className="mb-3 scale-75" />
            {showLabel ? <p className="text-lg font-black text-petrol dark:text-gold">{label}</p> : null}
            {showLabel ? <p className="mt-2 max-w-xs text-xs font-bold leading-6 text-warm-gray">{hint}</p> : null}
          </div>
        </div>
      )}
    </div>
  )
}
