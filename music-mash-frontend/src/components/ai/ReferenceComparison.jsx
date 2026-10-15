import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionHeader from '../ui/SectionHeader'
import EqualizerBars from '../ui/EqualizerBars'
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
    <section>
      <SectionHeader title="How close am I to the original?"
        description="Pick a reference recording. Your take is lined up with it moment by moment (even if you were faster or slower), then pitch and tempo are compared at matching moments." />
      <div className="bg-graphite p-4 shadow-subtle sm:p-6">
        {references && references.length === 0 ? (
          <p className="text-body-sm text-fog">No reference tracks are available yet. Hosts and admins can add them.</p>
        ) : (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              disabled={!references || status === 'running'}
              aria-label="Reference track"
              className="w-full rounded bg-obsidian px-4 py-3 text-body-sm text-white focus:bg-mid-gray focus:outline-none sm:w-auto sm:min-w-[18rem]"
            >
              {(references || []).map((r) => (
                <option key={r.id} value={r.id}>{r.title}{r.artist ? ` — ${r.artist}` : ''}</option>
              ))}
            </select>
            <Button onClick={startComparison} disabled={!referenceId || status === 'running'}>
              {status === 'running' ? <><EqualizerBars count={3} className="h-3" barClassName="bg-obsidian" /> Comparing</> : 'Compare'}
            </Button>
          </div>
        )}
        {status === 'running' && <p className="text-body-sm text-fog">Aligning your take with the original. This can take a minute for long recordings.</p>}
        {message && <p role="alert" className="text-body-sm text-white"><span className="text-status-critical">●</span> {message}</p>}
        {status === 'done' && result && <ComparisonTimeline result={result} />}
      </div>
    </section>
  )
}

export default ReferenceComparison
