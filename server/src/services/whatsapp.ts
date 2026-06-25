import { env } from '../config/env.js'
import type { TopicOption } from '../workflow/states.js'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

async function sendPayload(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('WhatsApp send failed:', err)
    let detail = err
    try {
      const parsed = JSON.parse(err) as { error?: { message?: string } }
      detail = parsed.error?.message ?? err
    } catch {
      /* use raw err text */
    }
    throw new Error(`WhatsApp API error (${res.status}): ${detail}`)
  }
}

export async function sendText(to: string, body: string): Promise<void> {
  await sendPayload({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  })
}

export async function sendTopicList(
  to: string,
  topics: TopicOption[],
): Promise<void> {
  await sendPayload({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Pick a topic' },
      body: { text: 'Choose one topic for your social media content:' },
      footer: { text: 'SocialPostAgent' },
      action: {
        button: 'View topics',
        sections: [
          {
            title: 'Content topics',
            rows: topics.map((t) => ({
              id: t.id,
              title: t.title.slice(0, 24),
              description: t.description.slice(0, 72),
            })),
          },
        ],
      },
    },
  })
}

export async function sendApprovalButtons(to: string, body: string): Promise<void> {
  await sendPayload({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: 'approve', title: 'Approve' },
          },
          {
            type: 'reply',
            reply: { id: 'edit', title: 'Edit' },
          },
          {
            type: 'reply',
            reply: { id: 'regenerate', title: 'Regenerate' },
          },
        ],
      },
    },
  })
}

export async function sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
  await sendPayload({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: { link: imageUrl, caption: caption?.slice(0, 1024) },
  })
}

export async function uploadMedia(filePath: string, mimeType: string): Promise<string> {
  const { readFile } = await import('node:fs/promises')
  const data = await readFile(filePath)

  const formData = new FormData()
  formData.append('messaging_product', 'whatsapp')
  formData.append('type', mimeType)
  formData.append('file', new Blob([data], { type: mimeType }), 'image.png')

  const res = await fetch(`${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
    body: formData,
  })

  const json = (await res.json()) as { id?: string; error?: { message: string } }
  if (!json.id) {
    throw new Error(json.error?.message ?? 'Failed to upload media to WhatsApp')
  }
  return json.id
}

export async function sendImageByMediaId(
  to: string,
  mediaId: string,
  caption?: string,
): Promise<void> {
  await sendPayload({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: { id: mediaId, caption: caption?.slice(0, 1024) },
  })
}
