import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import PageShell from '../../components/layout/PageShell'
import PageBanner from '../../components/layout/PageBanner'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import Avatar from '../../components/ui/Avatar'
import { IMAGES } from '../../utils/images'
import { cn } from '../../utils/cn'
import api from '../../services/api'

/** Global ranking by total XP, which only comes from scored practice sessions. */
const LeaderboardPage = () => {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    api.get('/leaderboard').then((r) => setRows(r.data)).catch(() => setRows([]))
  }, [])

  const top = rows?.slice(0, 3) ?? []

  return (
    <PageShell>
      <PageBanner image={IMAGES.scenes.leaderboard} title="Leaderboard"
        description="Ranked by XP. XP only comes from practice sessions scored on measured intonation and timing." />
      <div className="page py-10">
        {rows === null ? (
          <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState image={IMAGES.emptyStates.leaderboard?.src} title="Nobody is ranked yet"
            body="Finish a scored practice session to earn XP and appear here." action={{ label: 'Start practising', to: '/practice' }} />
        ) : (
          <>
            <div className="mb-10 grid gap-4 sm:grid-cols-3">
              {top.map((row) => (
                <div key={row.userId} className={cn('flex items-center gap-4 bg-graphite p-4 shadow-subtle', row.userId === user?.id && 'shadow-[inset_0_0_0_2px_#ffffff]')}>
                  <span className="text-display font-thin leading-none text-white">{row.rank}</span>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-white">{row.username}</p>
                    <p className="text-caption text-fog">{row.totalXp} XP · level {row.level}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative overflow-x-auto scroll-quiet">
              <table className="w-full min-w-[520px] text-left text-body-sm">
                <caption className="sr-only">Leaderboard</caption>
                <thead className="text-caption text-fog">
                  <tr className="border-b border-graphite">
                    <th scope="col" className="py-2 pl-3 pr-4 font-normal">Rank</th>
                    <th scope="col" className="py-2 pr-4 font-normal">Musician</th>
                    <th scope="col" className="py-2 pr-4 font-normal">Level</th>
                    <th scope="col" className="py-2 pr-4 font-normal">XP</th>
                    <th scope="col" className="py-2 pr-4 font-normal">Streak</th>
                    <th scope="col" className="py-2 font-normal">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.userId} className={cn('border-b border-graphite', row.userId === user?.id && 'bg-graphite')}>
                      <td className="py-3 pl-3 pr-4 text-fog">{row.rank}</td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-3">
                          <Avatar name={row.username} />
                          <span className="font-semibold text-white">{row.username}{row.userId === user?.id && <span className="font-normal text-fog"> (you)</span>}</span>
                        </span>
                      </td>
                      <td className="py-3 pr-4">{row.level}</td>
                      <td className="py-3 pr-4 font-semibold text-white">{row.totalXp}</td>
                      <td className="py-3 pr-4">{row.streak} {row.streak === 1 ? 'day' : 'days'}</td>
                      <td className="py-3 pr-3">{row.exercisesCompleted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}

export default LeaderboardPage
