import {
  createRun,
  findActiveRun,
  type IWorkflowRun,
} from '../models/WorkflowRun.js'
import {
  formatDraftPreview,
  generateDraft,
  generateTopics,
  reviseDraft,
} from '../services/gemini-content.js'
import { generateDraftPdf, getDraftPdfPublicUrl } from '../services/draft-pdf.js'
import { generateImage, getImagePublicUrl, mimeFromPath, ensureImageReadable } from '../services/gemini-image.js'
import { publishToPlatforms } from '../services/posting.js'
import {
  sendApprovalButtons,
  sendDocument,
  sendDocumentByMediaId,
  sendImage,
  sendImageByMediaId,
  sendText,
  sendTopicChoices,
  uploadMedia,
} from '../services/whatsapp.js'
import type { TenantContext } from '../types/tenant.js'
import {
  isTriggerMessage,
  parsePlatformSelection,
  parseTopicSelection,
  WorkflowState,
  type PlatformDraft,
  type TopicOption,
} from './states.js'

export interface IncomingMessage {
  waId: string
  text?: string
  buttonId?: string
  listReplyId?: string
}

const PLATFORM_PROMPT = `Which platforms should I post to?

Reply with:
• *all* — post everywhere
• *1,2* — Facebook + Instagram
• *1* — Facebook only
• *2* — Instagram only
• *3* — LinkedIn only

1 = Facebook | 2 = Instagram | 3 = LinkedIn`

export async function handleIncomingMessage(
  msg: IncomingMessage,
  tenant: TenantContext,
): Promise<void> {
  const { waId } = msg

  try {
    let run = await findActiveRun(tenant.userId, waId)

    if (run && isTriggerMessage(msg.text ?? '')) {
      await sendText(
        waId,
        'You already have an active content run. Reply *cancel* to start fresh, or continue where you left off.',
        tenant,
      )
      return
    }

    if (!run && isTriggerMessage(msg.text ?? '')) {
      run = await createRun(tenant.userId, waId)
      await sendText(
        waId,
        'Great! What niche or theme should I generate content topics for?\n\nExample: "Fitness for busy moms" or "Sustainable fashion tips"',
        tenant,
      )
      return
    }

    if (!run) {
      await sendText(
        waId,
        'Hi! Send *"Hey, Generate content"* to start creating social media posts.',
        tenant,
      )
      return
    }

    if (msg.text?.toLowerCase().trim() === 'cancel') {
      run.state = WorkflowState.CANCELLED
      run.status = 'cancelled'
      await run.save()
      await sendText(
        waId,
        'Cancelled. Send *"Hey, Generate content"* anytime to start again.',
        tenant,
      )
      return
    }

    await processActiveRun(run, waId, msg, tenant)
  } catch (err) {
    console.error(`[Workflow] Error for ${waId}:`, err)
    const message =
      err instanceof Error && err.message.includes('131030')
        ? 'Your phone number is not on the Meta WhatsApp test recipient list. Add it in Meta Developer → WhatsApp → API Setup → add phone number, then try again.'
        : 'Something went wrong processing your message. Please try again or send *"Hey, Generate content"* to restart.'
    try {
      await sendText(waId, message, tenant)
    } catch (sendErr) {
      console.error(`[Workflow] Could not send error reply to ${waId}:`, sendErr)
    }
  }
}

async function processActiveRun(
  run: IWorkflowRun,
  waId: string,
  msg: IncomingMessage,
  tenant: TenantContext,
): Promise<void> {
  try {
    switch (run.state) {
      case WorkflowState.AWAITING_PROMPT:
        await handleSeedPrompt(run, msg.text ?? '', tenant)
        break
      case WorkflowState.AWAITING_TOPIC_SELECTION:
        await handleTopicSelection(run, msg.text, msg.listReplyId, tenant)
        break
      case WorkflowState.AWAITING_CONTENT_APPROVAL:
        await handleContentApproval(run, waId, msg.buttonId, tenant)
        break
      case WorkflowState.AWAITING_EDIT_INSTRUCTION:
        await handleEditInstruction(run, waId, msg.text ?? '', tenant)
        break
      case WorkflowState.AWAITING_PLATFORM_SELECTION:
        await handlePlatformSelection(run, waId, msg.text ?? '', tenant)
        break
      default:
        await sendText(waId, 'Working on your request… please wait a moment.', tenant)
    }
  } catch (err) {
    console.error('Workflow error:', err)
    run.lastError = err instanceof Error ? err.message : 'Unknown error'
    run.status = 'failed'
    await run.save()
    await sendText(
      waId,
      `Something went wrong: ${run.lastError}. Send *"Hey, Generate content"* to try again.`,
      tenant,
    )
  }
}

