export enum WorkflowState {
  AWAITING_PROMPT = 'awaiting_prompt',
  GENERATING_TOPICS = 'generating_topics',
  AWAITING_TOPIC_SELECTION = 'awaiting_topic_selection',
  GENERATING_CONTENT = 'generating_content',
  AWAITING_CONTENT_APPROVAL = 'awaiting_content_approval',
  AWAITING_EDIT_INSTRUCTION = 'awaiting_edit_instruction',
  AWAITING_PLATFORM_SELECTION = 'awaiting_platform_selection',
  POSTING = 'posting',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export type Platform = 'facebook' | 'instagram' | 'linkedin'

export interface TopicOption {
  id: string
  title: string
  description: string
}

export interface PlatformDraft {
  facebook: string
  instagram: string
  linkedin: string
  imagePrompt: string
}

export interface PostResult {
  platform: Platform
  success: boolean
  postId?: string
  error?: string
}

export const TRIGGER_PHRASES = [
  'generate content',
  'create content',
  'new post',
  'hey, generate content',
  'hey generate content',
]

export function isTriggerMessage(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  return TRIGGER_PHRASES.some(
    (phrase) => normalized === phrase || normalized.includes(phrase),
  )
}

/** Returns 1-based topic index, or null if the reply is not a valid selection. */
export function parseTopicSelection(text: string, topicCount: number): number | null {
  const normalized = text.trim()
  const match = normalized.match(/^(\d+)$/)
  if (!match) return null

  const index = Number.parseInt(match[1], 10)
  if (index < 1 || index > topicCount) return null
  return index
}

export function parsePlatformSelection(text: string): Platform[] {
  const normalized = text.toLowerCase().trim()
  if (normalized === 'all' || normalized === '1,2,3' || normalized === '123') {
    return ['facebook', 'instagram', 'linkedin']
  }

  const platforms: Platform[] = []
  const parts = normalized.split(/[,\s]+/).filter(Boolean)

  for (const part of parts) {
    if (part === '1' || part.includes('facebook') || part === 'fb') {
      platforms.push('facebook')
    }
    if (part === '2' || part.includes('instagram') || part === 'ig') {
      platforms.push('instagram')
    }
    if (part === '3' || part.includes('linkedin') || part === 'li') {
      platforms.push('linkedin')
    }
  }

  return [...new Set(platforms)]
}
