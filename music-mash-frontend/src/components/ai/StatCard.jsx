import Card from '../ui/Card'

// One measured metric. A null value shows "Not available" with the service's reason,
// never a placeholder number.
const StatCard = ({ label, value, unit, hint, reason }) => (
  <Card hover={false} className="p-4">
    <div className="text-[11px] font-mono uppercase tracking-wide text-muted">{label}</div>
    {value == null ? (
      <>
        <div className="mt-1 text-lg font-display font-bold text-muted">Not available</div>
        {reason && <p className="mt-1 text-[11px] leading-snug text-muted">{reason}</p>}
      </>
    ) : (
      <>
        <div className="mt-1 text-2xl font-display font-bold text-white">
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
        </div>
        {hint && <p className="mt-1 text-[11px] leading-snug text-muted/80">{hint}</p>}
      </>
    )}
  </Card>
)

export default StatCard
