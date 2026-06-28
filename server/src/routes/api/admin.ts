import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import { User } from '../../models/User.js'
import { WorkflowRun } from '../../models/WorkflowRun.js'
import { AllowedWhatsAppNumber } from '../../models/AllowedWhatsAppNumber.js'
import {
  credentialsToAdminForm,
  sanitizeCredentials,
  upsertUserCredentials,
} from '../../services/credentials.js'
import { UserCredentials } from '../../models/UserCredentials.js'
import type { CredentialsInput } from '../../types/tenant.js'
import {
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from '../../middleware/auth.js'

export const adminRouter = Router()

adminRouter.use(requireAuth, requireAdmin)

adminRouter.get('/users', async (_req, res) => {
  const users = await User.find({ role: 'user' }).sort({ createdAt: -1 }).lean()
  res.json(
    users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      status: u.status,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
    })),
  )
})

adminRouter.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id).lean()
  if (!user || user.role !== 'user') {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const creds = await UserCredentials.findOne({ userId: user._id })
  const allowedNumbers = await AllowedWhatsAppNumber.find({
    userId: user._id,
    verified: true,
  }).lean()

  const runs = await WorkflowRun.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  const stats = {
    totalRuns: await WorkflowRun.countDocuments({ userId: user._id }),
    activeRuns: await WorkflowRun.countDocuments({ userId: user._id, status: 'active' }),
    completedRuns: await WorkflowRun.countDocuments({ userId: user._id, status: 'completed' }),
    failedRuns: await WorkflowRun.countDocuments({ userId: user._id, status: 'failed' }),
    allowedNumbers: allowedNumbers.length,
  }

  res.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
    credentials: sanitizeCredentials(creds),
    credentialsForm: credentialsToAdminForm(creds),
    allowedNumbers: allowedNumbers.map((n) => n.phone),
    stats,
    recentRuns: runs,
  })
})

adminRouter.get('/stats', async (_req, res) => {
  const users = await User.find({ role: 'user' }).lean()
  const overview = await Promise.all(
    users.map(async (user) => {
      const userId = user._id
      return {
        userId: userId.toString(),
        name: user.name,
        email: user.email,
        status: user.status,
        totalRuns: await WorkflowRun.countDocuments({ userId }),
        completedRuns: await WorkflowRun.countDocuments({ userId, status: 'completed' }),
        failedRuns: await WorkflowRun.countDocuments({ userId, status: 'failed' }),
        activeRuns: await WorkflowRun.countDocuments({ userId, status: 'active' }),
      }
    }),
  )

  res.json({
    totalUsers: users.length,
    pendingUsers: users.filter((u) => u.status === 'pending').length,
    activeUsers: users.filter((u) => u.status === 'active').length,
    users: overview,
  })
})

adminRouter.post('/users', async (req, res) => {
  const { email, password, name, credentials } = req.body as {
    email?: string
    password?: string
    name?: string
    credentials?: CredentialsInput
  }

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required' })
    return
  }

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    res.status(409).json({ error: 'Email already in use' })
    return
  }

  const user = await User.create({
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
    name: name.trim(),
    role: 'user',
    status: 'active',
    emailVerified: true,
  })

  if (credentials) {
    await upsertUserCredentials(user._id.toString(), credentials)
  }

  res.status(201).json({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    status: user.status,
  })
})

adminRouter.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body as { status?: 'active' | 'rejected' | 'pending' }
  if (!status || !['active', 'rejected', 'pending'].includes(status)) {
    res.status(400).json({ error: 'Valid status required: active, rejected, or pending' })
    return
  }

  const user = await User.findOne({ _id: req.params.id, role: 'user' })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  user.status = status
  await user.save()
  res.json({ id: user._id.toString(), status: user.status })
})

adminRouter.put('/users/:id/credentials', async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'user' })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const credentials = req.body as CredentialsInput
  await upsertUserCredentials(user._id.toString(), credentials)
  const creds = await UserCredentials.findOne({ userId: user._id })
  res.json({
    credentials: sanitizeCredentials(creds),
    credentialsForm: credentialsToAdminForm(creds),
  })
})

adminRouter.post('/users/:id/approve', async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'user' })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  user.status = 'active'
  await user.save()

  const { credentials } = req.body as { credentials?: CredentialsInput }
  if (credentials) {
    await upsertUserCredentials(user._id.toString(), credentials)
  }

  res.json({ id: user._id.toString(), status: user.status })
})

adminRouter.delete('/users/:id', async (req, res) => {
  const userId = req.params.id
  if (!Types.ObjectId.isValid(userId)) {
    res.status(400).json({ error: 'Invalid user id' })
    return
  }

  const user = await User.findOne({ _id: userId, role: 'user' })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  await Promise.all([
    User.findByIdAndDelete(userId),
    UserCredentials.deleteOne({ userId }),
    AllowedWhatsAppNumber.deleteMany({ userId }),
    WorkflowRun.deleteMany({ userId }),
  ])

  res.json({ message: 'User deleted' })
})
