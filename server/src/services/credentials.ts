import { Types } from 'mongoose'
import { UserCredentials, type IUserCredentials } from '../models/UserCredentials.js'
import type { CredentialsInput, TenantContext } from '../types/tenant.js'
import { decrypt, encrypt } from '../utils/crypto.js'

function decryptField(value?: string): string | undefined {
  if (!value) return undefined
  return decrypt(value)
}

function encryptField(value?: string): string | undefined {
  if (!value) return undefined
  return encrypt(value)
}

export function credentialsToTenantContext(
  userId: string,
  creds: IUserCredentials,
): TenantContext | null {
  const geminiApiKey = decryptField(creds.geminiApiKey)
  const whatsappAccessToken = decryptField(creds.whatsappAccessToken)
  const whatsappPhoneNumberId = creds.whatsappPhoneNumberId

  if (!geminiApiKey || !whatsappAccessToken || !whatsappPhoneNumberId) {
    return null
  }

  return {
    userId,
    geminiApiKey,
    whatsappAccessToken,
    whatsappPhoneNumberId,
    publicBaseUrl: creds.publicBaseUrl,
    postingDryRun: creds.postingDryRun,
    facebookPageId: creds.facebookPageId,
    facebookPageAccessToken: decryptField(creds.facebookPageAccessToken),
    instagramBusinessAccountId: creds.instagramBusinessAccountId,
    linkedinAccessToken: decryptField(creds.linkedinAccessToken),
    linkedinOrganizationUrn: creds.linkedinOrganizationUrn,
  }
}

export async function loadTenantContext(userId: string): Promise<TenantContext | null> {
  const creds = await UserCredentials.findOne({ userId: new Types.ObjectId(userId) })
  if (!creds) return null
  return credentialsToTenantContext(userId, creds)
}

export async function loadTenantByWhatsAppPhoneId(
  phoneNumberId: string,
): Promise<TenantContext | null> {
  const creds = await UserCredentials.findOne({ whatsappPhoneNumberId: phoneNumberId })
  if (!creds) return null
  return credentialsToTenantContext(creds.userId.toString(), creds)
}

export async function upsertUserCredentials(
  userId: string,
  input: CredentialsInput,
): Promise<IUserCredentials> {
  const encrypted: Partial<IUserCredentials> = {
    postingDryRun: input.postingDryRun ?? false,
    publicBaseUrl: input.publicBaseUrl,
    whatsappPhoneNumberId: input.whatsappPhoneNumberId,
    facebookPageId: input.facebookPageId,
    instagramBusinessAccountId: input.instagramBusinessAccountId,
    linkedinOrganizationUrn: input.linkedinOrganizationUrn,
  }

  if (input.geminiApiKey !== undefined) {
    encrypted.geminiApiKey = encryptField(input.geminiApiKey)
  }
  if (input.whatsappAccessToken !== undefined) {
    encrypted.whatsappAccessToken = encryptField(input.whatsappAccessToken)
  }
  if (input.whatsappVerifyToken !== undefined) {
    encrypted.whatsappVerifyToken = encryptField(input.whatsappVerifyToken)
  }
  if (input.facebookPageAccessToken !== undefined) {
    encrypted.facebookPageAccessToken = encryptField(input.facebookPageAccessToken)
  }
  if (input.linkedinAccessToken !== undefined) {
    encrypted.linkedinAccessToken = encryptField(input.linkedinAccessToken)
  }

  return UserCredentials.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $set: encrypted },
    { upsert: true, new: true },
  )
}

export function sanitizeCredentials(creds: IUserCredentials | null) {
  if (!creds) return null
  return {
    hasGeminiApiKey: Boolean(creds.geminiApiKey),
    hasWhatsappAccessToken: Boolean(creds.whatsappAccessToken),
    whatsappPhoneNumberId: creds.whatsappPhoneNumberId ?? '',
    hasWhatsappVerifyToken: Boolean(creds.whatsappVerifyToken),
    publicBaseUrl: creds.publicBaseUrl ?? '',
    postingDryRun: creds.postingDryRun,
    facebookPageId: creds.facebookPageId ?? '',
    hasFacebookPageAccessToken: Boolean(creds.facebookPageAccessToken),
    instagramBusinessAccountId: creds.instagramBusinessAccountId ?? '',
    hasLinkedinAccessToken: Boolean(creds.linkedinAccessToken),
    linkedinOrganizationUrn: creds.linkedinOrganizationUrn ?? '',
  }
}

export async function getWhatsAppVerifyToken(phoneNumberId: string): Promise<string | null> {
  const creds = await UserCredentials.findOne({ whatsappPhoneNumberId: phoneNumberId })
  if (!creds?.whatsappVerifyToken) return null
  return decrypt(creds.whatsappVerifyToken)
}
