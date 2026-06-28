import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IUserCredentials extends Document {
  userId: Types.ObjectId
  geminiApiKey?: string
  whatsappAccessToken?: string
  whatsappPhoneNumberId?: string
  whatsappVerifyToken?: string
  publicBaseUrl?: string
  postingDryRun: boolean
  facebookPageId?: string
  facebookPageAccessToken?: string
  instagramBusinessAccountId?: string
  linkedinAccessToken?: string
  linkedinOrganizationUrn?: string
  createdAt: Date
  updatedAt: Date
}

const userCredentialsSchema = new Schema<IUserCredentials>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    geminiApiKey: String,
    whatsappAccessToken: String,
    whatsappPhoneNumberId: String,
    whatsappVerifyToken: String,
    publicBaseUrl: String,
    postingDryRun: { type: Boolean, default: false },
    facebookPageId: String,
    facebookPageAccessToken: String,
    instagramBusinessAccountId: String,
    linkedinAccessToken: String,
    linkedinOrganizationUrn: String,
  },
  { timestamps: true },
)

userCredentialsSchema.index({ whatsappPhoneNumberId: 1 })

export const UserCredentials: Model<IUserCredentials> =
  mongoose.models.UserCredentials ??
  mongoose.model<IUserCredentials>('UserCredentials', userCredentialsSchema)
