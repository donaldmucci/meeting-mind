import { useState, useEffect } from 'react'
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAppStore } from '../stores/app.store'
import type { Settings } from '../lib/types'

export function SettingsDialog() {
  const isOpen = useAppStore((s) => s.settingsOpen)
  const settings = useAppStore((s) => s.settings)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const saveSettings = useAppStore((s) => s.saveSettings)
  const testLlm = useAppStore((s) => s.testLlm)

  const [form, setForm] = useState<Settings | null>(null)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState('')

  useEffect(() => {
    if (settings && isOpen) setForm(settings)
  }, [settings, isOpen])

  if (!isOpen || !form) return null

  const handleSave = async () => {
    await saveSettings(form)
    setSettingsOpen(false)
  }

  const handleTest = async () => {
    // Temporarily save to test with current form values
    await saveSettings(form)
    setTestStatus('testing')
    const result = await testLlm()
    if (result.ok) {
      setTestStatus('ok')
    } else {
      setTestStatus('error')
      setTestError(result.error || 'Connection failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={() => setSettingsOpen(false)} className="text-zinc-400 hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* LLM Section */}
          <section>
            <h3 className="mb-3 text-sm font-medium text-zinc-300">LLM Configuration</h3>
            <div className="space-y-3">
              <Field
                label="Endpoint URL"
                value={form.llm.endpoint}
                onChange={(v) => setForm({ ...form, llm: { ...form.llm, endpoint: v } })}
                placeholder="http://localhost:11434/v1"
              />
              <Field
                label="API Key"
                value={form.llm.apiKey}
                onChange={(v) => setForm({ ...form, llm: { ...form.llm, apiKey: v } })}
                placeholder="sk-... or ollama"
                type="password"
              />
              <Field
                label="Model"
                value={form.llm.model}
                onChange={(v) => setForm({ ...form, llm: { ...form.llm, model: v } })}
                placeholder="llama3"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTest}
                  disabled={testStatus === 'testing'}
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                >
                  {testStatus === 'testing' ? (
                    <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Testing...</span>
                  ) : 'Test Connection'}
                </button>
                {testStatus === 'ok' && <span className="flex items-center gap-1 text-sm text-green-400"><CheckCircle size={14} /> Connected</span>}
                {testStatus === 'error' && <span className="flex items-center gap-1 text-sm text-red-400"><XCircle size={14} /> {testError}</span>}
              </div>
            </div>
          </section>

          {/* Whisper Section */}
          <section>
            <h3 className="mb-3 text-sm font-medium text-zinc-300">Whisper (Transcription)</h3>
            <div className="space-y-3">
              <Field
                label="Python Path"
                value={form.whisper.pythonPath}
                onChange={(v) => setForm({ ...form, whisper: { ...form.whisper, pythonPath: v } })}
                placeholder="python3"
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Model Size</label>
                <select
                  value={form.whisper.model}
                  onChange={(e) => setForm({ ...form, whisper: { ...form.whisper, model: e.target.value as Settings['whisper']['model'] } })}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="tiny">Tiny (fastest, lowest accuracy)</option>
                  <option value="base">Base</option>
                  <option value="small">Small (recommended)</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large (slowest, highest accuracy)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Device</label>
                <select
                  value={form.whisper.device}
                  onChange={(e) => setForm({ ...form, whisper: { ...form.whisper, device: e.target.value as Settings['whisper']['device'] } })}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="auto">Auto</option>
                  <option value="cpu">CPU</option>
                  <option value="cuda">CUDA (GPU)</option>
                </select>
              </div>
              <div>
                <Field
                  label="HuggingFace Token (optional, for speaker diarization)"
                  value={form.whisper.hfToken}
                  onChange={(v) => setForm({ ...form, whisper: { ...form.whisper, hfToken: v } })}
                  placeholder="hf_..."
                  type="password"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Required to identify different speakers. Get one at{' '}
                  <span className="text-zinc-400">huggingface.co/settings/tokens</span>{' '}
                  and accept the terms for{' '}
                  <span className="text-zinc-400">pyannote/speaker-diarization-3.1</span>.
                  Without it, all speech is attributed to a single speaker.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}
