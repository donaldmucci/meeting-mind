import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { TranscriptSegment } from '../../lib/types'

const SPEAKER_COLORS = [
  'text-blue-400',
  'text-green-400',
  'text-purple-400',
  'text-orange-400',
  'text-pink-400',
  'text-cyan-400',
  'text-yellow-400',
  'text-red-400'
]

interface Props {
  segments: TranscriptSegment[]
}

export function TranscriptView({ segments }: Props) {
  const [search, setSearch] = useState('')

  const speakerColorMap = useMemo(() => {
    const speakers = [...new Set(segments.map((s) => s.speaker))]
    const map: Record<string, string> = {}
    speakers.forEach((s, i) => {
      map[s] = SPEAKER_COLORS[i % SPEAKER_COLORS.length]
    })
    return map
  }, [segments])

  const filtered = useMemo(() => {
    if (!search.trim()) return segments
    const q = search.toLowerCase()
    return segments.filter((s) => s.text.toLowerCase().includes(q))
  }, [segments, search])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcript..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Segments */}
      <div className="space-y-1">
        {filtered.map((seg, i) => (
          <div key={i} className="flex gap-3 rounded-md px-3 py-2 hover:bg-zinc-900/50">
            <span className="shrink-0 pt-0.5 text-xs text-zinc-600 tabular-nums">
              {formatTime(seg.start)}
            </span>
            <div className="min-w-0">
              <span className={`text-xs font-medium ${speakerColorMap[seg.speaker] || 'text-zinc-400'}`}>
                {seg.speaker}
              </span>
              <p className="text-sm text-zinc-300">{seg.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}
