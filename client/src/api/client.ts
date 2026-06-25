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
  platform: string
  success: boolean
  postId?: string
  error?: string
}

export interface WorkflowRun {
  _id: string
  waId: string
  state: string
  status: 'active' | 'completed' | 'cancelled' | 'failed'
  seedPrompt?: string
  topics: TopicOption[]
  selectedTopic?: TopicOption
  draft?: PlatformDraft
  imagePath?: string
  imageUrl?: string
  selectedPlatforms: string[]
  postResults: PostResult[]
  lastError?: string
  createdAt: string
  updatedAt: string
}

export async function fetchRuns(): Promise<WorkflowRun[]> {
  const res = await fetch('/api/runs')
  if (!res.ok) throw new Error('Failed to fetch runs')
  return res.json()
}

export async function fetchRun(id: string): Promise<WorkflowRun> {
  const res = await fetch(`/api/runs/${id}`)
  if (!res.ok) throw new Error('Run not found')
  return res.json()
}

export async function fetchHealth(): Promise<{ ok: boolean }> {
  const res = await fetch('/api/health')
  return res.json()
}
