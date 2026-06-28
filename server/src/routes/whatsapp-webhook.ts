import { Router, type Request, type Response } from 'express'
import { handleIncomingMessage } from '../workflow/engine.js'
import { loadTenantByWhatsAppPhoneId } from '../services/credentials.js'
import { isWhatsAppNumberAllowed } from '../services/allowlist.js'
import { sendText } from '../services/whatsapp.js'
import { User } from '../models/User.js'
import { UserCredentials } from '../models/UserCredentials.js'
import { decrypt } from '../utils/crypto.js'

export const whatsappWebhookRouter = Router()

interface WhatsAppWebhookBody {
  object?: string
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string
        }
        messages?: Array<{
          from: string
          type: string
          text?: { body: string }
          interactive?: {
            type: string
            button_reply?: { id: string }
            list_reply?: { id: string }
          }
        }>
      }
    }>
  }>
}

whatsappWebhookRouter.get('/', async (req: Request, res: Response) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode !== 'subscribe' || typeof token !== 'string') {
    res.sendStatus(403)
    return
  }

  const allCreds = await UserCredentials.find({ whatsappVerifyToken: { $exists: true } })
  const matched = allCreds.some((c) => {
    if (!c.whatsappVerifyToken) return false
    try {
      return decrypt(c.whatsappVerifyToken) === token
    } catch {
      return false
    }
  })

  if (matched) {
    res.status(200).send(challenge)
    return
  }

  res.sendStatus(403)
})

whatsappWebhookRouter.post('/', async (req: Request, res: Response) => {
  res.sendStatus(200)

  try {
    const body = req.body as WhatsAppWebhookBody
    console.log('[WhatsApp webhook] Received:', JSON.stringify(body, null, 2))

    if (body.object !== 'whatsapp_business_account') {
      console.log('[WhatsApp webhook] Ignored: not a whatsapp_business_account event')
      return
    }

    const value = body.entry?.[0]?.changes?.[0]?.value
    const phoneNumberId = value?.metadata?.phone_number_id
    const messages = value?.messages

    if (!messages?.length) {
      console.log('[WhatsApp webhook] No messages in payload (may be a status update)')
      return
    }

    if (!phoneNumberId) {
      console.log('[WhatsApp webhook] Missing phone_number_id in metadata')
      return
    }

    const tenant = await loadTenantByWhatsAppPhoneId(phoneNumberId)
    if (!tenant) {
      console.log(`[WhatsApp webhook] No tenant for phone_number_id ${phoneNumberId}`)
      return
    }

    const user = await User.findById(tenant.userId)
    if (!user || user.status !== 'active') {
      console.log(`[WhatsApp webhook] User ${tenant.userId} is not active`)
      return
    }

    for (const message of messages) {
      const waId = message.from
      console.log(`[WhatsApp webhook] Processing message from ${waId}, type=${message.type}`)

      const allowed = await isWhatsAppNumberAllowed(tenant.userId, waId)
      if (!allowed) {
        try {
          await sendText(
            waId,
            'This number is not authorized. Add and verify it in your SocialPostAgent dashboard under WhatsApp numbers.',
            tenant,
          )
        } catch (err) {
          console.error('[WhatsApp webhook] Could not send allowlist rejection:', err)
        }
        continue
      }

      if (message.type === 'text' && message.text?.body) {
        await handleIncomingMessage({ waId, text: message.text.body }, tenant)
      } else if (message.type === 'interactive' && message.interactive) {
        const interactive = message.interactive
        if (interactive.type === 'button_reply' && interactive.button_reply) {
          await handleIncomingMessage(
            { waId, buttonId: interactive.button_reply.id },
            tenant,
          )
        } else if (interactive.type === 'list_reply' && interactive.list_reply) {
          await handleIncomingMessage(
            { waId, listReplyId: interactive.list_reply.id },
            tenant,
          )
        }
      } else {
        console.log(`[WhatsApp webhook] Unhandled message type: ${message.type}`)
      }
    }
  } catch (err) {
    console.error('[WhatsApp webhook] Processing error:', err)
  }
})
