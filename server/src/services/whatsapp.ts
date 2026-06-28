import type { TenantContext } from '../types/tenant.js'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

async function sendPayload(
  tenant: TenantContext,
  payload: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${GRAPH_API}/${tenant.whatsappPhoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tenant.whatsappAccessToken}`,
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

export async function sendText(
  to: string,
  body: string,
  tenant: TenantContext,
): Promise<void> {
  await sendPayload(tenant, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  })
}

/** Numbered text list — avoids WhatsApp list row limits (24-char title / 72-char description). */
export async function sendTopicChoices(
  to: string,
  topics: { title: string; description: string }[],
  tenant: TenantContext,
): Promise<void> {
  const lines = topics.map(
    (t, i) => `*${i + 1}.* ${t.title}\n   _${t.description}_`,
  )

  const body = [
    '*Pick a topic* — reply with the number (1–5):',
    '',
    ...lines,
    '',
    '_Example: reply *2* to choose topic 2._',
  ].join('\n')

  await sendText(to, body, tenant)
}

export async function sendApprovalButtons(to: string, tenant: TenantContext): Promise<void> {
  await sendPayload(tenant, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'Review the PDF above, then choose an action:',
      },
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

export async function sendImage(
  to: string,
  imageUrl: string,
  tenant: TenantContext,
  caption?: string,
): Promise<void> {
  await sendPayload(tenant, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: { link: imageUrl, caption: caption },
  })
}

export async function uploadMedia(
  filePath: string,
  mimeType: string,
  tenant: TenantContext,
  fileName = 'file',
): Promise<string> {
  const { readFile } = await import('node:fs/promises')
  const data = await readFile(filePath)

  const formData = new FormData()
  formData.append('messaging_product', 'whatsapp')
  formData.append('type', mimeType)
  formData.append('file', new Blob([data], { type: mimeType }), fileName)

  const res = await fetch(`${GRAPH_API}/${tenant.whatsappPhoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenant.whatsappAccessToken}` },
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
  tenant: TenantContext,
  caption?: string,
): Promise<void> {
  await sendPayload(tenant, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: { id: mediaId, caption: caption },
  })
}

export async function sendDocument(
  to: string,
  documentUrl: string,
  fileName: string,
  tenant: TenantContext,
  caption?: string,
): Promise<void> {
  await sendPayload(tenant, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'document',
    document: { link: documentUrl, filename: fileName, caption },
  })
}

export async function sendDocumentByMediaId(
  to: string,
  mediaId: string,
  fileName: string,
  tenant: TenantContext,
  caption?: string,
): Promise<void> {
  await sendPayload(tenant, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'document',
    document: { id: mediaId, filename: fileName, caption },
  })
}
