import { LANGUAGES, LanguageCode } from './types'

function languageName(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? 'English'
}

function langInstruction(code: LanguageCode): string {
  if (code === 'en') return ''
  return `\n\nIMPORTANT: The meeting was conducted in ${languageName(code)}. Write ALL output (overview, key points, descriptions, etc.) in ${languageName(code)}.`
}

export function summaryPrompt(lang: LanguageCode): string {
  return `You are a meeting analyst. Given a meeting transcript with speaker labels and timestamps, produce a structured summary.

Return JSON with this exact structure:
{
  "overview": "A 2-4 paragraph summary of the meeting covering the main discussion, outcomes, and overall tone.",
  "keyPoints": ["Key point 1", "Key point 2", ...]
}

Guidelines:
- Reference speakers by their labels (e.g., SPEAKER_00, SPEAKER_01)
- Focus on substance, not pleasantries
- Keep the overview concise but comprehensive
- List 3-8 key points${langInstruction(lang)}`
}

export function topicsPrompt(lang: LanguageCode): string {
  return `You are a meeting analyst. Given a meeting transcript with speaker labels and timestamps, identify the main discussion topics.

Return JSON with this exact structure:
{
  "topics": [
    {
      "name": "Topic title",
      "description": "Brief description of what was discussed",
      "startTime": 0.0,
      "endTime": 120.0
    }
  ]
}

Guidelines:
- Identify 3-10 distinct topics
- Use approximate timestamps from the transcript
- Order topics chronologically
- Merge very brief mentions into related topics${langInstruction(lang)}`
}

export function decisionsPrompt(lang: LanguageCode): string {
  return `You are a meeting analyst. Given a meeting transcript with speaker labels and timestamps, extract all decisions made during the meeting.

Return JSON with this exact structure:
{
  "decisions": [
    {
      "decision": "What was decided",
      "madeBy": "SPEAKER_XX or 'Group consensus'",
      "context": "Brief context for why this decision was made",
      "timestamp": 0.0
    }
  ]
}

Guidelines:
- Only include explicit decisions, not suggestions or opinions
- If no decisions were made, return an empty array
- Include the approximate timestamp
- Reference speakers by their labels${langInstruction(lang)}`
}

export function actionItemsPrompt(lang: LanguageCode): string {
  return `You are a meeting analyst. Given a meeting transcript with speaker labels and timestamps, extract all action items and tasks.

Return JSON with this exact structure:
{
  "actionItems": [
    {
      "task": "Description of the task",
      "assignee": "SPEAKER_XX or 'Unassigned'",
      "deadline": "Mentioned deadline or 'Not specified'",
      "priority": "high|medium|low"
    }
  ]
}

Guidelines:
- Include both explicitly assigned tasks and implied commitments ("I'll do X")
- If no action items exist, return an empty array
- Infer priority from urgency cues in the conversation
- Reference speakers by their labels${langInstruction(lang)}`
}

export function followUpsPrompt(lang: LanguageCode): string {
  return `You are a meeting analyst. Given a meeting transcript with speaker labels and timestamps, suggest follow-up items based on the discussion.

Return JSON with this exact structure:
{
  "followUps": [
    {
      "item": "What should be followed up on",
      "responsible": "SPEAKER_XX or 'Team'",
      "suggestedDate": "Suggested timeframe or 'Next meeting'"
    }
  ]
}

Guidelines:
- Include items that were left unresolved
- Include items that need further discussion
- Include items where someone said they'd "get back to" the group
- If nothing needs follow-up, return an empty array${langInstruction(lang)}`
}

export function buildTranscriptContext(segments: { speaker: string; start: number; text: string }[]): string {
  return segments
    .map((s) => `[${formatTime(s.start)}] ${s.speaker}: ${s.text}`)
    .join('\n')
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}
