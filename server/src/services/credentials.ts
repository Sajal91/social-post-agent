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
  const encrypted: Partial<IUserCredentials> = {}

  if (input.postingDryRun !== undefined) {
    encrypted.postingDryRun = input.postingDryRun
  }
  if (input.publicBaseUrl !== undefined) {
    encrypted.publicBaseUrl = input.publicBaseUrl
  }
  if (input.whatsappPhoneNumberId !== undefined) {
    encrypted.whatsappPhoneNumberId = input.whatsappPhoneNumberId
  }
  if (input.facebookPageId !== undefined) {
    encrypted.facebookPageId = input.facebookPageId
  }
  if (input.instagramBusinessAccountId !== undefined) {
    encrypted.instagramBusinessAccountId = input.instagramBusinessAccountId
  }
  if (input.linkedinOrganizationUrn !== undefined) {
    encrypted.linkedinOrganizationUrn = input.linkedinOrganizationUrn
  }

  if (input.geminiApiKey !== undefined && input.geminiApiKey !== '') {
    encrypted.geminiApiKey = encryptField(input.geminiApiKey)
  }
  if (input.whatsappAccessToken !== undefined && input.whatsappAccessToken !== '') {
    encrypted.whatsappAccessToken = encryptField(input.whatsappAccessToken)
  }
  if (input.whatsappVerifyToken !== undefined && input.whatsappVerifyToken !== '') {
    encrypted.whatsappVerifyToken = encryptField(input.whatsappVerifyToken)
  }
  if (input.facebookPageAccessToken !== undefined && input.facebookPageAccessToken !== '') {
    encrypted.facebookPageAccessToken = encryptField(input.facebookPageAccessToken)
  }
  if (input.linkedinAccessToken !== undefined && input.linkedinAccessToken !== '') {
    encrypted.linkedinAccessToken = encryptField(input.linkedinAccessToken)
  }

  if (Object.keys(encrypted).length === 0) {
    const existing = await UserCredentials.findOne({ userId: new Types.ObjectId(userId) })
    if (!existing) {
      throw new Error('No credential fields to update')
    }
    return existing
  }

  return UserCredentials.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $set: encrypted },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

export function credentialsToAdminForm(creds: IUserCredentials | null): CredentialsInput | null {
  if (!creds) return null
  return {
    geminiApiKey: decryptField(creds.geminiApiKey) ?? '',
    whatsappAccessToken: decryptField(creds.whatsappAccessToken) ?? '',
    whatsappPhoneNumberId: creds.whatsappPhoneNumberId ?? '',
    whatsappVerifyToken: decryptField(creds.whatsappVerifyToken) ?? '',
    publicBaseUrl: creds.publicBaseUrl ?? '',
    postingDryRun: creds.postingDryRun,
    facebookPageId: creds.facebookPageId ?? '',
    facebookPageAccessToken: decryptField(creds.facebookPageAccessToken) ?? '',
    instagramBusinessAccountId: creds.instagramBusinessAccountId ?? '',
    linkedinAccessToken: decryptField(creds.linkedinAccessToken) ?? '',
    linkedinOrganizationUrn: creds.linkedinOrganizationUrn ?? '',
  }
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
