import OpenAI from 'openai'
import { Settings, MeetingSummary, Topic, Decision, ActionItem, FollowUp, TranscriptSegment, LanguageCode } from '../lib/types'
import {
  summaryPrompt,
  topicsPrompt,
  decisionsPrompt,
  actionItemsPrompt,
  followUpsPrompt,
  buildTranscriptContext
} from '../lib/prompts'

export class LlmService {
  private client: OpenAI
  private model: string

  constructor(settings: Settings['llm']) {
    this.client = new OpenAI({
      baseURL: settings.endpoint,
      apiKey: settings.apiKey
    })
    this.model = settings.model
  }

  private async chat(label: string, systemPrompt: string, transcript: string, signal?: AbortSignal): Promise<string> {
    const t0 = Date.now()
    console.log(`[MM][llm][${label}] -> request (transcript ${transcript.length} chars, model ${this.model})`)
    let response
    try {
      response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Here is the meeting transcript:\n\n${transcript}` }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        },
        { signal }
      )
    } catch (err) {
      const e = err as Error & { status?: number; code?: string }
      console.error(`[MM][llm][${label}] HTTP/SDK error after ${Date.now() - t0}ms: ${e.message}`)
      if (e.status) console.error(`[MM][llm][${label}] status: ${e.status}`)
      if (e.code) console.error(`[MM][llm][${label}] code: ${e.code}`)
      throw err
    }

    let content = response.choices[0]?.message?.content || '{}'
    console.log(`[MM][llm][${label}] <- response in ${Date.now() - t0}ms (${content.length} chars)`)
    // Strip markdown code fences that some models wrap around JSON
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    return content
  }

  private safeParse<T>(label: string, raw: string): T {
    try {
      return JSON.parse(raw) as T
    } catch (err) {
      console.error(`[MM][llm][${label}] JSON.parse failed: ${(err as Error).message}`)
      console.error(`[MM][llm][${label}] raw content (first 800 chars):`)
      console.error(raw.slice(0, 800))
      throw new Error(`LLM ${label} returned invalid JSON: ${(err as Error).message}`)
    }
  }

  async generateSummary(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<MeetingSummary> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat('summary', summaryPrompt(lang), transcript, signal)
    const parsed = this.safeParse<{ overview?: string; keyPoints?: string[] }>('summary', raw)
    return {
      overview: parsed.overview || '',
      keyPoints: parsed.keyPoints || []
    }
  }

  async extractTopics(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<Topic[]> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat('topics', topicsPrompt(lang), transcript, signal)
    const parsed = this.safeParse<{ topics?: Topic[] }>('topics', raw)
    return parsed.topics || []
  }

  async extractDecisions(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<Decision[]> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat('decisions', decisionsPrompt(lang), transcript, signal)
    const parsed = this.safeParse<{ decisions?: Decision[] }>('decisions', raw)
    return parsed.decisions || []
  }

  async extractActionItems(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<ActionItem[]> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat('actionItems', actionItemsPrompt(lang), transcript, signal)
    const parsed = this.safeParse<{ actionItems?: ActionItem[] }>('actionItems', raw)
    return parsed.actionItems || []
  }

  async extractFollowUps(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<FollowUp[]> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat('followUps', followUpsPrompt(lang), transcript, signal)
    const parsed = this.safeParse<{ followUps?: FollowUp[] }>('followUps', raw)
    return parsed.followUps || []
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.client.models.list()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }
}
