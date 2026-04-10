import type { Api } from '../../../preload/index'

declare global {
  interface Window {
    api: Api
  }
}

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' }
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

export interface Settings {
  llm: {
    endpoint: string
    apiKey: string
    model: string
  }
  whisper: {
    pythonPath: string
    model: 'tiny' | 'base' | 'small' | 'medium' | 'large'
    device: 'auto' | 'cpu' | 'cuda'
    hfToken: string
  }
}

export interface TranscriptSegment {
  speaker: string
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  segments: TranscriptSegment[]
  speakers: string[]
  duration: number
  language: string
}

export interface MeetingSummary {
  overview: string
  keyPoints: string[]
}

export interface Topic {
  name: string
  description: string
  startTime: number
  endTime: number
}

export interface Decision {
  decision: string
  madeBy: string
  context: string
  timestamp: number
}

export interface ActionItem {
  task: string
  assignee: string
  deadline: string
  priority: 'high' | 'medium' | 'low'
}

export interface FollowUp {
  item: string
  responsible: string
  suggestedDate: string
}

export interface MeetingResult {
  id: string
  filePath: string
  fileName: string
  language: LanguageCode
  processedAt: string
  duration: number
  transcript: TranscriptionResult
  summary: MeetingSummary
  topics: Topic[]
  decisions: Decision[]
  actionItems: ActionItem[]
  followUps: FollowUp[]
}

export interface PipelineProgress {
  step: 'downloading' | 'transcribing' | 'analyzing' | 'complete' | 'error'
  percent: number
  message: string
}
