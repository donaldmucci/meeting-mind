import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { TranscriptionService } from './transcription.service'
import { LlmService } from './llm.service'
import { getSettings } from './settings.service'
import { MeetingResult, PipelineProgress, LanguageCode, SummaryDetail } from '../lib/types'

export class PipelineService {
  private transcriptionService = new TranscriptionService()
  private abortController: AbortController | null = null

  async run(
    filePath: string,
    language: LanguageCode,
    summaryDetail: SummaryDetail,
    onProgress: (progress: PipelineProgress) => void
  ): Promise<MeetingResult> {
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    const settings = getSettings()
    const isUrl = filePath.startsWith('http://') || filePath.startsWith('https://')
    const fileName = isUrl ? 'YouTube Video' : path.basename(filePath)

    const t0 = Date.now()
    console.log('[MM][pipeline] run() start')
    console.log('[MM][pipeline] filePath:', filePath)
    console.log('[MM][pipeline] language:', language)
    console.log('[MM][pipeline] isUrl:', isUrl)
    console.log('[MM][pipeline] llm endpoint:', settings.llm.endpoint, 'model:', settings.llm.model)
    console.log('[MM][pipeline] summaryDetail:', summaryDetail)
    console.log('[MM][pipeline] whisper:', settings.whisper)

    try {
      // Step 1: Transcription (0-60%), includes optional YouTube download
      onProgress({ step: isUrl ? 'downloading' : 'transcribing', percent: 0, message: isUrl ? 'Preparing download...' : 'Starting transcription...' })

      // Override whisper language with the user's per-file selection
      const whisperSettings = { ...settings.whisper, language }

      console.log('[MM][pipeline] -> transcription start')
      const tTrans = Date.now()
      const transcript = await this.transcriptionService.transcribe(
        filePath,
        whisperSettings,
        (percent, message) => {
          // Map whisper progress (0-100) to pipeline progress (0-60)
          // For YouTube URLs, percent <= 10 = downloading phase
          const step = isUrl && percent <= 10 ? 'downloading' : 'transcribing'
          onProgress({
            step,
            percent: Math.round(percent * 0.6),
            message
          })
        },
        signal
      )
      console.log(`[MM][pipeline] <- transcription done in ${Date.now() - tTrans}ms`)
      console.log(`[MM][pipeline] transcript: ${transcript.segments?.length ?? 0} segments, ${transcript.duration}s, lang=${transcript.language}, speakers=${transcript.speakers?.join(',')}`)

      onProgress({ step: 'transcribing', percent: 60, message: 'Transcription complete' })

      // Step 2: LLM Analysis (60-95%)
      onProgress({ step: 'analyzing', percent: 60, message: 'Analyzing transcript with LLM...' })

      const llm = new LlmService(settings.llm)

      console.log('[MM][pipeline] -> LLM analysis (5 parallel calls)')
      const tLlm = Date.now()
      const [summary, topics, decisions, actionItems, followUps] = await Promise.all([
        llm.generateSummary(transcript.segments, language, summaryDetail, signal),
        llm.extractTopics(transcript.segments, language, signal),
        llm.extractDecisions(transcript.segments, language, signal),
        llm.extractActionItems(transcript.segments, language, signal),
        llm.extractFollowUps(transcript.segments, language, signal)
      ])
      console.log(`[MM][pipeline] <- LLM analysis done in ${Date.now() - tLlm}ms`)
      console.log(`[MM][pipeline] results: ${topics.length} topics, ${decisions.length} decisions, ${actionItems.length} action items, ${followUps.length} follow-ups`)

      onProgress({ step: 'analyzing', percent: 95, message: 'Analysis complete' })

      // Assemble result
      const result: MeetingResult = {
        id: randomUUID(),
        filePath,
        fileName,
        language,
        processedAt: new Date().toISOString(),
        duration: transcript.duration,
        transcript,
        summary,
        summaryDetail,
        topics,
        decisions,
        actionItems,
        followUps
      }

      // Save result
      await this.saveResult(result)
      console.log(`[MM][pipeline] saved result ${result.id}`)
      console.log(`[MM][pipeline] run() complete in ${Date.now() - t0}ms`)

      onProgress({ step: 'complete', percent: 100, message: 'Done' })
      return result
    } catch (err) {
      const e = err as Error
      if (e.message === 'Cancelled') {
        console.log('[MM][pipeline] cancelled')
        throw err
      }
      console.error('[MM][pipeline] FAILED:', e.message)
      console.error('[MM][pipeline] stack:', e.stack)
      onProgress({
        step: 'error',
        percent: 0,
        message: e.message
      })
      throw err
    } finally {
      this.abortController = null
    }
  }

