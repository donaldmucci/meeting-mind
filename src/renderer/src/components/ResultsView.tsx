import { Download } from 'lucide-react'
import { useAppStore } from '../stores/app.store'
import { TranscriptView } from './results/TranscriptView'
import { SummaryView } from './results/SummaryView'
import { TopicsView } from './results/TopicsView'
import { DecisionsView } from './results/DecisionsView'
import { TasksView } from './results/TasksView'
import { FollowUpsView } from './results/FollowUpsView'

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'transcript', label: 'Transcript' },
  { key: 'topics', label: 'Topics' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'tasks', label: 'Action Items' },
  { key: 'followups', label: 'Follow-ups' }
] as const

export function ResultsView() {
  const result = useAppStore((s) => s.result)
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const exportResult = useAppStore((s) => s.exportResult)

  if (!result) return null

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportResult('markdown')}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Download size={14} />
            Export MD
          </button>
          <button
            onClick={() => exportResult('json')}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Download size={14} />
            Export JSON
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'summary' && <SummaryView summary={result.summary} duration={result.duration} speakers={result.transcript.speakers} />}
        {activeTab === 'transcript' && <TranscriptView segments={result.transcript.segments} />}
        {activeTab === 'topics' && <TopicsView topics={result.topics} />}
        {activeTab === 'decisions' && <DecisionsView decisions={result.decisions} />}
        {activeTab === 'tasks' && <TasksView items={result.actionItems} />}
        {activeTab === 'followups' && <FollowUpsView items={result.followUps} />}
      </div>
    </div>
  )
}
