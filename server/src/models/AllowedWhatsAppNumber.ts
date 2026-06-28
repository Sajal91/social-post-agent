import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export interface IAllowedWhatsAppNumber extends Document {
  userId: Types.ObjectId
  phone: string
  verified: boolean
  otpHash?: string
  otpExpiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const allowedWhatsAppNumberSchema = new Schema<IAllowedWhatsAppNumber>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phone: { type: String, required: true },
    verified: { type: Boolean, default: false },
    otpHash: String,
    otpExpiresAt: Date,
  },
  { timestamps: true },
)

allowedWhatsAppNumberSchema.index({ userId: 1, phone: 1 }, { unique: true })
allowedWhatsAppNumberSchema.index({ phone: 1, verified: 1 })

export const AllowedWhatsAppNumber: Model<IAllowedWhatsAppNumber> =
  mongoose.models.AllowedWhatsAppNumber ??
  mongoose.model<IAllowedWhatsAppNumber>('AllowedWhatsAppNumber', allowedWhatsAppNumberSchema)
