import { CheckSquare } from 'lucide-react'
import type { ActionItem } from '../../lib/types'

interface Props {
  items: ActionItem[]
}

const PRIORITY_STYLES = {
  high: 'bg-red-600/20 text-red-400',
  medium: 'bg-yellow-600/20 text-yellow-400',
  low: 'bg-zinc-700/50 text-zinc-400'
}

export function TasksView({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
        No action items identified in this meeting.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th className="pb-3 pr-4 font-medium">Task</th>
            <th className="pb-3 pr-4 font-medium">Assignee</th>
            <th className="pb-3 pr-4 font-medium">Deadline</th>
            <th className="pb-3 font-medium">Priority</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              <td className="py-3 pr-4">
                <div className="flex items-start gap-2">
                  <CheckSquare size={14} className="mt-0.5 shrink-0 text-blue-400" />
                  <span className="text-zinc-200">{item.task}</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-zinc-400">{item.assignee}</td>
              <td className="py-3 pr-4 text-zinc-400">{item.deadline}</td>
              <td className="py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[item.priority]}`}>
                  {item.priority}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
