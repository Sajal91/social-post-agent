import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { GoogleGenAI, Modality } from '@google/genai'
import { env } from '../config/env.js'

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
const IMAGE_MODEL = 'gemini-2.5-flash-image'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads')

export async function generateImage(imagePrompt: string): Promise<{
  filePath: string
  fileName: string
}> {
  await mkdir(UPLOADS_DIR, { recursive: true })

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: imagePrompt,
    config: {
      responseModalities: [Modality.IMAGE],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p) => p.inlineData?.data)

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini did not return an image')
  }

  const fileName = `${randomUUID()}.png`
  const filePath = join(UPLOADS_DIR, fileName)
  await writeFile(filePath, Buffer.from(imagePart.inlineData.data, 'base64'))

  return { filePath, fileName }
}

export function getImagePublicUrl(fileName: string): string | undefined {
  if (!env.PUBLIC_BASE_URL) return undefined
  return `${env.PUBLIC_BASE_URL}/uploads/${fileName}`
}
