import { motion } from 'framer-motion'

/**
 * Flat score ring: a Graphite track with a white arc. One colour, no gradient. The number in
 * the middle is the measured value, so the ring is decoration for an already-labelled figure.
 */
const ProgressRing = ({ progress = 0, size = 120, strokeWidth = 6, label, sublabel }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, progress))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#303030" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} stroke="#ffffff" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        {label && <span className="text-heading-sm font-semibold text-white">{label}</span>}
        {sublabel && <span className="text-caption text-fog">{sublabel}</span>}
      </div>
    </div>
  )
}

export default ProgressRing