async function handleSeedPrompt(
  run: IWorkflowRun,
  text: string,
  tenant: TenantContext,
): Promise<void> {
  if (!text.trim()) {
    await sendText(run.waId, 'Please send a niche or theme to continue.', tenant)
    return
  }

  run.seedPrompt = text.trim()
  run.state = WorkflowState.GENERATING_TOPICS
  await run.save()

  await sendText(run.waId, 'Generating topic ideas…', tenant)

  const topics = await generateTopics(run.seedPrompt, tenant)
  run.topics = topics
  run.state = WorkflowState.AWAITING_TOPIC_SELECTION
  await run.save()

  await sendTopicChoices(run.waId, topics, tenant)
}

function resolveSelectedTopic(
  run: IWorkflowRun,
  text?: string,
  listReplyId?: string,
): TopicOption | null {
  if (text) {
    const index = parseTopicSelection(text, run.topics.length)
    if (index !== null) {
      return run.topics[index - 1] ?? null
    }
  }

  if (listReplyId) {
    return run.topics.find((t) => t.id === listReplyId) ?? null
  }

  return null
}

async function sendDraftPreviewMessage(
  waId: string,
  draft: PlatformDraft,
  tenant: TenantContext,
  meta: { topicTitle?: string; seedPrompt?: string },
  image?: { filePath: string; caption: string; publicUrl?: string },
): Promise<void> {
  const { filePath: pdfPath, fileName: pdfFileName } = await generateDraftPdf(draft, tenant, meta)
  const pdfUrl = getDraftPdfPublicUrl(pdfFileName, tenant)

  if (pdfUrl) {
    await sendDocument(waId, pdfUrl, 'content-preview.pdf', tenant, 'Your content preview (PDF)')
  } else {
    try {
      const mediaId = await uploadMedia(pdfPath, 'application/pdf', tenant, 'content-preview.pdf')
      await sendDocumentByMediaId(
        waId,
        mediaId,
        'content-preview.pdf',
        tenant,
        'Your content preview (PDF)',
      )
    } catch {
      await sendText(
        waId,
        'Could not send PDF preview — set PUBLIC_BASE_URL so WhatsApp can fetch the document.',
        tenant,
      )
      await sendText(waId, formatDraftPreview(draft), tenant)
    }
  }

  if (image) {
    try {
      await ensureImageReadable(image.filePath)
      const mime = mimeFromPath(image.filePath)
      const mediaId = await uploadMedia(image.filePath, mime, tenant, 'preview.jpeg')
      await sendImageByMediaId(waId, mediaId, tenant, image.caption)
    } catch (uploadErr) {
      console.error('[Workflow] WhatsApp image upload failed:', uploadErr)
      if (image.publicUrl) {
        try {
          await sendImage(waId, image.publicUrl, tenant, image.caption)
        } catch (linkErr) {
          console.error('[Workflow] WhatsApp image link send failed:', linkErr)
          await sendText(
            waId,
            '(Image was generated but could not be sent to WhatsApp. Check server logs and PUBLIC_BASE_URL.)',
            tenant,
          )
        }
      } else {
        await sendText(
          waId,
          '(Image was generated but could not be sent to WhatsApp. Check server logs.)',
          tenant,
        )
      }
    }
  }

  await sendApprovalButtons(waId, tenant)
}

