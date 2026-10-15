import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiGitMerge } from 'react-icons/fi'
import Card from '../ui/Card'
import Button from '../ui/Button'
import ComparisonTimeline from './ComparisonTimeline'
import api from '../../services/api'

const POLL_MS = 2000
const errorText = (err, fallback) => err.response?.data?.detail || err.response?.data?.message || fallback

// "Compare with an original": pick a reference track, run the comparison for this analysis's
// audio, poll until it is done, then show the ComparisonTimeline. The comparison id is kept in
// the URL (?comparison=ID) so a finished comparison can be reopened or shared.
const ReferenceComparison = ({ analysisId }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [references, setReferences] = useState(null)
  const [referenceId, setReferenceId] = useState('')
  const [status, setStatus] = useState(null)  // null | 'running' | 'done' | 'error'
  const [message, setMessage] = useState(null)
  const [result, setResult] = useState(null)
  const polling = useRef(null)

  useEffect(() => {
    api.get('/ai/references')
      .then((response) => {
        const ready = response.data.filter((r) => r.status === 'COMPLETED')
        setReferences(ready)
        if (ready.length) setReferenceId(String(ready[0].id))
      })
      .catch((err) => setMessage(errorText(err, 'Reference tracks could not be loaded.')))
    const existing = searchParams.get('comparison')
    if (existing) waitForResult(existing)
    return () => clearTimeout(polling.current)
  }, [analysisId])

  const waitForResult = async (comparisonId) => {
    setStatus('running')
    setMessage(null)
    try {
      const { data } = await api.get(`/ai/compare/${comparisonId}/status`)
      if (data.status === 'FAILED') {
        setStatus('error')
        setMessage(data.error_message)
      } else if (data.status !== 'COMPLETED') {
        polling.current = setTimeout(() => waitForResult(comparisonId), POLL_MS)
      } else {
        const response = await api.get(`/ai/compare/${comparisonId}/result`)
        setResult(response.data)
        setStatus('done')
      }
    } catch (err) {
      setStatus('error')
      setMessage(errorText(err, 'The comparison could not be loaded.'))
    }
  }

  const startComparison = async () => {
    setResult(null)
    try {
      const { data } = await api.post('/ai/compare', { referenceId: Number(referenceId), analysisId: Number(analysisId) })
      setSearchParams({ comparison: data.id }, { replace: true })
      waitForResult(data.id)
    } catch (err) {
      setStatus('error')
      setMessage(errorText(err, 'The comparison could not be started.'))
    }
  }

  return (
    <Card hover={false} className="border-white/10 p-6 mb-8">
      <h3 className="font-display text-xl font-bold text-white mb-1 flex items-center gap-2">
        <FiGitMerge className="text-accent" /> How close am I to the original?
      </h3>
      <p className="text-xs text-muted mb-4 max-w-3xl">
        Pick a reference recording. Your take is lined up with it moment by moment (even if you were
        faster or slower), then pitch and tempo are compared at matching moments.
      </p>

      {references && references.length === 0 ? (
        <p className="text-xs text-muted">No reference tracks are available yet. Hosts and admins can add them.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
            disabled={!references || status === 'running'}
            aria-label="Reference track"
            className="min-w-[16rem] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
          >
            {(references || []).map((r) => (
              <option key={r.id} value={r.id} className="bg-[#0d0d13]">
                {r.title}{r.artist ? ` — ${r.artist}` : ''}
              </option>
            ))}
          </select>
          <Button variant="accent" className="text-xs uppercase font-bold" onClick={startComparison}
            disabled={!referenceId || status === 'running'}>
            {status === 'running' ? 'Comparing…' : 'Compare'}
          </Button>
        </div>
      )}

      {status === 'running' && <p className="text-xs text-muted">Aligning your take with the original. This can take a minute for long recordings.</p>}
      {message && <p className="text-xs text-warning">{message}</p>}
      {status === 'done' && result && <ComparisonTimeline result={result} />}
    </Card>
  )
}

export default ReferenceComparison
