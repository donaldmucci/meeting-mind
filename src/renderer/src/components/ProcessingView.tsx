import { Loader2, X } from 'lucide-react'
import { useMemo } from 'react'
import { useAppStore } from '../stores/app.store'

const FILE_STEPS = [
  { key: 'transcribing', label: 'Transcribing audio' },
  { key: 'analyzing', label: 'Analyzing with LLM' },
  { key: 'complete', label: 'Complete' }
] as const

const YOUTUBE_STEPS = [
  { key: 'downloading', label: 'Downloading from YouTube' },
  { key: 'transcribing', label: 'Transcribing audio' },
  { key: 'analyzing', label: 'Analyzing with LLM' },
  { key: 'complete', label: 'Complete' }
] as const

export function ProcessingView() {
  const progress = useAppStore((s) => s.progress)
  const fileName = useAppStore((s) => s.fileName)
  const youtubeUrl = useAppStore((s) => s.youtubeUrl)
  const cancelProcessing = useAppStore((s) => s.cancelProcessing)

  const steps = useMemo(() => (youtubeUrl ? YOUTUBE_STEPS : FILE_STEPS), [youtubeUrl])
  const currentStepIndex = steps.findIndex((s) => s.key === progress?.step) ?? 0
  const percent = progress?.percent ?? 0

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <div className="w-full max-w-lg">
        <p className="mb-6 text-center text-sm text-zinc-400">
          Processing <span className="font-medium text-zinc-200">{fileName}</span>
        </p>

        {/* Progress bar */}
        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4">
          {steps.map((step, i) => {
            const isActive = step.key === progress?.step
            const isDone = i < currentStepIndex || progress?.step === 'complete'

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                    isDone
                      ? 'bg-green-600 text-white'
                      : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {isDone ? '✓' : isActive ? <Loader2 size={14} className="animate-spin" /> : i + 1}
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isDone ? 'text-green-400' : isActive ? 'text-zinc-200' : 'text-zinc-500'
                    }`}
                  >
                    {step.label}
                  </p>
                  {isActive && progress?.message && (
                    <p className="text-xs text-zinc-500">{progress.message}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Cancel */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={cancelProcessing}
            className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
