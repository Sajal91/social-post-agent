import type { TenantContext } from '../types/tenant.js'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

async function graphPost(
  path: string,
  body: Record<string, string>,
): Promise<{ id?: string; error?: { message: string } }> {
  const params = new URLSearchParams(body)
  const res = await fetch(`${GRAPH_API}${path}?${params}`, { method: 'POST' })
  return res.json() as Promise<{ id?: string; error?: { message: string } }>
}

export async function postToInstagram(
  caption: string,
  imageUrl: string,
  tenant: TenantContext,
): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (tenant.postingDryRun) {
    return { success: true, postId: 'dry_run_instagram' }
  }

  const igUserId = tenant.instagramBusinessAccountId
  const token = tenant.facebookPageAccessToken

  if (!igUserId || !token) {
    return { success: false, error: 'Instagram credentials not configured' }
  }

  const container = await graphPost(`/${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: token,
  })

  if (container.error || !container.id) {
    return {
      success: false,
      error: container.error?.message ?? 'Failed to create media container',
    }
  }

  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: token,
  })

  if (published.error) {
    return { success: false, error: published.error.message }
  }

  return { success: true, postId: published.id }
}
