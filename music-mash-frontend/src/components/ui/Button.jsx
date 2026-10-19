import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

// Flat fills, 4px corners, no shadows (docs/MUSICMASH_DESIGN_SYSTEM.md → Buttons).
const VARIANTS = {
  primary: 'bg-white text-obsidian font-bold hover:bg-silver',            // the action colour is white
  ghost: 'bg-transparent text-fog font-normal hover:text-white',          // tertiary / navigation
  subtle: 'bg-graphite text-white font-semibold hover:bg-mid-gray',       // secondary on dark
  inverse: 'bg-obsidian text-white font-bold hover:bg-graphite',          // primary on the light band
  danger: 'bg-transparent text-white font-semibold shadow-subtle hover:bg-graphite',
}
const SIZES = {
  sm: 'h-8 px-3 text-caption',
  md: 'h-10 px-4 text-body-sm',
  lg: 'h-12 px-6 text-body-sm',
}

const Button = forwardRef(({ children, variant = 'primary', size = 'md', to, href, icon: Icon,
  iconRight: IconRight, className, type = 'button', ...props }, ref) => {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded whitespace-nowrap transition-colors duration-150',
    'disabled:opacity-40 disabled:pointer-events-none select-none',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className,
  )
  const content = (
    <>
      {Icon && <Icon aria-hidden="true" className="shrink-0" />}
      {children}
      {IconRight && <IconRight aria-hidden="true" className="shrink-0" />}
    </>
  )
  if (to) return <Link ref={ref} to={to} className={classes} {...props}>{content}</Link>
  if (href) return <a ref={ref} href={href} className={classes} {...props}>{content}</a>
  return <button ref={ref} type={type} className={classes} {...props}>{content}</button>
})
Button.displayName = 'Button'

export default Button
