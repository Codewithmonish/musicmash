import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'

// Graphite field, 4px radius, inset hairline. Focus lightens the background (plus the global
// 2px white keyboard outline), as in DESIGN.md.
const Input = forwardRef(({ label, hint, error, icon: Icon, className, inputClassName, id, as = 'input', ...props }, ref) => {
  const autoId = useId()
  const fieldId = id || autoId
  const Field = as
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <label htmlFor={fieldId} className="text-body-sm font-semibold text-white">{label}</label>}
      <div className="relative">
        <Field
          ref={ref}
          id={fieldId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error || hint ? `${fieldId}-help` : undefined}
          className={cn(
            'w-full rounded bg-graphite shadow-subtle px-4 py-3 text-body-sm text-white placeholder:text-fog',
            'transition-colors duration-150 focus:bg-mid-gray',
            Icon && 'pr-11',
            error && 'shadow-[inset_0_0_0_1px_#d03b3b]',
            inputClassName,
          )}
          {...props}
        />
        {Icon && <Icon aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white" />}
      </div>
      {(error || hint) && (
        <p id={`${fieldId}-help`} className={cn('text-caption', error ? 'text-white' : 'text-fog')}>
          {error ? <><span className="text-status-critical">●</span> {error}</> : hint}
        </p>
      )}
    </div>
  )
})
Input.displayName = 'Input'

export default Input
