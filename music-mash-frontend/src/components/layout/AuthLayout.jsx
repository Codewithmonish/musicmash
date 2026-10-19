import { motion, useReducedMotion } from 'framer-motion'
import Wordmark from '../brand/Wordmark'

/**
 * Split layout for sign-in / sign-up: an editorial photo on the left (full height on desktop,
 * a short banner on phones), the form on the right on Obsidian.
 */
const AuthLayout = ({ image, title, subtitle, children, footer }) => {
  const reduceMotion = useReducedMotion()
  return (
    <div className="grid min-h-screen bg-obsidian lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative h-56 overflow-hidden sm:h-72 lg:h-auto">
        <img src={image?.src} alt={image?.alt ?? ''} width="1000" height="1250"
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(18,18,18,0.85)_0%,rgba(18,18,18,0.1)_55%)]" aria-hidden="true" />
        <div className="absolute left-4 top-5 sm:left-8 sm:top-8">
          <Wordmark />
        </div>
        <p className="absolute bottom-6 left-4 right-4 hidden max-w-md text-body text-white sm:left-8 lg:block">
          Record a take. See your pitch and timing measured. Practise what the numbers show.
        </p>
      </div>

      <div className="flex justify-center px-4 py-10 sm:px-8 lg:items-center">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <h1 className="text-heading-sm font-semibold text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-body-sm text-fog">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-body-sm text-fog">{footer}</div>}
        </motion.div>
      </div>
    </div>
  )
}

export default AuthLayout
