import toast, { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'

/**
 * Toasts in the system's language: a Graphite panel with an optional square cover image,
 * white title, Fog body. Used for achievements and streaks as well as plain confirmations.
 *
 *   notify({ title: 'Streak: 7 days', body: 'You practised every day this week.', image })
 *   notify.error('Upload failed')
 */
const ToastCard = ({ t, title, body, image, tone }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: -6 }}
    animate={{ opacity: t.visible ? 1 : 0, scale: t.visible ? 1 : 0.97, y: 0 }}
    transition={{ duration: 0.18 }}
    role="status"
    className="pointer-events-auto flex w-[340px] max-w-[calc(100vw-32px)] overflow-hidden bg-graphite shadow-subtle"
  >
    {image && <img src={image} alt="" width="72" height="72" className="h-auto w-[72px] shrink-0 object-cover" />}
    <div className="flex min-w-0 flex-1 gap-3 p-4">
      {tone === 'error' && <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-status-critical" />}
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-semibold text-white">{title}</p>
        {body && <p className="mt-0.5 text-body-sm text-fog">{body}</p>}
      </div>
      <button type="button" onClick={() => toast.dismiss(t.id)} aria-label="Dismiss"
        className="h-6 w-6 shrink-0 text-fog hover:text-white"><FiX /></button>
    </div>
  </motion.div>
)

export const notify = ({ title, body, image, duration = 4000 }) =>
  toast.custom((t) => <ToastCard t={t} title={title} body={body} image={image} />, { duration })
notify.success = (title, body) => notify({ title, body })
notify.error = (title, body) =>
  toast.custom((t) => <ToastCard t={t} title={title} body={body} tone="error" />, { duration: 5000 })

/** Mount once (in App). */
export const AppToaster = () => (
  <Toaster
    position="bottom-right"
    gutter={8}
    containerStyle={{ inset: 16 }}
    toastOptions={{
      // Plain toast.success / toast.error calls get the same flat Graphite look.
      style: { background: '#303030', color: '#ffffff', borderRadius: 4, boxShadow: 'none', fontSize: 14 },
      success: { iconTheme: { primary: '#ffffff', secondary: '#303030' } },
      error: { iconTheme: { primary: '#d03b3b', secondary: '#ffffff' } },
    }}
  />
)