  cancel(): void {
    this.abortController?.abort()
    this.transcriptionService.cancel()
  }

  async regenerateSummary(id: string, detail: SummaryDetail): Promise<MeetingResult | null> {
    const existing = await this.getResult(id)
    if (!existing) return null

    this.abortController = new AbortController()
    const signal = this.abortController.signal

    const settings = getSettings()
    const llm = new LlmService(settings.llm)

    console.log(`[MM][pipeline] regenerateSummary id=${id} detail=${detail}`)
    const t0 = Date.now()
    try {
      const summary = await llm.generateSummary(
        existing.transcript.segments,
        existing.language,
        detail,
        signal
      )
      const updated: MeetingResult = { ...existing, summary, summaryDetail: detail }
      await this.saveResult(updated)
      console.log(`[MM][pipeline] regenerateSummary done in ${Date.now() - t0}ms`)
      return updated
    } finally {
      this.abortController = null
    }
  }

  private async saveResult(result: MeetingResult): Promise<void> {
    const dir = path.join(app.getPath('userData'), 'results')
    await fs.promises.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, `${result.id}.json`)
    await fs.promises.writeFile(filePath, JSON.stringify(result, null, 2))
  }

  async getHistory(): Promise<MeetingResult[]> {
    const dir = path.join(app.getPath('userData'), 'results')
    try {
      const files = await fs.promises.readdir(dir)
      const results: MeetingResult[] = []
      for (const file of files.filter((f) => f.endsWith('.json'))) {
        const data = await fs.promises.readFile(path.join(dir, file), 'utf-8')
        results.push(withDefaults(JSON.parse(data)))
      }
      return results.sort(
        (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
      )
    } catch {
      return []
    }
  }

  async getResult(id: string): Promise<MeetingResult | null> {
    const dir = path.join(app.getPath('userData'), 'results')
    const filePath = path.join(dir, `${id}.json`)
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8')
      return withDefaults(JSON.parse(data))
    } catch {
      return null
    }
  }

  async deleteResult(id: string): Promise<void> {
    const dir = path.join(app.getPath('userData'), 'results')
    const filePath = path.join(dir, `${id}.json`)
    await fs.promises.unlink(filePath).catch(() => {})
  }

  async exportResult(result: MeetingResult, format: 'json' | 'markdown' | 'transcript'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(result, null, 2)
    }
    if (format === 'transcript') {
      return this.toTranscriptText(result)
    }
    return this.toMarkdown(result)
  }

  private toTranscriptText(r: MeetingResult): string {
    const header = [
      `Meeting: ${r.fileName}`,
      `Date: ${new Date(r.processedAt).toLocaleString()}`,
      `Duration: ${formatDuration(r.duration)}`,
      `Language: ${r.language}`,
      `Speakers: ${r.transcript.speakers.join(', ')}`,
      ''.padEnd(60, '='),
      ''
    ]
    const body = r.transcript.segments.map((seg) => {
      return `[${formatTime(seg.start)}] ${seg.speaker}: ${seg.text}`
    })
    return [...header, ...body].join('\n')
  }

  private toMarkdown(r: MeetingResult): string {
    const lines: string[] = [
      `# Meeting: ${r.fileName}`,
      `**Date:** ${new Date(r.processedAt).toLocaleDateString()}`,
      `**Duration:** ${Math.round(r.duration / 60)} minutes`,
      '',
      '## Summary',
      r.summary.overview,
      '',
      '### Key Points',
      ...r.summary.keyPoints.map((p) => `- ${p}`),
      '',
      '## Topics',
      ...r.topics.map((t) => `### ${t.name}\n${t.description}`),
      '',
      '## Decisions',
      ...r.decisions.map((d) => `- **${d.decision}** (${d.madeBy}) — ${d.context}`),
      '',
      '## Action Items',
      '| Task | Assignee | Deadline | Priority |',
      '|------|----------|----------|----------|',
      ...r.actionItems.map((a) => `| ${a.task} | ${a.assignee} | ${a.deadline} | ${a.priority} |`),
      '',
      '## Follow-ups',
      ...r.followUps.map((f) => `- ${f.item} (${f.responsible}, ${f.suggestedDate})`)
    ]
    return lines.join('\n')
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n: number): string => n.toString().padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s}s`
}

function withDefaults(r: MeetingResult): MeetingResult {
  return { ...r, summaryDetail: r.summaryDetail ?? 'normal' }
}
