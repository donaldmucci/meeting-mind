import { Clock, Users } from 'lucide-react'
import type { MeetingSummary } from '../../lib/types'

interface Props {
  summary: MeetingSummary
  duration: number
  speakers: string[]
}

export function SummaryView({ summary, duration, speakers }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Meta */}
      <div className="flex gap-4 text-sm text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Clock size={14} />
          {Math.round(duration / 60)} minutes
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} />
          {speakers.length} speaker{speakers.length !== 1 ? 's' : ''}
        </span>
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
