import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { env } from '../config/env.js'

export async function seedAdminUser(): Promise<void> {
  const existingAdmin = await User.findOne({ role: 'admin' })
  if (existingAdmin) return

  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.warn(
      'No admin user found. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create the initial admin.',
    )
    return
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12)
  await User.create({
    email: env.ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    name: env.ADMIN_NAME,
    role: 'admin',
    status: 'active',
    emailVerified: true,
  })

  console.log(`Initial admin user created: ${env.ADMIN_EMAIL}`)
}
