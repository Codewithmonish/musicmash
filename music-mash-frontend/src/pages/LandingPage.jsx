import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiMusic, FiMic, FiAward, FiUsers, FiTrendingUp, FiUpload, FiTarget, FiZap, FiDisc, FiStar } from 'react-icons/fi'
import Navbar from '../components/layout/Navbar'
import AmbientBackground from '../components/ui/AmbientBackground'
import EqualizerBars from '../components/ui/EqualizerBars'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#06060A] text-foreground relative overflow-hidden">
      <AmbientBackground />
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-4 overflow-hidden">
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Futuristic Equalizer Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass border border-primary/30 shadow-glow-purple mb-8"
          >
            <EqualizerBars count={4} className="h-4 gap-1" />
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-accent">
              AI-Powered Music Performance & Evaluation
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8">
              ELEVATE YOUR <br />
              <span className="gradient-text-cyan text-glow">MUSICAL TALENT</span>
            </h1>
            
            <p className="text-lg md:text-2xl text-muted max-w-3xl mx-auto leading-relaxed mb-10">
              The next-generation music arena. Record your audio/video, receive instant <span className="text-white font-semibold">AI Pitch & Rhythm coaching</span>, and compete for prestige under expert judges.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register">
                <Button variant="primary" size="xl" icon={FiArrowRight} className="uppercase tracking-wider">
                  Enter Command Studio
                </Button>
              </Link>
              <Link to="/competitions">
                <Button variant="secondary" size="xl" icon={FiAward} className="uppercase tracking-wider">
                  Explore Competitions
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Workflow Section */}
      <section className="py-24 px-4 relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
              The Music Journey
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mt-4">
              How <span className="gradient-text">Music Mash</span> Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { icon: FiUpload, step: '01', title: 'Record Track', desc: 'Capture audio or video directly in Performance Studio' },
              { icon: FiMusic, step: '02', title: 'AI Analysis', desc: 'Instant pitch accuracy, tempo & rhythm breakdown' },
              { icon: FiMic, step: '03', title: 'Judge Review', desc: 'Certified judges evaluate technical delivery & score' },
              { icon: FiTrendingUp, step: '04', title: 'Earn XP', desc: 'Progress through skill tiers and unlock achievements' },
              { icon: FiAward, step: '05', title: 'Rank & Win', desc: 'Compete on global leaderboards and win competitions' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card variant="glass" className="h-full text-center relative group">
                  <span className="absolute top-3 right-4 font-mono font-black text-2xl text-white/10 group-hover:text-accent/30 transition-colors">
                    {item.step}
                  </span>
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 via-surface to-accent/20 border border-primary/30 flex items-center justify-center text-accent text-2xl group-hover:scale-110 transition-transform">
                    <item.icon />
                  </div>
                  <h3 className="font-display font-bold text-base text-white mb-2">{item.title}</h3>
                  <p className="text-muted text-xs leading-relaxed">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Futuristic Features Section */}
      <section className="py-24 px-4 relative z-10 bg-surface/40 backdrop-blur-2xl border-t border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary-light bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              Core Capabilities
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mt-4">
              Engineered for <span className="gradient-text-cyan">Musicians</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: FiStar, title: 'AI Pitch & Rhythm Engine', desc: 'FastAPI microservice extracting tempo, key, pitch accuracy, and performance quality.' },
              { icon: FiMic, title: 'Judge Evaluation System', desc: 'Detailed feedback from expert judges with granular criteria scoring.' },
              { icon: FiTarget, title: 'Practice Arena', desc: 'Interactive music game mode with BPM adjustment, section looping & real-time XP combo.' },
              { icon: FiAward, title: 'Live Competitions', desc: 'Compete in active tournaments across instruments & categories with live leaderboards.' },
              { icon: FiTrendingUp, title: 'Skill Progression & Gamification', desc: 'Leveling system, daily practice streaks, milestone badges and achievements.' },
              { icon: FiUsers, title: 'Musician Community', desc: 'Follow fellow musicians, share performance videos, and discover talent worldwide.' },
            ].map((feat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card variant="gradient" className="h-full">
                  <feat.icon className="text-3xl text-accent mb-4" />
                  <h3 className="font-display font-bold text-xl text-white mb-2">{feat.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{feat.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <Card variant="glow" className="p-12">
            <EqualizerBars count={8} className="h-10 gap-1.5 mx-auto mb-6" />
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to <span className="gradient-text">Record & Compete</span>?
            </h2>
            <p className="text-base md:text-lg text-muted mb-8 max-w-xl mx-auto">
              Join Music Mash today. Record your music, receive AI feedback, and start climbing the leaderboards.
            </p>
            <Link to="/register">
              <Button variant="accent" size="xl" icon={FiArrowRight} className="uppercase tracking-wider">
                Create Free Account
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10 relative z-10 text-center text-xs text-muted">
        <p>&copy; 2026 Music Mash. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default LandingPage
