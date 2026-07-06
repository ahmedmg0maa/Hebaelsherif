interface PremiumSkeletonProps {
  className?: string
}

export default function PremiumSkeleton({ className = '' }: PremiumSkeletonProps) {
  return <div className={`animate-pulse rounded-3xl bg-sand/80 ${className}`} />
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-sand bg-ivory/90">
      <PremiumSkeleton className="aspect-video rounded-none" />
      <div className="space-y-3 p-6">
        <PremiumSkeleton className="h-3 w-24" />
        <PremiumSkeleton className="h-6 w-3/4" />
        <PremiumSkeleton className="h-4 w-full" />
        <PremiumSkeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

export function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-sand bg-ivory/90">
      <PremiumSkeleton className="aspect-[3/4] rounded-none" />
      <div className="space-y-3 p-5">
        <PremiumSkeleton className="h-5 w-3/4" />
        <PremiumSkeleton className="h-4 w-full" />
        <PremiumSkeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="container-premium py-12">
      <PremiumSkeleton className="mb-6 h-10 w-64" />
      <PremiumSkeleton className="mb-10 h-5 w-full max-w-xl" />
      <div className="grid gap-5 md:grid-cols-3">
        <PremiumSkeleton className="h-56" />
        <PremiumSkeleton className="h-56" />
        <PremiumSkeleton className="h-56" />
      </div>
    </div>
  )
}
