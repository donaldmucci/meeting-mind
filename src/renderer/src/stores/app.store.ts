import { create } from 'zustand'
import type { MeetingResult, PipelineProgress, Settings, LanguageCode } from '../lib/types'

interface HistoryEntry {
  id: string
  fileName: string
  processedAt: string
  duration: number
}

interface AppState {
  // View state
  view: 'home' | 'processing' | 'results'

  // Input selection
  filePath: string | null
  fileName: string | null
  youtubeUrl: string | null
  language: LanguageCode

  // Processing
  progress: PipelineProgress | null
  error: string | null

  // Results
  result: MeetingResult | null
  activeTab: 'transcript' | 'summary' | 'topics' | 'decisions' | 'tasks' | 'followups'

  // History
  history: HistoryEntry[]

  // Settings
  settings: Settings | null
  settingsOpen: boolean

  // Actions
  setLanguage: (lang: LanguageCode) => void
  selectFile: () => Promise<void>
  setYoutubeUrl: (url: string) => void
  startProcessing: () => Promise<void>
  cancelProcessing: () => Promise<void>
  setActiveTab: (tab: AppState['activeTab']) => void
  openResult: (id: string) => Promise<void>
  deleteResult: (id: string) => Promise<void>
  exportResult: (format: 'json' | 'markdown' | 'transcript') => Promise<void>
  loadHistory: () => Promise<void>
  loadSettings: () => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
  testLlm: () => Promise<{ ok: boolean; error?: string }>
  setSettingsOpen: (open: boolean) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'home',
  filePath: null,
  fileName: null,
  youtubeUrl: null,
  language: 'en' as LanguageCode,
  progress: null,
  error: null,
  result: null,
  activeTab: 'summary',
  history: [],
  settings: null,
  settingsOpen: false,

  setLanguage: (lang) => set({ language: lang }),

  selectFile: async () => {
    const path = await window.api.selectFile()
    if (path) {
      const fileName = path.split('/').pop() || path.split('\\').pop() || path
      set({ filePath: path, fileName, youtubeUrl: null, error: null })
    }
  },

  setYoutubeUrl: (url) => {
    if (url.trim()) {
      set({ youtubeUrl: url.trim(), filePath: null, fileName: null, error: null })
    } else {
      set({ youtubeUrl: null })
    }
  },

  startProcessing: async () => {
    const { filePath, youtubeUrl, language } = get()
    const source = filePath || youtubeUrl
    if (!source) return

    const displayName = filePath
      ? (filePath.split('/').pop() || filePath.split('\\').pop() || filePath)
      : 'YouTube Video'

    set({ view: 'processing', fileName: displayName, progress: null, error: null, result: null })

    const unsubscribe = window.api.onPipelineProgress((progress) => {
      set({ progress: progress as PipelineProgress })
    })

    const response = await window.api.startPipeline(source, language) as {
      ok: boolean
      result?: MeetingResult
      error?: string
    }

    unsubscribe()

    if (response.ok && response.result) {
      set({ view: 'results', result: response.result, activeTab: 'summary' })
      get().loadHistory()
    } else {
      set({ view: 'home', error: response.error || 'Processing failed' })
    }
  },

  cancelProcessing: async () => {
    await window.api.cancelPipeline()
    set({ view: 'home', progress: null, error: 'Processing cancelled' })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  openResult: async (id) => {
    const result = await window.api.getResult(id) as MeetingResult | null
    if (result) {
      set({ view: 'results', result, activeTab: 'summary', filePath: result.filePath, fileName: result.fileName })
    }
  },

  deleteResult: async (id) => {
    await window.api.deleteResult(id)
    const { result } = get()
    if (result?.id === id) {
      set({ view: 'home', result: null })
    }
    get().loadHistory()
  },

  exportResult: async (format) => {
    const { result } = get()
    if (!result) return
    const content = await window.api.exportResult(result.id, format) as string | null
    if (!content) return
    const baseName = result.fileName.replace(/\.[^.]+$/, '')
    const { ext, suffix } = format === 'json'
      ? { ext: 'json', suffix: 'recap' }
      : format === 'transcript'
      ? { ext: 'txt', suffix: 'transcript' }
      : { ext: 'md', suffix: 'analysis' }
    const defaultName = `${baseName}_${suffix}.${ext}`
    await window.api.saveFile(content, defaultName)
  },

  loadHistory: async () => {
    const results = await window.api.getHistory() as MeetingResult[]
    const history: HistoryEntry[] = results.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      processedAt: r.processedAt,
      duration: r.duration
    }))
    set({ history })
  },

  loadSettings: async () => {
    const settings = await window.api.getSettings() as Settings
    set({ settings })
  },

  saveSettings: async (settings) => {
    await window.api.setSettings(settings)
    set({ settings })
  },

  testLlm: async () => {
    return await window.api.testLlm() as { ok: boolean; error?: string }
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  reset: () =>
    set({
      view: 'home',
      filePath: null,
      fileName: null,
      youtubeUrl: null,
      language: 'en' as LanguageCode,
      progress: null,
      error: null,
      result: null
    })
}))
