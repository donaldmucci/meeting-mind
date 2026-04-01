import { useEffect } from 'react'
import { useAppStore } from './stores/app.store'
import { Header } from './components/Header'
import { HomeView } from './components/HomeView'
import { ProcessingView } from './components/ProcessingView'
import { ResultsView } from './components/ResultsView'
import { SettingsDialog } from './components/SettingsDialog'

export default function App() {
  const view = useAppStore((s) => s.view)
  const loadHistory = useAppStore((s) => s.loadHistory)
  const loadSettings = useAppStore((s) => s.loadSettings)

  useEffect(() => {
    loadHistory()
    loadSettings()
  }, [loadHistory, loadSettings])

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <Header />
      <main className="flex-1 overflow-hidden">
        {view === 'home' && <HomeView />}
        {view === 'processing' && <ProcessingView />}
        {view === 'results' && <ResultsView />}
      </main>
      <SettingsDialog />
    </div>
  )
}
