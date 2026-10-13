import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const Button = ({ children, variant = 'primary', size = 'md', className, icon: Icon, ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer'
  
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    outline: 'btn-outline',
    ghost: 'text-muted hover:text-white hover:bg-white/10',
    danger: 'bg-gradient-to-r from-error to-red-600 text-white hover:shadow-lg hover:shadow-error/40',
  }
  
  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
    xl: 'px-9 py-4 text-lg font-bold',
  }
  
  const mergedClassName = twMerge(clsx(baseStyles, variants[variant], sizes[size], className))
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={mergedClassName}
      {...props}
    >
      {Icon && <Icon className="text-base" />}
      {children}
    </motion.button>
  )
}

export default Button
