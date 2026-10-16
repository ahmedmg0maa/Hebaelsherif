import Image from 'next/image'
export function CatalogCoverImage({ url, title, className = '', fit = 'cover' }: { url: string | null; title: string; className?: string; fit?: 'cover' | 'contain' }) {
  if (!url) return null
  return <div className={`relative overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-card ${className}`}><Image src={url} alt={`غلاف ${title}`} fill unoptimized sizes="(min-width: 1024px) 640px, 100vw" className={fit === 'contain' ? 'object-contain p-3' : 'object-cover'} /></div>
}
