import PitchContourChart from '../ai/PitchContourChart'
import sample from '../../data/sample-analysis.json'

/**
 * Laptop + phone mockup for the light band. The chart and numbers are a real result from our
 * AI service for the generated demo melody (see src/data/sample-analysis.json `_about`),
 * labelled as an example underneath.
 */
const Score = ({ label, value }) => (
  <div className="flex items-baseline justify-between border-b border-graphite py-2">
    <span className="text-caption text-fog">{label}</span>
    <span className="text-body-sm font-semibold text-white">{value == null ? '—' : Math.round(value)}</span>
  </div>
)

const DeviceMockup = () => (
  <figure className="mx-auto w-full max-w-[560px]">
    <div className="relative">
    {/* Laptop */}
    <div aria-hidden="true">
      <div className="rounded-t-[10px] bg-[#1b1b1b] p-2 pb-3 shadow-[inset_0_0_0_1px_#cccccc]">
        <div className="overflow-hidden rounded bg-obsidian p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-caption font-semibold text-white">Your pitch curve</span>
            <span className="text-caption text-fog">{sample.notes.length} notes</span>
          </div>
          <PitchContourChart points={sample.points} notes={sample.notes} height={200} brush={false} legend={false} />
        </div>
      </div>
      <div className="mx-auto h-3 w-[108%] -translate-x-[3.7%] rounded-b bg-[#cccccc]" />
    </div>

    {/* Phone */}
    <div aria-hidden="true"
      className="absolute -bottom-6 -right-2 w-[34%] min-w-[130px] rounded-[14px] bg-[#1b1b1b] p-1.5 shadow-[inset_0_0_0_1px_#cccccc] sm:-right-6">
      <div className="rounded-[10px] bg-obsidian px-3 pb-3 pt-4">
        <p className="text-caption text-fog">Overall</p>
        <p className="text-heading-sm font-semibold text-white">{Math.round(sample.scores.overall)}</p>
        <Score label="Intonation" value={sample.scores.intonation} />
        <Score label="Rhythm" value={sample.scores.rhythm} />
        <Score label="Tempo (BPM)" value={sample.metrics.tempo_bpm} />
      </div>
    </div>

    </div>
    <figcaption className="mt-12 text-caption text-mid-gray">
      Example: real output for a generated test melody with deliberate mistakes (one sharp note, a sharp phrase, a rushed ending).
    </figcaption>
  </figure>
)

export default DeviceMockup
