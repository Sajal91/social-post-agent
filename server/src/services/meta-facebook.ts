import { env } from '../config/env.js'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

async function graphPost(
  path: string,
  body: Record<string, string>,
): Promise<{ id?: string; error?: { message: string } }> {
  const params = new URLSearchParams(body)
  const res = await fetch(`${GRAPH_API}${path}?${params}`, { method: 'POST' })
  return res.json() as Promise<{ id?: string; error?: { message: string } }>
}

export async function postToFacebook(
  caption: string,
  imageUrl?: string,
): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (env.POSTING_DRY_RUN) {
    return { success: true, postId: 'dry_run_facebook' }
  }

  if (!env.FACEBOOK_PAGE_ID || !env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    return { success: false, error: 'Facebook credentials not configured' }
  }

  const token = env.FACEBOOK_PAGE_ACCESS_TOKEN
  const pageId = env.FACEBOOK_PAGE_ID

  if (imageUrl) {
    const result = await graphPost(`/${pageId}/photos`, {
      url: imageUrl,
      caption,
      access_token: token,
    })
    if (result.error) return { success: false, error: result.error.message }
    return { success: true, postId: result.id }
  }

  const result = await graphPost(`/${pageId}/feed`, {
    message: caption,
    access_token: token,
  })
  if (result.error) return { success: false, error: result.error.message }
  return { success: true, postId: result.id }
}
