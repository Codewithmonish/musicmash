import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const Input = ({ className, variant = 'default', ...props }) => {
  const baseStyles = 'rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none transition-all duration-300'
  
  const variants = {
    default: 'bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
    filled: 'bg-white/10 border border-transparent focus:bg-white/15 focus:border-primary/50',
    outline: 'bg-transparent border-2 border-white/20 focus:border-primary/50',
  }
  
  const mergedClassName = twMerge(clsx(baseStyles, variants[variant], className))
  
  return <input className={mergedClassName} {...props} />
}

export default Input
