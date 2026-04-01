import { Settings, RotateCcw } from 'lucide-react'
import { useAppStore } from '../stores/app.store'

export function Header() {
  const view = useAppStore((s) => s.view)
  const reset = useAppStore((s) => s.reset)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">MeetingMind</h1>
        <span className="text-xs text-zinc-500">Intelligent Recap</span>
      </div>
      <div className="flex items-center gap-2">
        {view === 'results' && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <RotateCcw size={14} />
            New Analysis
          </button>
        )}
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
