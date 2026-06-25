import { Router, type Request, type Response } from 'express'
import mongoose from 'mongoose'
import { WorkflowRun } from '../../models/WorkflowRun.js'

export const runsRouter = Router()

runsRouter.get('/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState
  const dbOk = dbState === 1
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    mongodb: dbOk ? 'connected' : 'disconnected',
  })
})

runsRouter.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const runs = await WorkflowRun.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  res.json(runs)
})

runsRouter.get('/:id', async (req: Request, res: Response) => {
  const run = await WorkflowRun.findById(req.params.id).lean()
  if (!run) {
    res.status(404).json({ error: 'Run not found' })
    return
  }
  res.json(run)
})
