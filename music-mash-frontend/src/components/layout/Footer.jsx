import { Link } from 'react-router-dom'
import Wordmark from '../brand/Wordmark'

const COLUMNS = [
  { title: 'Play', links: [['Practice Arena', '/practice'], ['Studio', '/upload'], ['Competitions', '/competitions'], ['Challenges', '/challenges']] },
  { title: 'Community', links: [['Leaderboard', '/leaderboard'], ['Discover musicians', '/social'], ['Your profile', '/profile']] },
  { title: 'About', links: [['Photo credits', '/credits']] },
]

/** Site footer: wordmark, three link columns and the photo-credits link. */
const Footer = () => (
  <footer className="mt-24 border-t border-graphite bg-obsidian">
    <div className="page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-3">
        <Wordmark />
        <p className="max-w-xs text-body-sm text-fog">
          Record your playing, see your pitch and timing measured, and practise with real tools.
        </p>
      </div>
      {COLUMNS.map((column) => (
        <div key={column.title}>
          <h2 className="mb-3 text-body-sm font-semibold text-white">{column.title}</h2>
          <ul className="space-y-2">
            {column.links.map(([label, to]) => (
              <li key={to}><Link to={to} className="text-body-sm text-fog hover:text-white">{label}</Link></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="page flex flex-col gap-2 border-t border-graphite py-6 text-caption text-fog sm:flex-row sm:justify-between">
      <span>© {new Date().getFullYear()} MusicMash</span>
      <span>Photography from Unsplash contributors, see <Link to="/credits" className="link">photo credits</Link>.</span>
    </div>
  </footer>
)

export default Footer
