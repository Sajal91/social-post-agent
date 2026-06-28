import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { UserRole, UserStatus } from '../models/User.js'

export interface AuthTokenPayload {
  userId: string
  email: string
  role: UserRole
  status: UserStatus
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload
}
