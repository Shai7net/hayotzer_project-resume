# Hayotzer Telegram Analytics

This adds private Telegram-based analytics for the Hayotzer portfolio without exposing the Telegram Bot Token in the browser.

## Where To Put The Keys

Local file:

`D:\Stable-Diffusion\hayotzerWEB\hayotzerweb project\.env`

Fill:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
TELEGRAM_ALLOWED_USER_IDS=
TELEGRAM_WEBHOOK_SECRET=
ANALYTICS_OWNER_SECRET=
SITE_PUBLIC_URL=https://your-netlify-site.netlify.app
```

Use long random values for:

- `TELEGRAM_WEBHOOK_SECRET`
- `ANALYTICS_OWNER_SECRET`

Do not commit `.env`.

## Netlify Environment Variables

The same secret values must also be added in Netlify:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`
- `TELEGRAM_ALLOWED_USER_IDS`
- `TELEGRAM_WEBHOOK_SECRET`
- `ANALYTICS_OWNER_SECRET`
- `ANALYTICS_TIMEZONE`
- `TELEGRAM_NOTIFY_VISITS`
- `SITE_PUBLIC_URL`

GitHub Pages cannot run these serverless functions. The analytics bot needs Netlify Functions or another backend.

## Bot Setup

After the site is deployed on Netlify and `.env` is filled locally, run:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\setup-telegram-webhook.ps1"
```

Then open Telegram and send `/start` to your bot.

If you do not know your chat id yet, leave `TELEGRAM_ADMIN_CHAT_ID` empty on the first deploy. The bot will answer with the Chat ID. Put that value into Netlify and `.env`, then redeploy.

## Owner Exclusion

The bot has a button:

`👤 קישור בעלים`

Open that private link on your own phone/computer. The browser will be marked as owner and will stop sending analytics events.

Do not share that link.

## What Is Tracked

The site sends lightweight, privacy-conscious events:

- session start/end
- heartbeat for approximate visit duration
- shot/section reached
- video opened
- game completed
- contact link clicked
- coarse device category, viewport, language, timezone, referrer, and Netlify geo if available

It does not store raw IP addresses in the event payload.

## Bot Commands

- `/start`
- `/today`
- `/last24`
- `/yesterday`
- `/week`
- `/owner`
- `/whoami`

The bot also includes inline buttons for these reports.
