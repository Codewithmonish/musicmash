import { useState } from 'react'
import { cn } from '../../utils/cn'
import GeneratedCover from './GeneratedCover'

/**
 * A square cover image: lazy-loaded with explicit width/height (no layout shift). Falls back to
 * a deterministic GeneratedCover when there is no src or the image fails to load.
 */
const CoverImage = ({ src, alt, seed, size = 600, className, imgClassName, eager = false }) => {
  const [failed, setFailed] = useState(false)
  return (
    <div className={cn('relative aspect-square overflow-hidden rounded bg-graphite', className)}>
      {src && !failed ? (
        <img src={src} alt={alt} width={size} height={size} loading={eager ? 'eager' : 'lazy'} decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)} />
      ) : (
        <GeneratedCover seed={seed ?? alt} label={alt} className={cn('h-full w-full', imgClassName)} />
      )}
    </div>
  )
}

export default CoverImage
