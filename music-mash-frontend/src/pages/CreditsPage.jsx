import { useEffect, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import Skeleton from '../components/ui/Skeleton'

/** Photo credits: every image in the app, its photographer and source (public/images/credits.json). */
const CreditsPage = () => {
  const [credits, setCredits] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/images/credits.json')
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then(setCredits)
      .catch(() => setError(true))
  }, [])

  return (
    <PageShell>
      <div className="page py-12">
        <h1 className="text-heading font-thin">Photo credits</h1>
        <p className="mt-3 max-w-2xl text-body text-fog">
          All photography is from <a className="link" href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a> and
          used under the <a className="link" href="https://unsplash.com/license" target="_blank" rel="noreferrer">Unsplash License</a>.
          Thank you to every photographer below.
        </p>

        {error && <p className="mt-8 text-body-sm text-fog">The credits list could not be loaded. It is also in the repository at public/images/CREDITS.md.</p>}

        <ul className="mt-10 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {(credits ?? Array.from({ length: 9 }, () => null)).map((credit, i) => (
            <li key={credit?.file ?? i} className="flex items-center gap-4">
              {credit ? (
                <>
                  <img src={credit.file} alt={credit.alt} width="56" height="56" loading="lazy"
                    className="h-14 w-14 shrink-0 rounded object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-white">{credit.photographer}</p>
                    <p className="truncate text-caption text-fog">
                      <a className="link" href={credit.source} target="_blank" rel="noreferrer">Unsplash</a> · {credit.file.split('/').slice(-2).join('/')}
                    </p>
                  </div>
                </>
              ) : (
                <><Skeleton className="h-14 w-14" /><Skeleton className="h-4 w-40" /></>
              )}
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  )
}

export default CreditsPage
