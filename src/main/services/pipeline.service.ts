import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { TranscriptionService } from './transcription.service'
import { LlmService } from './llm.service'
import { getSettings } from './settings.service'
import { MeetingResult, PipelineProgress, LanguageCode } from '../lib/types'

export class PipelineService {
  private transcriptionService = new TranscriptionService()
  private abortController: AbortController | null = null

  async run(
    filePath: string,
    language: LanguageCode,
    onProgress: (progress: PipelineProgress) => void
  ): Promise<MeetingResult> {
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    const settings = getSettings()
    const isUrl = filePath.startsWith('http://') || filePath.startsWith('https://')
    const fileName = isUrl ? 'YouTube Video' : path.basename(filePath)

    try {
      // Step 1: Transcription (0-60%), includes optional YouTube download
      onProgress({ step: isUrl ? 'downloading' : 'transcribing', percent: 0, message: isUrl ? 'Preparing download...' : 'Starting transcription...' })

      // Override whisper language with the user's per-file selection
      const whisperSettings = { ...settings.whisper, language }

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

      onProgress({ step: 'transcribing', percent: 60, message: 'Transcription complete' })

      // Step 2: LLM Analysis (60-95%)
      onProgress({ step: 'analyzing', percent: 60, message: 'Analyzing transcript with LLM...' })

      const llm = new LlmService(settings.llm)

      const [summary, topics, decisions, actionItems, followUps] = await Promise.all([
        llm.generateSummary(transcript.segments, language, signal),
        llm.extractTopics(transcript.segments, language, signal),
        llm.extractDecisions(transcript.segments, language, signal),
        llm.extractActionItems(transcript.segments, language, signal),
        llm.extractFollowUps(transcript.segments, language, signal)
      ])

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
        topics,
        decisions,
        actionItems,
        followUps
      }

      // Save result
      await this.saveResult(result)

      onProgress({ step: 'complete', percent: 100, message: 'Done' })
      return result
    } catch (err) {
      if ((err as Error).message === 'Cancelled') {
        throw err
      }
      onProgress({
        step: 'error',
        percent: 0,
        message: (err as Error).message
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
        results.push(JSON.parse(data))
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
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  async deleteResult(id: string): Promise<void> {
    const dir = path.join(app.getPath('userData'), 'results')
    const filePath = path.join(dir, `${id}.json`)
    await fs.promises.unlink(filePath).catch(() => {})
  }

  async exportResult(result: MeetingResult, format: 'json' | 'markdown'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(result, null, 2)
    }
    return this.toMarkdown(result)
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
