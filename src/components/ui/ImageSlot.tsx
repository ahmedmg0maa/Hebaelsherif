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
}

const ratioClasses = {
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
  wide: 'aspect-[16/7]',
  free: '',
}

export default function ImageSlot({
  src,
  fallbackSrc = '',
  alt = 'Heba ElSherif image slot',
  ratio = 'video',
  label = 'مكان صورة جاهز',
  hint = 'يمكن إضافة الصورة لاحقًا من لوحة الإدارة أو رابط خارجي.',
  className = '',
  priority = false,
}: ImageSlotProps) {
  const imageSrc = src?.trim() || fallbackSrc.trim()

  return (
    <div
      className={`group relative overflow-hidden rounded-[2rem] border border-sand bg-[linear-gradient(135deg,rgb(var(--color-sand)/.75),rgb(var(--color-ivory)/.85),rgb(var(--color-gold)/.18))] shadow-soft ${ratioClasses[ratio]} ${className}`}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          priority={priority}
          className="object-cover transition duration-700 group-hover:scale-[1.035]"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/50 bg-white/35 text-2xl text-burgundy backdrop-blur-md">
            ✦
          </div>
          <p className="text-sm font-black text-burgundy">{label}</p>
          <p className="mt-2 max-w-xs text-xs leading-6 text-warm-gray">{hint}</p>
        </div>
      )}
    </div>
  )
}
