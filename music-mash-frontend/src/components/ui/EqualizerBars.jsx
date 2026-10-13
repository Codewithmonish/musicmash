import { motion } from 'framer-motion'

const EqualizerBars = ({ count = 5, className = 'h-6 gap-1' }) => {
  const heights = [0.4, 0.9, 0.6, 1.0, 0.3, 0.8, 0.5, 0.9, 0.7]

  return (
    <div className={`flex items-end ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const initialH = (heights[i % heights.length] * 100) + '%'
        return (
          <motion.span
            key={i}
            className="w-1 bg-gradient-to-t from-primary via-secondary to-accent rounded-full"
            animate={{
              height: ['20%', '100%', '35%', '85%', '20%'],
            }}
            transition={{
              duration: 1.2 + (i % 3) * 0.2,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
              delay: i * 0.1,
            }}
            style={{ height: initialH }}
          />
        )
      })}
    </div>
  )
}

export default EqualizerBars
