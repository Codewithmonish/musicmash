import { motion } from 'framer-motion'

const AmbientBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#06060A]">
      {/* Cyber Grid Lines */}
      <div className="absolute inset-0 bg-cyber-grid opacity-40" />

      {/* Radial Atmospheric Lighting */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-radial from-primary/20 via-accent/10 to-transparent blur-3xl rounded-full opacity-60" />

      {/* Floating Animated Ambient Blobs */}
      <motion.div
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[120px]"
      />

      <motion.div
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 50, -30, 0],
          scale: [1, 0.9, 1.2, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 -right-32 w-96 h-96 bg-secondary/15 rounded-full blur-[130px]"
      />

      <motion.div
        animate={{
          x: [0, 40, -40, 0],
          y: [0, -30, 40, 0],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-10 left-1/3 w-[500px] h-[250px] bg-accent/15 rounded-full blur-[140px]"
      />
    </div>
  )
}

export default AmbientBackground
