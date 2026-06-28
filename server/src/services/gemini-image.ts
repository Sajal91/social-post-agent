import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { TenantContext } from '../types/tenant.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads')

export async function generateImage(
  imagePrompt: string,
  tenant: TenantContext,
): Promise<{
  filePath: string
  fileName: string
}> {
  void imagePrompt
  void tenant
  await mkdir(join(UPLOADS_DIR, tenant.userId), { recursive: true })

  const fileName = `${tenant.userId}/business-automation.jpeg`
  const filePath = join(UPLOADS_DIR, fileName)

  return { filePath, fileName }
}

export function getImagePublicUrl(fileName: string, tenant: TenantContext): string | undefined {
  if (!tenant.publicBaseUrl) return undefined
  const url = `${tenant.publicBaseUrl}/uploads/${fileName}`
  return url;
}
