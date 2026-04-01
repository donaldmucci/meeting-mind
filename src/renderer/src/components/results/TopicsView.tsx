import { MessageSquare } from 'lucide-react'
import type { Topic } from '../../lib/types'

interface Props {
  topics: Topic[]
}

export function TopicsView({ topics }: Props) {
  if (topics.length === 0) {
    return <EmptyState message="No topics identified in this meeting." />
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {topics.map((topic, i) => (
        <div key={i} className="rounded-lg border border-zinc-800 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-purple-600/20 p-2">
              <MessageSquare size={16} className="text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <h4 className="font-medium text-zinc-200">{topic.name}</h4>
                <span className="text-xs text-zinc-500">
                  {formatTime(topic.startTime)} – {formatTime(topic.endTime)}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{topic.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-zinc-500">{message}</div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
