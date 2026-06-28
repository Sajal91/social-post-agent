import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { User, type IUser } from '../../models/User.js'
import { signToken } from '../../utils/jwt.js'
import { requireAuth, type AuthRequest } from '../../middleware/auth.js'

export const authRouter = Router()

function userResponse(user: IUser) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
  }
}

function issueAuthResponse(user: IUser, res: Response) {
  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    status: user.status,
  })
  res.json({ token, user: userResponse(user) })
}

authRouter.post('/register', async (req, res) => {
  const { email, password, name } = req.body as {
    email?: string
    password?: string
    name?: string
  }

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required' })
    return
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' })
    return
  }

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' })
    return
  }

  const user = await User.create({
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
    name: name.trim(),
    role: 'user',
    status: 'pending',
    emailVerified: true,
  })

  issueAuthResponse(user, res)
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  issueAuthResponse(user, res)
})

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  issueAuthResponse(req.user!, res)
})

authRouter.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string
    newPassword?: string
  }

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password are required' })
    return
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' })
    return
  }

  const user = req.user!
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: 'Current password is incorrect' })
    return
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12)
  await user.save()
  res.json({ message: 'Password updated' })
})
