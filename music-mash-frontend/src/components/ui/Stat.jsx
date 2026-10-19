import { cn } from '../../utils/cn'

/**
 * A measured number with its label: 28px white figure, Fog label, optional Fog hint.
 * When the value is null it says "Not available" and shows the `reason` instead: never a
 * placeholder number.
 */
const Stat = ({ label, value, unit, hint, reason, className, children }) => (
  <div className={cn('bg-graphite p-4 shadow-subtle', className)}>
    <p className="text-caption text-fog">{label}</p>
    {value == null ? (
      <>
        <p className="mt-1 text-body font-semibold text-fog">Not available</p>
        {reason && <p className="mt-1 text-caption text-fog">{reason}</p>}
      </>
    ) : (
      <>
        <p className="mt-1 text-heading-sm font-semibold text-white">
          {value}{unit && <span className="ml-1 text-body-sm font-normal text-fog">{unit}</span>}
        </p>
        {hint && <p className="mt-1 text-caption text-fog">{hint}</p>}
        {children}
      </>
    )}
  </div>
)

export default Stat
