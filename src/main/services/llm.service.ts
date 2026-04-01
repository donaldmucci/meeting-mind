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

  private async chat(systemPrompt: string, transcript: string, signal?: AbortSignal): Promise<string> {
    const response = await this.client.chat.completions.create(
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
    let content = response.choices[0]?.message?.content || '{}'
    // Strip markdown code fences that some models wrap around JSON
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    return content
  }

  async generateSummary(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<MeetingSummary> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat(summaryPrompt(lang), transcript, signal)
    const parsed = JSON.parse(raw)
    return {
      overview: parsed.overview || '',
      keyPoints: parsed.keyPoints || []
    }
  }

  async extractTopics(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<Topic[]> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat(topicsPrompt(lang), transcript, signal)
    const parsed = JSON.parse(raw)
    return parsed.topics || []
  }

  async extractDecisions(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<Decision[]> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat(decisionsPrompt(lang), transcript, signal)
    const parsed = JSON.parse(raw)
    return parsed.decisions || []
  }

  async extractActionItems(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<ActionItem[]> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat(actionItemsPrompt(lang), transcript, signal)
    const parsed = JSON.parse(raw)
    return parsed.actionItems || []
  }

  async extractFollowUps(segments: TranscriptSegment[], lang: LanguageCode, signal?: AbortSignal): Promise<FollowUp[]> {
    const transcript = buildTranscriptContext(segments)
    const raw = await this.chat(followUpsPrompt(lang), transcript, signal)
    const parsed = JSON.parse(raw)
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
