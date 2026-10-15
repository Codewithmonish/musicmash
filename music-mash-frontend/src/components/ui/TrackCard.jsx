import { Link } from 'react-router-dom'
import { FiPlay } from 'react-icons/fi'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../utils/cn'
import CoverImage from './CoverImage'

/**
 * Bare track/album tile (DESIGN.md "Track / Album Card"): a 1:1 cover with 4px corners, then
 * 16px below it the title (14px, 600, white) and the artist (14px, 400, Fog). No background,
 * border or shadow. On hover the art zooms to 1.03 and a white play mark appears.
 */
const TrackCard = ({ title, subtitle, image, alt, seed, to, onClick, meta, className, eager }) => {
  const Wrapper = to ? Link : onClick ? 'button' : 'div'
  const wrapperProps = to ? { to } : onClick ? { type: 'button', onClick } : {}
  const interactive = Boolean(to || onClick)
  return (
    <Wrapper {...wrapperProps} className={cn('group flex w-full flex-col gap-4 text-left', className)}>
      <div className="relative overflow-hidden rounded">
        <CoverImage src={image} alt={alt || title} seed={seed ?? title} eager={eager}
          imgClassName={cn(interactive && 'transition-transform duration-500 ease-out group-hover:scale-[1.03]')} />
        {interactive && (
          <span aria-hidden="true"
            className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-1 items-center justify-center rounded bg-white text-obsidian opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
            <FiPlay className="ml-0.5" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-body-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="truncate text-body-sm text-fog">{subtitle}</p>}
        {meta && <div className="mt-1 text-caption text-fog">{meta}</div>}
      </div>
    </Wrapper>
  )
}

/**
 * Grid of tiles: 6 columns on desktop, 3 on tablets, 2 on phones; tiles reveal with a stagger
 * as they scroll into view. With reduced motion they are simply shown.
 */
export const TileGrid = ({ children, className }) => {
  const reduceMotion = useReducedMotion()
  return (
  <motion.div
    initial={reduceMotion ? false : 'hidden'}
    whileInView="show"
    viewport={{ once: true, margin: '-40px' }}
    variants={{ show: { transition: { staggerChildren: 0.05 } } }}
    className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6', className)}
  >
    {children}
  </motion.div>
  )
}

export const TileItem = ({ children, className }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } }}
    className={className}
  >
    {children}
  </motion.div>
)

export default TrackCard
