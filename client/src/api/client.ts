const TOKEN_KEY = 'spa_token'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  status: 'pending' | 'active' | 'rejected'
  emailVerified: boolean
}

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
  userId?: string
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

export interface CredentialsForm {
  geminiApiKey?: string
  whatsappAccessToken?: string
  whatsappPhoneNumberId?: string
  whatsappVerifyToken?: string
  publicBaseUrl?: string
  postingDryRun?: boolean
  facebookPageId?: string
  facebookPageAccessToken?: string
  instagramBusinessAccountId?: string
  linkedinAccessToken?: string
  linkedinOrganizationUrn?: string
}

export interface SanitizedCredentials {
  hasGeminiApiKey: boolean
  hasWhatsappAccessToken: boolean
  whatsappPhoneNumberId: string
  hasWhatsappVerifyToken: boolean
  publicBaseUrl: string
  postingDryRun: boolean
  facebookPageId: string
  hasFacebookPageAccessToken: boolean
  instagramBusinessAccountId: string
  hasLinkedinAccessToken: boolean
  linkedinOrganizationUrn: string
}

export interface AdminUserSummary {
  userId: string
  name: string
  email: string
  status: string
  totalRuns: number
  completedRuns: number
  failedRuns: number
  activeRuns: number
}

export interface AdminUserListItem {
  id: string
  email: string
  name: string
  status: string
  emailVerified: boolean
  createdAt: string
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return data as T
}

export async function login(email: string, password: string) {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(email: string, password: string, name: string) {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
}

export async function fetchMe() {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/me')
}

export async function fetchRuns(all = false): Promise<WorkflowRun[]> {
  const query = all ? '?all=true' : ''
  return apiFetch(`/api/runs${query}`)
}

export async function fetchRun(id: string): Promise<WorkflowRun> {
  return apiFetch(`/api/runs/${id}`)
}

export async function fetchHealth(): Promise<{ ok: boolean }> {
  const res = await fetch('/api/health')
  return res.json()
}

export async function fetchAdminStats() {
  return apiFetch<{
    totalUsers: number
    pendingUsers: number
    activeUsers: number
    users: AdminUserSummary[]
  }>('/api/admin/stats')
}

export async function fetchAdminUsers() {
  return apiFetch<AdminUserListItem[]>('/api/admin/users')
}

export async function fetchAdminUser(id: string) {
  return apiFetch<{
    user: AdminUserListItem
    credentials: SanitizedCredentials | null
    credentialsForm: CredentialsForm | null
    allowedNumbers: string[]
    stats: Record<string, number>
    recentRuns: WorkflowRun[]
  }>(`/api/admin/users/${id}`)
}

export async function createAdminUser(payload: {
  email: string
  password: string
  name: string
  credentials?: CredentialsForm
}) {
  return apiFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function approveUser(id: string, credentials?: Partial<CredentialsForm>) {
  return apiFetch(`/api/admin/users/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ credentials }),
  })
}

export async function updateUserStatus(id: string, status: 'active' | 'rejected' | 'pending') {
  return apiFetch(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function updateUserCredentials(id: string, credentials: Partial<CredentialsForm>) {
  return apiFetch<{ credentials: SanitizedCredentials; credentialsForm: CredentialsForm | null }>(
    `/api/admin/users/${id}/credentials`,
    {
      method: 'PUT',
      body: JSON.stringify(credentials),
    },
  )
}

export async function fetchWhatsAppNumbers() {
  return apiFetch<Array<{ id: string; phone: string; verified: boolean }>>(
    '/api/users/whatsapp-numbers',
  )
}

export async function requestWhatsAppOtp(phone: string) {
  return apiFetch<{ message: string; phone: string }>('/api/users/whatsapp-numbers/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
}

export async function verifyWhatsAppOtp(phone: string, otp: string) {
  return apiFetch<{ message: string; phone: string }>('/api/users/whatsapp-numbers/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  })
}

export async function deleteWhatsAppNumber(id: string) {
  return apiFetch(`/api/users/whatsapp-numbers/${id}`, { method: 'DELETE' })
}
