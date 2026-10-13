import { motion } from 'framer-motion'
import EqualizerBars from '../ui/EqualizerBars'

const LoadingScreen = ({ message = 'INITIALIZING MUSIC COMMAND CENTER...' }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#06060A] flex flex-col items-center justify-center p-4">
      {/* Glow background */}
      <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center relative z-10"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent p-[1px] shadow-glow-purple mb-6 animate-pulse-slow">
          <div className="w-full h-full bg-[#0F101A] rounded-[15px] flex items-center justify-center">
            <EqualizerBars count={7} className="h-9 gap-1" />
          </div>
        </div>

        <h2 className="font-display font-bold text-xl tracking-wider text-white mb-2">
          MUSIC<span className="gradient-text-cyan font-black">MASH</span>
        </h2>
        
        <p className="text-xs uppercase tracking-widest font-mono text-muted/80 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
          {message}
        </p>
      </motion.div>
    </div>
  )
}

export default LoadingScreen
