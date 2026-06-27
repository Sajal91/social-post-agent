import { env } from '../config/env.js'

const GRAPH_API = 'https://graph.facebook.com/v25.0'

async function graphPost(
  path: string,
  body: Record<string, string>,
): Promise<{ id?: string; error?: { message: string } }> {
  const params = new URLSearchParams(body)
  const res = await fetch(`${GRAPH_API}${path}?${params}`, { method: 'POST' })
  return res.json() as Promise<{ id?: string; error?: { message: string } }>
}

export async function graphFacebookPage() {
  const res = await fetch(`${GRAPH_API}/me/accounts?access_token=${env.FACEBOOK_PAGE_ACCESS_TOKEN}`, { method: 'GET' })
  return res.json() as Promise<{ data: [{ access_token?: string, id?: string }], error: { message: string } }>
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

  let token = ""
  let pageId = ""

  const pageResult = await graphFacebookPage();

  if (pageResult.error) return { success: false, postId: pageResult.error.message }

  token = pageResult.data[0].access_token as string
  pageId = pageResult.data[0].id as string

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
