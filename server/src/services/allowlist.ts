import { Types } from 'mongoose'
import { AllowedWhatsAppNumber } from '../models/AllowedWhatsAppNumber.js'
import { normalizePhone } from '../utils/crypto.js'

export async function isWhatsAppNumberAllowed(userId: string, waId: string): Promise<boolean> {
  const phone = normalizePhone(waId)
  const count = await AllowedWhatsAppNumber.countDocuments({
    userId: new Types.ObjectId(userId),
    phone,
    verified: true,
  })
  return count > 0
}
