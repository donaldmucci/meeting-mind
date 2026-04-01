import { Gavel } from 'lucide-react'
import type { Decision } from '../../lib/types'

interface Props {
  decisions: Decision[]
}

export function DecisionsView({ decisions }: Props) {
  if (decisions.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
        No decisions identified in this meeting.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {decisions.map((d, i) => (
        <div key={i} className="rounded-lg border border-zinc-800 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-amber-600/20 p-2">
              <Gavel size={16} className="text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-zinc-200">{d.decision}</h4>
              <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                <span>By: <span className="text-zinc-300">{d.madeBy}</span></span>
                {d.timestamp > 0 && <span>at {formatTime(d.timestamp)}</span>}
              </div>
              {d.context && <p className="mt-2 text-sm text-zinc-400">{d.context}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
