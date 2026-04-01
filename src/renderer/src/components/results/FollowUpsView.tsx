import { ArrowRight } from 'lucide-react'
import type { FollowUp } from '../../lib/types'

interface Props {
  items: FollowUp[]
}

export function FollowUpsView({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
        No follow-up items identified for this meeting.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 p-4">
          <div className="mt-0.5 rounded-md bg-teal-600/20 p-2">
            <ArrowRight size={16} className="text-teal-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-200">{item.item}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
              <span>Owner: <span className="text-zinc-300">{item.responsible}</span></span>
              <span>When: <span className="text-zinc-300">{item.suggestedDate}</span></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
