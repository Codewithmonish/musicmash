import { cn } from '../../utils/cn'

/**
 * Flat square avatar: the first letter of the name on Graphite. Users have no photos yet,
 * so this stays deliberately plain instead of inventing an image.
 */
const Avatar = ({ name = '', className, textClassName = 'text-body-sm font-semibold' }) => (
  <span aria-hidden="true"
    className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded bg-graphite text-white shadow-subtle', className)}>
    <span className={textClassName}>{name.charAt(0).toUpperCase() || '?'}</span>
  </span>
)

export default Avatar
