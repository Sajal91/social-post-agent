# SocialPostAgent

MERN-stack social media content automation. Trigger workflows on WhatsApp, approve topics and content via chat, and post to Facebook, Instagram, and LinkedIn.

## Stack

- **MongoDB** — workflow sessions and run history
- **Express** — REST API + WhatsApp webhook
- **React** — dashboard to monitor runs
- **Node.js** — backend runtime
- **Google Gemini** — topic generation, captions, and images

## Quick start

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in credentials — see [CREDENTIALS_SETUP.txt](./CREDENTIALS_SETUP.txt) for every key and where to get it.

3. Start MongoDB locally or use MongoDB Atlas.

4. Install and run:
   ```bash
   npm install
   npm run dev
   ```

5. Open the dashboard: http://localhost:5173

6. Expose the server for WhatsApp webhooks (dev):
   ```bash
   ngrok http 5000
   ```
   Set `PUBLIC_BASE_URL` in `.env` to your ngrok HTTPS URL and configure the Meta webhook (see CREDENTIALS_SETUP.txt).

## WhatsApp workflow

1. Message your bot: **Hey, Generate content**
2. Reply with a niche/theme (e.g. `Fitness for busy moms`)
3. Pick a topic from the interactive list
4. Review generated copy + image → **Approve**, **Edit**, or **Regenerate**
5. Reply with platforms: `all`, `1,2`, `facebook`, etc.
6. Bot posts and sends a summary

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express (5000) + React (5173) |
| `npm run dev:server` | Backend only |
| `npm run dev:client` | Frontend only |
| `npm run build` | Build client and server |

## Project structure

```
client/     React dashboard (Vite)
server/     Express API, WhatsApp webhook, Gemini, social posting
```
