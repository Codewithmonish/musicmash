import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const Card = ({ children, className, variant = 'glass', hover = true, glow = false, ...props }) => {
  const baseStyles = 'rounded-2xl p-6 relative overflow-hidden transition-all duration-300'
  
  const variants = {
    default: 'bg-surface border border-white/10 shadow-glass-card',
    glass: 'glass-card',
    glow: 'glass-card-glow',
    gradient: 'bg-gradient-to-br from-primary/15 via-surface to-accent/10 border border-primary/30 shadow-glow-purple',
    elevated: 'bg-surface/90 border border-white/15 shadow-2xl shadow-primary/10 backdrop-blur-2xl',
  }
  
  const hoverStyles = hover ? 'hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow-purple' : ''
  const glowStyles = glow ? 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/10 before:to-accent/10 before:pointer-events-none' : ''

  const mergedClassName = twMerge(clsx(baseStyles, variants[variant], hoverStyles, glowStyles, className))
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={mergedClassName}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default Card
