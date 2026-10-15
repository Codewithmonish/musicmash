import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import { cn } from '../../utils/cn'

/**
 * In-system dialog: Graphite panel with an optional cover image on top, white primary CTA,
 * a quick scale-in. The backdrop is a flat Obsidian tint (no blur). Escape and the backdrop
 * close it; focus moves into the dialog and returns to the trigger afterwards.
 */
const Modal = ({ open, onClose, title, image, imageAlt = '', children, actions, className }) => {
  const panel = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    panel.current?.querySelector('button, a, input, select, textarea, [tabindex]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="absolute inset-0 bg-obsidian/85" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn('relative w-full max-w-md overflow-hidden bg-graphite shadow-subtle', className)}
          >
            {image && <img src={image} alt={imageAlt} className="h-44 w-full object-cover" width="600" height="300" />}
            <button type="button" onClick={onClose} aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded bg-obsidian/70 text-white hover:bg-obsidian">
              <FiX />
            </button>
            <div className="p-6">
              {title && <h2 className="mb-2 text-subheading font-semibold text-white">{title}</h2>}
              <div className="text-body-sm text-fog">{children}</div>
              {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default Modal
