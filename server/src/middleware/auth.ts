import type { NextFunction, Request, Response } from 'express'
import { User, type IUser } from '../models/User.js'
import { verifyToken } from '../utils/jwt.js'

export interface AuthRequest extends Request {
  user?: IUser
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    const payload = verifyToken(header.slice(7))
    const user = await User.findById(payload.userId)
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}

export function requireActiveUser(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  if (req.user.role !== 'admin' && req.user.status !== 'active') {
    res.status(403).json({
      error:
        req.user.status === 'pending'
          ? 'Your account is pending admin approval'
          : 'Your account is not active',
    })
    return
  }
  next()
}
