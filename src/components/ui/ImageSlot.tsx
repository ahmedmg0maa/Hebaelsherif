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
      className={`group relative overflow-hidden rounded-[2rem] border border-sand bg-[linear-gradient(135deg,rgb(var(--color-sand)/.62),rgb(var(--color-ivory)/.9),rgb(var(--color-petrol)/.08))] shadow-soft ${ratioClasses[ratio]} ${className}`}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/55 bg-white/34 text-sm font-black text-petrol backdrop-blur-md">
            IMAGE
          </div>
          <p className="text-sm font-black text-petrol">{label}</p>
          <p className="mt-2 max-w-xs text-xs leading-6 text-warm-gray">{hint}</p>
        </div>
      )}
    </div>
  )
}
