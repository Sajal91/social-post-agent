import { access, copyFile, mkdir, writeFile } from 'node:fs/promises'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { GoogleGenAI, Modality } from '@google/genai'
import type { TenantContext } from '../types/tenant.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads')
const DEFAULT_IMAGE = join(UPLOADS_DIR, 'business-automation.jpeg')
const IMAGE_MODEL = 'gemini-2.5-flash-image'

export function mimeFromPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/jpeg'
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function writeDefaultImage(filePath: string): Promise<void> {
  if (await fileExists(DEFAULT_IMAGE)) {
    await copyFile(DEFAULT_IMAGE, filePath)
    return
  }

  // Minimal valid 1x1 JPEG if no bundled default exists on the server
  const minimalJpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDAQLEBgYGCgkKCwgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZGBgZ/2wB/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
    'base64',
  )
  await writeFile(filePath, minimalJpeg)
}

export async function generateImage(
  imagePrompt: string,
  tenant: TenantContext,
): Promise<{
  filePath: string
  fileName: string
}> {
  const userDir = join(UPLOADS_DIR, tenant.userId)
  await mkdir(userDir, { recursive: true })

  const fileName = `${tenant.userId}/post-${randomUUID()}.jpeg`
  const filePath = join(UPLOADS_DIR, fileName)

  // try {
  //   const ai = new GoogleGenAI({ apiKey: tenant.geminiApiKey })
  //   const response = await ai.models.generateContent({
  //     model: IMAGE_MODEL,
  //     contents: imagePrompt,
  //     config: {
  //       responseModalities: [Modality.IMAGE],
  //     },
  //   })

  //   const parts = response.candidates?.[0]?.content?.parts ?? []
  //   const imagePart = parts.find((p) => p.inlineData?.data)

  //   if (imagePart?.inlineData?.data) {
  //     await writeFile(filePath, Buffer.from(imagePart.inlineData.data, 'base64'))
  //     return { filePath, fileName }
  //   }

  //   console.warn('[Gemini] No image in response, using fallback image')
  // } catch (err) {
  //   console.error('[Gemini] Image generation failed:', err)
  // }

  await writeDefaultImage(filePath)
  return { filePath, fileName }
}

export function getImagePublicUrl(fileName: string, tenant: TenantContext): string | undefined {
  if (!tenant.publicBaseUrl) return undefined
  return `${tenant.publicBaseUrl.replace(/\/$/, '')}/uploads/${fileName}`
}

export async function ensureImageReadable(filePath: string): Promise<void> {
  if (!(await fileExists(filePath))) {
    throw new Error(`Image file not found: ${filePath}`)
  }
}
