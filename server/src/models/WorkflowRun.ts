import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'
import {
  WorkflowState,
  type Platform,
  type PlatformDraft,
  type PostResult,
  type TopicOption,
} from '../workflow/states.js'

export interface IWorkflowRun extends Document {
  userId: Types.ObjectId
  waId: string
  state: WorkflowState
  status: 'active' | 'completed' | 'cancelled' | 'failed'
  seedPrompt?: string
  topics: TopicOption[]
  selectedTopic?: TopicOption
  draft?: PlatformDraft
  imagePath?: string
  imageUrl?: string
  selectedPlatforms: Platform[]
  postResults: PostResult[]
  lastError?: string
  createdAt: Date
  updatedAt: Date
}

const topicSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
)

const draftSchema = new Schema(
  {
    facebook: { type: String, required: true },
    instagram: { type: String, required: true },
    linkedin: { type: String, required: true },
    imagePrompt: { type: String, required: true },
  },
  { _id: false },
)

const postResultSchema = new Schema(
  {
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'linkedin'],
      required: true,
    },
    success: { type: Boolean, required: true },
    postId: String,
    error: String,
  },
  { _id: false },
)

const workflowRunSchema = new Schema<IWorkflowRun>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    waId: { type: String, required: true, index: true },
    state: {
      type: String,
      enum: Object.values(WorkflowState),
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'failed'],
      default: 'active',
    },
    seedPrompt: String,
    topics: { type: [topicSchema], default: [] },
    selectedTopic: topicSchema,
    draft: draftSchema,
    imagePath: String,
    imageUrl: String,
    selectedPlatforms: {
      type: [String],
      enum: ['facebook', 'instagram', 'linkedin'],
      default: [],
    },
    postResults: { type: [postResultSchema], default: [] },
    lastError: String,
  },
  { timestamps: true },
)

workflowRunSchema.index({ userId: 1, waId: 1, status: 1 })
workflowRunSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })

export const WorkflowRun: Model<IWorkflowRun> =
  mongoose.models.WorkflowRun ??
  mongoose.model<IWorkflowRun>('WorkflowRun', workflowRunSchema)

export async function findActiveRun(
  userId: string,
  waId: string,
): Promise<IWorkflowRun | null> {
  return WorkflowRun.findOne({ userId, waId, status: 'active' }).sort({ updatedAt: -1 })
}

export async function createRun(userId: string, waId: string): Promise<IWorkflowRun> {
  return WorkflowRun.create({
    userId,
    waId,
    state: WorkflowState.AWAITING_PROMPT,
    status: 'active',
  })
}
