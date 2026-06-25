import { Router, type Request, type Response } from 'express'
import { handleIncomingMessage } from '../workflow/engine.js'

export const whatsappWebhookRouter = Router()

interface WhatsAppWebhookBody {
  object?: string
  entry?: Array<{
    changes?: Array<{
      value?: {
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

whatsappWebhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
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
    const messages = value?.messages
    if (!messages?.length) {
      console.log('[WhatsApp webhook] No messages in payload (may be a status update)')
      return
    }

    for (const message of messages) {
      const waId = message.from
      console.log(`[WhatsApp webhook] Processing message from ${waId}, type=${message.type}`)

      if (message.type === 'text' && message.text?.body) {
        await handleIncomingMessage({ waId, text: message.text.body })
      } else if (message.type === 'interactive' && message.interactive) {
        const interactive = message.interactive
        if (interactive.type === 'button_reply' && interactive.button_reply) {
          await handleIncomingMessage({
            waId,
            buttonId: interactive.button_reply.id,
          })
        } else if (interactive.type === 'list_reply' && interactive.list_reply) {
          await handleIncomingMessage({
            waId,
            listReplyId: interactive.list_reply.id,
          })
        }
      } else {
        console.log(`[WhatsApp webhook] Unhandled message type: ${message.type}`)
      }
    }
  } catch (err) {
    console.error('[WhatsApp webhook] Processing error:', err)
  }
})
