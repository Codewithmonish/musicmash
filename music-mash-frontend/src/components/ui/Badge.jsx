import { cn } from '../../utils/cn'

// Small 4px-radius label. "status" badges pair a coloured dot with text, so colour is never
// the only cue.
const TONES = {
  neutral: 'bg-graphite text-white',
  muted: 'bg-transparent text-fog shadow-[inset_0_0_0_1px_#666666]',
  light: 'bg-white text-obsidian',
}
const DOTS = { good: 'bg-status-good', warning: 'bg-status-warning', critical: 'bg-status-critical', live: 'bg-signal' }

const Badge = ({ children, tone = 'neutral', dot, className }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-caption font-semibold', TONES[tone], className)}>
    {dot && <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', DOTS[dot])} />}
    {children}
  </span>
)

export default Badge
