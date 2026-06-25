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
import { generateImage, getImagePublicUrl } from '../services/gemini-image.js'
import { publishToPlatforms } from '../services/posting.js'
import {
  sendApprovalButtons,
  sendImage,
  sendImageByMediaId,
  sendText,
  sendTopicList,
  uploadMedia,
} from '../services/whatsapp.js'
import {
  isTriggerMessage,
  parsePlatformSelection,
  WorkflowState,
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

export async function handleIncomingMessage(msg: IncomingMessage): Promise<void> {
  const { waId } = msg

  try {
    let run = await findActiveRun(waId)

    if (run && isTriggerMessage(msg.text ?? '')) {
      await sendText(
        waId,
        'You already have an active content run. Reply *cancel* to start fresh, or continue where you left off.',
      )
      return
    }

    if (!run && isTriggerMessage(msg.text ?? '')) {
      run = await createRun(waId)
      await sendText(
        waId,
        'Great! What niche or theme should I generate content topics for?\n\nExample: "Fitness for busy moms" or "Sustainable fashion tips"',
      )
      return
    }

    if (!run) {
      await sendText(
        waId,
        'Hi! Send *"Hey, Generate content"* to start creating social media posts.',
      )
      return
    }

    if (msg.text?.toLowerCase().trim() === 'cancel') {
      run.state = WorkflowState.CANCELLED
      run.status = 'cancelled'
      await run.save()
      await sendText(waId, 'Cancelled. Send *"Hey, Generate content"* anytime to start again.')
      return
    }

    await processActiveRun(run, waId, msg)
  } catch (err) {
    console.error(`[Workflow] Error for ${waId}:`, err)
    const message =
      err instanceof Error && err.message.includes('131030')
        ? 'Your phone number is not on the Meta WhatsApp test recipient list. Add it in Meta Developer → WhatsApp → API Setup → add phone number, then try again.'
        : 'Something went wrong processing your message. Please try again or send *"Hey, Generate content"* to restart.'
    try {
      await sendText(waId, message)
    } catch (sendErr) {
      console.error(`[Workflow] Could not send error reply to ${waId}:`, sendErr)
    }
  }
}

async function processActiveRun(
  run: IWorkflowRun,
  waId: string,
  msg: IncomingMessage,
): Promise<void> {
  try {
    switch (run.state) {
      case WorkflowState.AWAITING_PROMPT:
        await handleSeedPrompt(run, msg.text ?? '')
        break
      case WorkflowState.AWAITING_TOPIC_SELECTION:
        await handleTopicSelection(run, msg.listReplyId)
        break
      case WorkflowState.AWAITING_CONTENT_APPROVAL:
        await handleContentApproval(run, waId, msg.buttonId)
        break
      case WorkflowState.AWAITING_EDIT_INSTRUCTION:
        await handleEditInstruction(run, waId, msg.text ?? '')
        break
      case WorkflowState.AWAITING_PLATFORM_SELECTION:
        await handlePlatformSelection(run, waId, msg.text ?? '')
        break
      default:
        await sendText(waId, 'Working on your request… please wait a moment.')
    }
  } catch (err) {
    console.error('Workflow error:', err)
    run.lastError = err instanceof Error ? err.message : 'Unknown error'
    run.status = 'failed'
    await run.save()
    await sendText(
      waId,
      `Something went wrong: ${run.lastError}. Send *"Hey, Generate content"* to try again.`,
    )
  }
}

async function handleSeedPrompt(run: IWorkflowRun, text: string): Promise<void> {
  if (!text.trim()) {
    await sendText(run.waId, 'Please send a niche or theme to continue.')
    return
  }

  run.seedPrompt = text.trim()
  run.state = WorkflowState.GENERATING_TOPICS
  await run.save()

  await sendText(run.waId, 'Generating topic ideas…')

  const topics = await generateTopics(run.seedPrompt)
  run.topics = topics
  run.state = WorkflowState.AWAITING_TOPIC_SELECTION
  await run.save()

  await sendTopicList(run.waId, topics)
}

async function handleTopicSelection(
  run: IWorkflowRun,
  listReplyId?: string,
): Promise<void> {
  if (!listReplyId) {
    await sendText(run.waId, 'Please pick a topic from the list above.')
    return
  }

  const topic = run.topics.find((t) => t.id === listReplyId)
  if (!topic) {
    await sendText(run.waId, 'Invalid selection. Please pick a topic from the list.')
    return
  }

  run.selectedTopic = topic
  run.state = WorkflowState.GENERATING_CONTENT
  await run.save()

  await sendText(run.waId, `Creating content for: *${topic.title}*…`)

  const draft = await generateDraft(run.seedPrompt!, topic)
  run.draft = draft

  const { filePath, fileName } = await generateImage(draft.imagePrompt)
  run.imagePath = fileName
  run.imageUrl = getImagePublicUrl(fileName)

  run.state = WorkflowState.AWAITING_CONTENT_APPROVAL
  await run.save()

  const preview = formatDraftPreview(draft)

  if (run.imageUrl) {
    await sendImage(run.waId, run.imageUrl, 'Generated image preview')
  } else {
    try {
      const mediaId = await uploadMedia(filePath, 'image/png')
      await sendImageByMediaId(run.waId, mediaId, 'Generated image preview')
    } catch {
      await sendText(run.waId, '(Image generated but could not be sent — set PUBLIC_BASE_URL for image links)')
    }
  }

  await sendApprovalButtons(run.waId, preview)
}

async function handleContentApproval(
  run: IWorkflowRun,
  waId: string,
  buttonId?: string,
): Promise<void> {
  if (buttonId === 'approve') {
    run.state = WorkflowState.AWAITING_PLATFORM_SELECTION
    await run.save()
    await sendText(waId, PLATFORM_PROMPT)
    return
  }

  if (buttonId === 'edit') {
    run.state = WorkflowState.AWAITING_EDIT_INSTRUCTION
    await run.save()
    await sendText(
      waId,
      'Reply with your edit instructions.\n\nExample: "Make it shorter" or "More professional tone for LinkedIn"',
    )
    return
  }

  if (buttonId === 'regenerate') {
    if (!run.selectedTopic || !run.seedPrompt) return
    run.state = WorkflowState.GENERATING_CONTENT
    await run.save()
    await sendText(waId, 'Regenerating content…')

    const draft = await generateDraft(run.seedPrompt, run.selectedTopic)
    run.draft = draft

    const { filePath, fileName } = await generateImage(draft.imagePrompt)
    run.imagePath = fileName
    run.imageUrl = getImagePublicUrl(fileName)
    run.state = WorkflowState.AWAITING_CONTENT_APPROVAL
    await run.save()

    const preview = formatDraftPreview(draft)
    if (run.imageUrl) {
      await sendImage(run.waId, run.imageUrl, 'Regenerated image')
    } else {
      try {
        const mediaId = await uploadMedia(filePath, 'image/png')
        await sendImageByMediaId(run.waId, mediaId, 'Regenerated image')
      } catch {
        /* image optional in preview */
      }
    }
    await sendApprovalButtons(waId, preview)
    return
  }

  await sendText(waId, 'Please tap Approve, Edit, or Regenerate using the buttons above.')
}

async function handleEditInstruction(
  run: IWorkflowRun,
  waId: string,
  instruction: string,
): Promise<void> {
  if (!instruction.trim() || !run.draft) {
    await sendText(waId, 'Please send your edit instructions as a text message.')
    return
  }

  await sendText(waId, 'Applying your edits…')

  run.draft = await reviseDraft(run.draft, instruction.trim())
  run.state = WorkflowState.AWAITING_CONTENT_APPROVAL
  await run.save()

  const preview = formatDraftPreview(run.draft)
  await sendApprovalButtons(waId, preview)
}

async function handlePlatformSelection(
  run: IWorkflowRun,
  waId: string,
  text: string,
): Promise<void> {
  const platforms = parsePlatformSelection(text)

  if (platforms.length === 0) {
    await sendText(waId, PLATFORM_PROMPT)
    return
  }

  run.selectedPlatforms = platforms
  run.state = WorkflowState.POSTING
  await run.save()

  await sendText(waId, `Posting to: ${platforms.join(', ')}…`)

  const results = await publishToPlatforms(run, platforms)
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
  )
}
