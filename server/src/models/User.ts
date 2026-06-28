import mongoose, { Schema, type Document, type Model } from 'mongoose'

export type UserRole = 'admin' | 'user'
export type UserStatus = 'pending' | 'active' | 'rejected'

export interface IUser extends Document {
  email: string
  passwordHash: string
  name: string
  role: UserRole
  status: UserStatus
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
    emailVerified: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', userSchema)
