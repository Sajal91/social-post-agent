import { Router, type Response } from 'express'
import mongoose from 'mongoose'
import { WorkflowRun } from '../../models/WorkflowRun.js'
import {
  requireActiveUser,
  requireAuth,
  type AuthRequest,
} from '../../middleware/auth.js'

export const runsRouter = Router()

runsRouter.get('/health', (_req, res: Response) => {
  const dbState = mongoose.connection.readyState
  const dbOk = dbState === 1
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    mongodb: dbOk ? 'connected' : 'disconnected',
  })
})

runsRouter.use(requireAuth, requireActiveUser)

runsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const filter =
    req.user!.role === 'admin' && req.query.all === 'true'
      ? {}
      : { userId: req.user!._id }

  const runs = await WorkflowRun.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  res.json(runs)
})

runsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const filter =
    req.user!.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user!._id }

  const run = await WorkflowRun.findOne(filter).lean()
  if (!run) {
    res.status(404).json({ error: 'Run not found' })
    return
  }
  res.json(run)
})
