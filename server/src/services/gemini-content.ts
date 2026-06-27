import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env.js'
import type { PlatformDraft, TopicOption } from '../workflow/states.js'

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

const TEXT_MODEL = 'gemini-2.5-flash'

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned) as T
}

export async function generateTopics(seedPrompt: string): Promise<TopicOption[]> {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `You are a social media strategist. Given this niche/theme: "${seedPrompt}"

Generate exactly 5 engaging content topic ideas for Facebook, Instagram, and LinkedIn.

Return ONLY valid JSON array with this shape:
[
  {"id": "topic_1", "title": "Clear, descriptive title", "description": "One or two sentence description"}
]

Use full descriptive titles (not abbreviated). Make topics diverse, actionable, and suitable for visual social posts.`,
  })

  const text = response.text ?? '[]'
  const topics = parseJson<TopicOption[]>(text)
  return topics.slice(0, 5).map((t, i) => ({
    id: t.id || `topic_${i + 1}`,
    title: t.title,
    description: t.description,
  }))
}

export async function generateDraft(
  seedPrompt: string,
  topic: TopicOption,
): Promise<PlatformDraft> {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `You are a social media copywriter.

Niche/theme: "${seedPrompt}"
Selected topic: "${topic.title}" — ${topic.description}

Write platform-specific post captions and an image prompt.

Return ONLY valid JSON:
{
  "facebook": "Facebook caption (2-4 sentences, conversational)",
  "instagram": "Instagram caption (shorter, with 5-8 relevant hashtags at end)",
  "linkedin": "LinkedIn caption (professional tone, 2-3 paragraphs max)",
  "imagePrompt": "Detailed prompt for AI image generation matching the post theme"
}`,
  })

  return parseJson<PlatformDraft>(response.text ?? '{}')
}

export async function reviseDraft(
  currentDraft: PlatformDraft,
  editInstruction: string,
): Promise<PlatformDraft> {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: `Revise this social media content based on the user's feedback.

Current content:
${JSON.stringify(currentDraft, null, 2)}

User edit request: "${editInstruction}"

Return ONLY valid JSON with the same shape:
{
  "facebook": "...",
  "instagram": "...",
  "linkedin": "...",
  "imagePrompt": "..."
}`,
  })

  return parseJson<PlatformDraft>(response.text ?? JSON.stringify(currentDraft))
}

export function formatDraftPreview(draft: PlatformDraft): string {
  return [
    '*Content Preview*',
    '',
    '*Facebook:*',
    draft.facebook,
    '',
    '*Instagram:*',
    draft.instagram,
    '',
    '*LinkedIn:*',
    draft.linkedin,
  ].join('\n')
}
