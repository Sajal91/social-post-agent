import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  return scryptSync(env.ENCRYPTION_KEY, 'socialpostagent-salt', 32)
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return ''
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ''
  const data = Buffer.from(ciphertext, 'base64')
  const iv = data.subarray(0, IV_LENGTH)
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function hashOtp(otp: string): string {
  return scryptSync(otp, env.JWT_SECRET, 32).toString('hex')
}

export function verifyOtp(otp: string, hash: string): boolean {
  const candidate = hashOtp(otp)
  if (candidate.length !== hash.length) return false
  let mismatch = 0
  for (let i = 0; i < candidate.length; i++) {
    mismatch |= candidate.charCodeAt(i) ^ hash.charCodeAt(i)
  }
  return mismatch === 0
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
