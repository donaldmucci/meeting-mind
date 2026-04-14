import { Clock, Users, Gauge, Loader2 } from 'lucide-react'
import type { MeetingSummary, SummaryDetail } from '../../lib/types'

interface Props {
  summary: MeetingSummary
  duration: number
  speakers: string[]
  detail: SummaryDetail
  regenerating: boolean
  onRegenerate: (detail: SummaryDetail) => void | Promise<void>
}

const DETAIL_LEVELS: { value: SummaryDetail; label: string; hint: string }[] = [
  { value: 'short', label: 'Short', hint: 'Quick overview, 2-4 bullets' },
  { value: 'normal', label: 'Normal', hint: 'Balanced summary' },
  { value: 'max', label: 'Max', hint: 'Maximum detail, 8-15 bullets' }
]

export function SummaryView({ summary, duration, speakers, detail, regenerating, onRegenerate }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {Math.round(duration / 60)} minutes
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {speakers.length} speaker{speakers.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-zinc-500" />
          <span className="text-xs text-zinc-500">Detail</span>
          <div className="flex overflow-hidden rounded-md border border-zinc-700">
            {DETAIL_LEVELS.map((opt) => {
              const active = opt.value === detail
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.hint}
                  disabled={regenerating || active}
                  onClick={() => onRegenerate(opt.value)}
                  className={`px-2.5 py-1 text-xs transition ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {regenerating && <Loader2 size={14} className="animate-spin text-zinc-500" />}
        </div>
      </div>

      {/* Overview */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-200">Overview</h3>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
          {summary.overview}
        </div>
      </div>

      {/* Key Points */}
      {summary.keyPoints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-zinc-200">Key Points</h3>
          <ul className="space-y-2">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-medium text-blue-400">
                  {i + 1}
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
