import { cn } from '../../utils/cn'

/** A measured number with its label: 28px white figure, Fog label, optional Fog hint. */
const Stat = ({ label, value, unit, hint, className }) => (
  <div className={cn('bg-graphite p-4 shadow-subtle', className)}>
    <p className="text-caption text-fog">{label}</p>
    <p className="mt-1 text-heading-sm font-semibold text-white">
      {value ?? '—'}{unit && value != null && <span className="ml-1 text-body-sm font-normal text-fog">{unit}</span>}
    </p>
    {hint && <p className="mt-1 text-caption text-fog">{hint}</p>}
  </div>
)

export default Stat
