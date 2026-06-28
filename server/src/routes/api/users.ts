import { Router } from 'express'
import { Types } from 'mongoose'
import { AllowedWhatsAppNumber } from '../../models/AllowedWhatsAppNumber.js'
import { UserCredentials } from '../../models/UserCredentials.js'
import {
  loadTenantContext,
  sanitizeCredentials,
  upsertUserCredentials,
} from '../../services/credentials.js'
import { sendText } from '../../services/whatsapp.js'
import type { CredentialsInput } from '../../types/tenant.js'
import { generateOtp, hashOtp, normalizePhone, verifyOtp } from '../../utils/crypto.js'
import {
  requireActiveUser,
  requireAuth,
  type AuthRequest,
} from '../../middleware/auth.js'

export const usersRouter = Router()

usersRouter.use(requireAuth, requireActiveUser)

usersRouter.get('/credentials', async (req: AuthRequest, res) => {
  const creds = await UserCredentials.findOne({ userId: req.user!._id })
  res.json({ credentials: sanitizeCredentials(creds) })
})

usersRouter.put('/credentials', async (req: AuthRequest, res) => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can update credentials directly' })
    return
  }

  await upsertUserCredentials(req.user!._id.toString(), req.body as CredentialsInput)
  const creds = await UserCredentials.findOne({ userId: req.user!._id })
  res.json({ credentials: sanitizeCredentials(creds) })
})

usersRouter.get('/whatsapp-numbers', async (req: AuthRequest, res) => {
  const numbers = await AllowedWhatsAppNumber.find({ userId: req.user!._id }).sort({
    createdAt: -1,
  })
  res.json(
    numbers.map((n) => ({
      id: n._id.toString(),
      phone: n.phone,
      verified: n.verified,
    })),
  )
})

usersRouter.post('/whatsapp-numbers/request-otp', async (req: AuthRequest, res) => {
  const { phone } = req.body as { phone?: string }
  if (!phone) {
    res.status(400).json({ error: 'Phone number is required' })
    return
  }

  const normalized = normalizePhone(phone)
  if (normalized.length < 10) {
    res.status(400).json({ error: 'Enter a valid phone number with country code' })
    return
  }

  const tenant = await loadTenantContext(req.user!._id.toString())
  if (!tenant) {
    res.status(400).json({
      error: 'WhatsApp credentials not configured. Contact admin to set up your account.',
    })
    return
  }

  const otp = generateOtp()
  let record = await AllowedWhatsAppNumber.findOne({
    userId: req.user!._id,
    phone: normalized,
  })

  if (record?.verified) {
    res.status(409).json({ error: 'This number is already verified' })
    return
  }

  if (!record) {
    record = await AllowedWhatsAppNumber.create({
      userId: req.user!._id,
      phone: normalized,
      verified: false,
    })
  }

  record.otpHash = hashOtp(otp)
  record.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await record.save()

  try {
    await sendText(
      normalized,
      `Your SocialPostAgent verification code is: *${otp}*\n\nThis code expires in 10 minutes.`,
      tenant,
    )
    res.json({ message: 'OTP sent to WhatsApp', phone: normalized })
  } catch (err) {
    console.error('WhatsApp OTP send failed:', err)
    res.status(500).json({ error: 'Failed to send OTP via WhatsApp. Check your credentials.' })
  }
})

usersRouter.post('/whatsapp-numbers/verify-otp', async (req: AuthRequest, res) => {
  const { phone, otp } = req.body as { phone?: string; otp?: string }
  if (!phone || !otp) {
    res.status(400).json({ error: 'Phone and OTP are required' })
    return
  }

  const normalized = normalizePhone(phone)
  const record = await AllowedWhatsAppNumber.findOne({
    userId: req.user!._id,
    phone: normalized,
  })

  if (!record) {
    res.status(404).json({ error: 'No pending verification for this number' })
    return
  }

  if (record.verified) {
    res.json({ message: 'Number already verified', phone: normalized })
    return
  }

  if (!record.otpHash || !record.otpExpiresAt || record.otpExpiresAt < new Date()) {
    res.status(400).json({ error: 'OTP expired. Request a new code.' })
    return
  }

  if (!verifyOtp(otp, record.otpHash)) {
    res.status(400).json({ error: 'Invalid OTP' })
    return
  }

  record.verified = true
  record.otpHash = undefined
  record.otpExpiresAt = undefined
  await record.save()

  res.json({ message: 'WhatsApp number verified', phone: normalized })
})

usersRouter.delete('/whatsapp-numbers/:id', async (req: AuthRequest, res) => {
  const record = await AllowedWhatsAppNumber.findOne({
    _id: req.params.id,
    userId: req.user!._id,
  })

  if (!record) {
    res.status(404).json({ error: 'Number not found' })
    return
  }

  await record.deleteOne()
  res.json({ message: 'Number removed' })
})
