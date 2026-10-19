import { cn } from '../../utils/cn'

/** Placeholder block while content loads (a slow Graphite pulse; still under reduced motion). */
const Skeleton = ({ className, ...props }) => (
  <div aria-hidden="true" className={cn('animate-pulse rounded bg-graphite', className)} {...props} />
)

export const TrackCardSkeleton = () => (
  <div className="flex flex-col gap-4">
    <Skeleton className="aspect-square w-full" />
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="h-3.5 w-1/2" />
    </div>
  </div>
)

export default Skeleton
