export interface TenantContext {
  userId: string
  geminiApiKey: string
  whatsappAccessToken: string
  whatsappPhoneNumberId: string
  publicBaseUrl?: string
  postingDryRun: boolean
  facebookPageId?: string
  facebookPageAccessToken?: string
  instagramBusinessAccountId?: string
  linkedinAccessToken?: string
  linkedinOrganizationUrn?: string
}

export interface CredentialsInput {
  geminiApiKey?: string
  whatsappAccessToken?: string
  whatsappPhoneNumberId?: string
  whatsappVerifyToken?: string
  publicBaseUrl?: string
  postingDryRun?: boolean
  facebookPageId?: string
  facebookPageAccessToken?: string
  instagramBusinessAccountId?: string
  linkedinAccessToken?: string
  linkedinOrganizationUrn?: string
}
