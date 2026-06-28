import type { TenantContext } from '../types/tenant.js'

export async function postToLinkedIn(
  caption: string,
  tenant: TenantContext,
  imageUrl?: string,
): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (tenant.postingDryRun) {
    return { success: true, postId: 'dry_run_linkedin' }
  }

  const token = tenant.linkedinAccessToken
  const orgUrn = tenant.linkedinOrganizationUrn

  if (!token || !orgUrn) {
    return {
      success: false,
      error: 'LinkedIn credentials not configured — skipping',
    }
  }

  try {
    const body: Record<string, unknown> = {
      author: orgUrn,
      commentary: caption,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }

    if (imageUrl) {
      body.content = {
        media: {
          title: 'Social post image',
          id: imageUrl,
        },
      }
    }

    const res = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { success: false, error: errText.slice(0, 200) }
    }

    const postId = res.headers.get('x-restli-id') ?? undefined
    return { success: true, postId }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'LinkedIn post failed',
    }
  }
}
