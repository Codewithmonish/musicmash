import { cn } from '../../utils/cn'

/**
 * Animated equalizer bars for "playing" / "processing" states. White by default; motion stops
 * (bars rest at mixed heights) for prefers-reduced-motion via the global rule.
 */
const EqualizerBars = ({ count = 4, active = true, className, barClassName, label }) => (
  <span role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}
    className={cn('inline-flex h-4 items-end gap-[3px]', className)}>
    {Array.from({ length: count }, (_, i) => (
      <span
        key={i}
        className={cn('h-full w-[3px] origin-bottom bg-white', barClassName)}
        style={{
          transform: `scaleY(${[0.55, 1, 0.7, 0.85, 0.4, 0.95][i % 6]})`,
          animation: active ? `eq-bounce ${0.9 + (i % 3) * 0.2}s ease-in-out ${i * 0.12}s infinite` : 'none',
        }}
      />
    ))}
  </span>
)

export default EqualizerBars
