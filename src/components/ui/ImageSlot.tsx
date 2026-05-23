import Image from 'next/image'

interface ImageSlotProps {
  src?: string
  fallbackSrc: string
  alt: string
  ratio?: 'video' | 'portrait' | 'square' | 'wide'
  label?: string
  className?: string
  priority?: boolean
}

const ratioClasses = {
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  square: 'aspect-square',
  wide: 'aspect-[16/7]',
}

export default function ImageSlot({
  src,
  fallbackSrc,
  alt,
  ratio = 'video',
  label = 'Image slot',
  className = '',
  priority = false,
}: ImageSlotProps) {
  const imageSrc = src && src.trim() ? src : fallbackSrc

  return (
    <div className={`group relative overflow-hidden rounded-[2rem] border border-sand bg-cream shadow-soft ${ratioClasses[ratio]} ${className}`}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        priority={priority}
        className="object-cover transition duration-700 group-hover:scale-[1.035]"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      {!src ? (
        <div className="absolute bottom-4 right-4 rounded-full border border-white/40 bg-ivory/80 px-4 py-2 text-xs font-black text-burgundy shadow-soft backdrop-blur-md">
          {label}
        </div>
      ) : null}
    </div>
  )
}
