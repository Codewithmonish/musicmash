import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

/** Our mark: four equalizer bars on a Signal Blue baseline. */
export const MarkIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn('h-6 w-6', className)} aria-hidden="true">
    <g fill="currentColor">
      <rect x="2" y="9" width="3" height="10" />
      <rect x="7" y="4" width="3" height="15" />
      <rect x="12" y="7" width="3" height="12" />
      <rect x="17" y="2" width="3" height="17" />
    </g>
    <rect x="2" y="21" width="18" height="2" fill="#699fff" />
  </svg>
)

/** MusicMash wordmark: the equalizer mark + "MusicMash" in 17px / 600, white. */
const Wordmark = ({ to = '/', className, onLight = false }) => (
  <Link to={to} aria-label="MusicMash home"
    className={cn('inline-flex items-center gap-2', onLight ? 'text-obsidian' : 'text-white', className)}>
    <MarkIcon />
    <span className="text-[17px] font-semibold tracking-tight">MusicMash</span>
  </Link>
)

export default Wordmark
