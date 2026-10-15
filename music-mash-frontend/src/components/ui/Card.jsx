import { cn } from '../../utils/cn'

// Cards are bare containers (0px radius, no background) by default. "panel" is the one raised
// tier: Graphite with the inset hairline and 16px padding. No shadows, no blur, no glow.
const VARIANTS = {
  bare: '',
  panel: 'bg-graphite shadow-subtle p-4',
  outline: 'shadow-[inset_0_0_0_1px_#303030] p-4',
}

const Card = ({ children, className, variant = 'panel', as: Tag = 'div', ...props }) => (
  <Tag className={cn(VARIANTS[variant] ?? VARIANTS.panel, className)} {...props}>
    {children}
  </Tag>
)

export default Card
