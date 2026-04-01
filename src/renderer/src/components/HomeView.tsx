import { Upload, FileVideo, Clock, Trash2, Languages, Link, X } from 'lucide-react'
import { useAppStore } from '../stores/app.store'
import { LANGUAGES } from '../lib/types'
import type { LanguageCode } from '../lib/types'

export function HomeView() {
  const filePath = useAppStore((s) => s.filePath)
  const fileName = useAppStore((s) => s.fileName)
  const youtubeUrl = useAppStore((s) => s.youtubeUrl)
  const language = useAppStore((s) => s.language)
  const error = useAppStore((s) => s.error)
  const history = useAppStore((s) => s.history)
  const selectFile = useAppStore((s) => s.selectFile)
  const setYoutubeUrl = useAppStore((s) => s.setYoutubeUrl)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const startProcessing = useAppStore((s) => s.startProcessing)
  const openResult = useAppStore((s) => s.openResult)
  const deleteResult = useAppStore((s) => s.deleteResult)

  const hasInput = !!filePath || !!youtubeUrl

  return (
    <div className="flex h-full">
      {/* Main area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        {error && (
          <div className="w-full max-w-md rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* File picker */}
        <button
          onClick={selectFile}
          className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border-2 border-dashed border-zinc-700 p-12 transition hover:border-blue-500 hover:bg-zinc-900/50"
        >
          {filePath ? (
            <>
              <FileVideo size={48} className="text-blue-400" />
              <div className="text-center">
                <p className="font-medium text-zinc-200">{fileName}</p>
                <p className="mt-1 text-sm text-zinc-500">Click to change file</p>
              </div>
            </>
          ) : (
            <>
              <Upload size={48} className="text-zinc-600" />
              <div className="text-center">
                <p className="font-medium text-zinc-300">Select a video file</p>
                <p className="mt-1 text-sm text-zinc-500">MP4, MKV, WebM, AVI, MOV</p>
              </div>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex w-full max-w-md items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600">OR</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* YouTube URL input */}
        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 focus-within:border-blue-500">
          <Link size={18} className="shrink-0 text-zinc-500" />
          <input
            type="text"
            placeholder="Paste a YouTube URL"
            value={youtubeUrl || ''}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
          {youtubeUrl && (
            <button
              onClick={() => setYoutubeUrl('')}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Language selector + Analyze button */}
        {hasInput && (
          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <div className="flex w-full items-center gap-3">
              <Languages size={18} className="shrink-0 text-zinc-400" />
              <label className="shrink-0 text-sm text-zinc-400">Conversation language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={startProcessing}
              className="rounded-lg bg-blue-600 px-8 py-2.5 font-medium text-white transition hover:bg-blue-500"
            >
              Analyze
            </button>
          </div>
        )}
      </div>

      {/* History sidebar */}
      {history.length > 0 && (
        <aside className="w-72 border-l border-zinc-800 overflow-y-auto p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Recent Analyses</h2>
          <div className="flex flex-col gap-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-start justify-between rounded-lg border border-zinc-800 p-3 transition hover:border-zinc-700 hover:bg-zinc-900/50"
              >
                <button onClick={() => openResult(entry.id)} className="flex-1 text-left">
                  <p className="text-sm font-medium text-zinc-200 truncate">{entry.fileName}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                    <Clock size={12} />
                    {new Date(entry.processedAt).toLocaleDateString()}
                    <span>{Math.round(entry.duration / 60)}m</span>
                  </div>
                </button>
                <button
                  onClick={() => deleteResult(entry.id)}
                  className="mt-0.5 rounded p-1 text-zinc-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  )
}
