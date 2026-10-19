import { MarkIcon } from '../brand/Wordmark'
import EqualizerBars from '../ui/EqualizerBars'

/** Full-screen loading state: the mark, animated equalizer bars and a short status line. */
const LoadingScreen = ({ message = 'Loading' }) => (
  <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-obsidian p-4">
    <MarkIcon className="h-10 w-10 text-white" />
    <EqualizerBars count={6} className="h-6" />
    <p className="text-body-sm text-fog">{message}</p>
  </div>
)

export default LoadingScreen
