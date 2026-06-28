import express from 'express'
import cors from 'cors'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { whatsappWebhookRouter } from './routes/whatsapp-webhook.js'
import { runsRouter } from './routes/api/runs.js'
import { authRouter } from './routes/api/auth.js'
import { adminRouter } from './routes/api/admin.js'
import { usersRouter } from './routes/api/users.js'
import { seedAdminUser } from './seed/admin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const clientDist = join(__dirname, '../../client/dist')
const indexHtml = join(clientDist, 'index.html')

async function main() {
  await connectDb()
  await seedAdminUser()

  const app = express()
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
  app.use(express.json())

  app.use('/uploads', express.static(join(__dirname, '../uploads')))
  app.use('/webhook/whatsapp', whatsappWebhookRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/runs', runsRouter)
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  // Built React assets (JS, CSS, favicon, etc.)
  app.use(express.static(clientDist))

  // SPA fallback — /login, /dashboard, /admin, etc.
  app.get('*', (_req, res, next) => {
    if (_req.path.startsWith('/api') || _req.path.startsWith('/uploads') || _req.path.startsWith('/webhook')) {
      next()
      return
    }
    res.sendFile(indexHtml)
  })

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
