import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiX } from 'react-icons/fi'

const STORAGE_KEY = 'mm-promo-dismissed'

const readDismissed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Top announcement strip (DESIGN.md "Promotional Banner"): Obsidian bar, a Signal Blue live
 * dot, one line of white 14px text with a Signal Blue link, a Fog close button.
 */
const PromoBanner = ({ children, linkTo, linkLabel }) => {
  const [dismissed, setDismissed] = useState(readDismissed)
  if (dismissed) return null
  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* storage unavailable: the banner just comes back next visit */
    }
  }
  return (
    <div className="relative z-50 bg-obsidian">
      <div className="page flex min-h-8 items-center justify-center gap-2 py-1 pr-10 text-center text-body-sm text-white">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-signal" />
        <span>
          {children}{' '}
          {linkTo && <Link to={linkTo} className="link">{linkLabel}</Link>}
        </span>
        <button type="button" onClick={dismiss} aria-label="Dismiss announcement"
          className="absolute right-4 flex h-6 w-6 items-center justify-center text-fog hover:text-white">
          <FiX />
        </button>
      </div>
    </div>
  )
}

export default PromoBanner