async function handleTopicSelection(
  run: IWorkflowRun,
  text: string | undefined,
  listReplyId: string | undefined,
  tenant: TenantContext,
): Promise<void> {
  const topic = resolveSelectedTopic(run, text, listReplyId)
  if (!topic) {
    await sendText(
      run.waId,
      'Please reply with a number from the list above (e.g. *1*, *2*, *3*).',
      tenant,
    )
    return
  }

  run.selectedTopic = topic
  run.state = WorkflowState.GENERATING_CONTENT
  await run.save()

  await sendText(run.waId, `Creating content for: *${topic.title}*…`, tenant)

  const draft = await generateDraft(run.seedPrompt!, topic, tenant)
  run.draft = draft

  const { filePath, fileName } = await generateImage(draft.imagePrompt, tenant)
  run.imagePath = fileName
  run.imageUrl = getImagePublicUrl(fileName, tenant)

  run.state = WorkflowState.AWAITING_CONTENT_APPROVAL
  await run.save()

  await sendDraftPreviewMessage(
    run.waId,
    draft,
    tenant,
    { topicTitle: topic.title, seedPrompt: run.seedPrompt },
    { filePath, caption: 'Generated image preview', publicUrl: run.imageUrl },
  )
}

async function handleContentApproval(
  run: IWorkflowRun,
  waId: string,
  buttonId: string | undefined,
  tenant: TenantContext,
): Promise<void> {
  if (buttonId === 'approve') {
    run.state = WorkflowState.AWAITING_PLATFORM_SELECTION
    await run.save()
    await sendText(waId, PLATFORM_PROMPT, tenant)
    return
  }

  if (buttonId === 'edit') {
    run.state = WorkflowState.AWAITING_EDIT_INSTRUCTION
    await run.save()
    await sendText(
      waId,
      'Reply with your edit instructions.\n\nExample: "Make it shorter" or "More professional tone for LinkedIn"',
      tenant,
    )
    return
  }

  if (buttonId === 'regenerate') {
    if (!run.selectedTopic || !run.seedPrompt) return
    run.state = WorkflowState.GENERATING_CONTENT
    await run.save()
    await sendText(waId, 'Regenerating content…', tenant)

    const draft = await generateDraft(run.seedPrompt, run.selectedTopic, tenant)
    run.draft = draft

    const { filePath, fileName } = await generateImage(draft.imagePrompt, tenant)
    run.imagePath = fileName
    run.imageUrl = getImagePublicUrl(fileName, tenant)
    run.state = WorkflowState.AWAITING_CONTENT_APPROVAL
    await run.save()

    await sendDraftPreviewMessage(
      waId,
      draft,
      tenant,
      { topicTitle: run.selectedTopic.title, seedPrompt: run.seedPrompt },
      { filePath, caption: 'Regenerated image', publicUrl: run.imageUrl },
    )
    return
  }

  await sendText(waId, 'Please tap Approve, Edit, or Regenerate using the buttons above.', tenant)
}

async function handleEditInstruction(
  run: IWorkflowRun,
  waId: string,
  instruction: string,
  tenant: TenantContext,
): Promise<void> {
  if (!instruction.trim() || !run.draft) {
    await sendText(waId, 'Please send your edit instructions as a text message.', tenant)
    return
  }

  await sendText(waId, 'Applying your edits…', tenant)

  run.draft = await reviseDraft(run.draft, instruction.trim(), tenant)
  run.state = WorkflowState.AWAITING_CONTENT_APPROVAL
  await run.save()

  await sendDraftPreviewMessage(waId, run.draft, tenant, {
    topicTitle: run.selectedTopic?.title,
    seedPrompt: run.seedPrompt,
  })
}

async function handlePlatformSelection(
  run: IWorkflowRun,
  waId: string,
  text: string,
  tenant: TenantContext,
): Promise<void> {
  const platforms = parsePlatformSelection(text)

  if (platforms.length === 0) {
    await sendText(waId, PLATFORM_PROMPT, tenant)
    return
  }

  run.selectedPlatforms = platforms
  run.state = WorkflowState.POSTING
  await run.save()

  await sendText(waId, `Posting to: ${platforms.join(', ')}…`, tenant)

  const results = await publishToPlatforms(run, platforms, tenant)
  run.postResults = results
  run.state = WorkflowState.COMPLETED
  run.status = results.every((r) => r.success) ? 'completed' : 'failed'
  await run.save()

  const summary = results
    .map((r) => {
      const icon = r.success ? '✅' : '❌'
      const detail = r.success ? `Posted (${r.postId})` : r.error
      return `${icon} *${r.platform}*: ${detail}`
    })
    .join('\n')

  await sendText(
    waId,
    `*Done!*\n\n${summary}\n\nSend *"Hey, Generate content"* to create another post.`,
    tenant,
  )
}
