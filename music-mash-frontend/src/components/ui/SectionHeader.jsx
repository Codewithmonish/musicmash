import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

/** Section title (22px white) with an optional muted description and a Signal Blue text link. */
const SectionHeader = ({ title, description, action, align = 'left', as: Heading = 'h2', className }) => (
  <div className={cn('mb-6 flex flex-col gap-2',
    align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between', className)}>
    <div>
      <Heading className="text-subheading font-semibold text-white">{title}</Heading>
      {description && <p className="mt-1 max-w-2xl text-body-sm text-fog">{description}</p>}
    </div>
    {action && (action.to
      ? <Link to={action.to} className="link shrink-0 text-body-sm">{action.label}</Link>
      : <button type="button" onClick={action.onClick} className="link shrink-0 text-body-sm">{action.label}</button>)}
  </div>
)

export default SectionHeader
