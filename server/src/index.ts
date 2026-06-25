import express from 'express'
import cors from 'cors'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { whatsappWebhookRouter } from './routes/whatsapp-webhook.js'
import { runsRouter } from './routes/api/runs.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  await connectDb()

  const app = express()
  app.use(cors({ origin: "*" }))
  // app.use(cors({ origin: env.CLIENT_URL }))
  app.use(express.json())

  app.use('/uploads', express.static(join(__dirname, '../uploads')))
  app.use('/webhook/whatsapp', whatsappWebhookRouter)
  app.use('/api/runs', runsRouter)
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
