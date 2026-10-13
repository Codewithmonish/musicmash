import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiHome, FiMusic } from 'react-icons/fi'
import Navbar from '../components/layout/Navbar'

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Navbar />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
        >
          <FiMusic className="text-white text-5xl" />
        </motion.div>
        
        <h1 className="font-display text-6xl font-bold mb-4">
          <span className="gradient-text">404</span>
        </h1>
        <p className="text-xl text-muted mb-8">
          Oops! This page doesn't exist
        </p>
        
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <FiHome />
          Back to Home
        </Link>
      </motion.div>
    </div>
  )
}

export default NotFoundPage
