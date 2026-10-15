import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../utils/cn'
import Navbar from './Navbar'
import Footer from './Footer'

/**
 * Standard page frame: navigation, a page-transition wrapper for the content, and the footer.
 * `hero` pages put their own full-bleed hero first and get a transparent nav over it;
 * other pages get a solid nav and 64px of top offset.
 */
const PageShell = ({ children, hero = false, footer = true, className, banner }) => {
  const reduceMotion = useReducedMotion()
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      {banner}
      <Navbar transparent={hero} />
      <motion.main
        id="main"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn('flex-1', !hero && 'pt-16', className)}
      >
        {children}
      </motion.main>
      {footer && <Footer />}
    </div>
  )
}

export default PageShell
