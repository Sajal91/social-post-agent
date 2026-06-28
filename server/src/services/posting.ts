import type { IWorkflowRun } from '../models/WorkflowRun.js'
import { postToFacebook } from './meta-facebook.js'
import { postToInstagram } from './meta-instagram.js'
import { postToLinkedIn } from './linkedin.js'
import type { Platform, PostResult } from '../workflow/states.js'
import { getImagePublicUrl } from './gemini-image.js'
import type { TenantContext } from '../types/tenant.js'

export async function publishToPlatforms(
  run: IWorkflowRun,
  platforms: Platform[],
  tenant: TenantContext,
): Promise<PostResult[]> {
  const draft = run.draft
  if (!draft) {
    return platforms.map((platform) => ({
      platform,
      success: false,
      error: 'No draft content available',
    }))
  }

  const imageUrl =
    run.imageUrl ??
    (run.imagePath ? getImagePublicUrl(run.imagePath.split(/[/\\]/).pop()!, tenant) : undefined)

  const results: PostResult[] = []

  for (const platform of platforms) {
    if (platform === 'facebook') {
      const result = await postToFacebook(draft.facebook, tenant, imageUrl)
      results.push({ platform, ...result })
    } else if (platform === 'instagram') {
      if (!imageUrl) {
        results.push({
          platform,
          success: false,
          error: 'Instagram requires an image URL (set PUBLIC_BASE_URL)',
        })
      } else {
        const result = await postToInstagram(draft.instagram, imageUrl, tenant)
        results.push({ platform, ...result })
      }
    } else if (platform === 'linkedin') {
      const result = await postToLinkedIn(draft.linkedin, tenant, imageUrl)
      results.push({ platform, ...result })
    }
  }

  return results
}
