import { cn } from '../../utils/cn'

// Cards are bare containers (0px radius, no background) by default. "panel" is the one raised
// tier: Graphite with the inset hairline and 16px padding. No shadows, no blur, no glow.
const VARIANTS = {
  bare: '',
  panel: 'bg-graphite shadow-subtle p-4',
  outline: 'shadow-[inset_0_0_0_1px_#303030] p-4',
}
// Variant names from before the redesign.
const LEGACY = { glass: 'panel', glow: 'panel', gradient: 'panel', default: 'panel', elevated: 'panel' }

const Card = ({ children, className, variant = 'panel', as: Tag = 'div', hover, glow, ...props }) => (
  <Tag className={cn(VARIANTS[LEGACY[variant] || variant] ?? VARIANTS.panel, className)} {...props}>
    {children}
  </Tag>
)

export default Card
