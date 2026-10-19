import { cn } from '../../utils/cn'
import Button from './Button'
import GeneratedCover from './GeneratedCover'

/**
 * Empty state: always image-led, never a blank box. Pass an editorial photo from
 * /images/empty-states/ as `image`; without one a GeneratedCover (seeded by the title) is drawn.
 * Then a short title, one line of help and an optional action.
 */
const EmptyState = ({ image, imageAlt = '', title, body, action, className, compact = false }) => (
  <div className={cn('grid overflow-hidden bg-graphite shadow-subtle',
    compact ? 'sm:grid-cols-[160px_1fr]' : 'sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]', className)}>
    {image ? (
      <img src={image} alt={imageAlt} loading="lazy" width="600" height="600"
        className={cn('w-full object-cover', compact ? 'h-32 sm:h-full' : 'h-48 sm:h-full sm:min-h-[220px]')} />
    ) : (
      <GeneratedCover seed={title} label={imageAlt || title}
        className={cn('w-full', compact ? 'h-32 sm:h-full' : 'h-48 sm:h-full sm:min-h-[220px]')} />
    )}
    <div className="flex flex-col justify-center gap-2 p-6">
      <h3 className="text-subheading font-semibold text-white">{title}</h3>
      {body && <p className="text-body-sm text-fog">{body}</p>}
      {action && (
        <div className="mt-2">
          <Button to={action.to} onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  </div>
)

export default EmptyState
