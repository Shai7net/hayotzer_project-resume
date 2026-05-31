# Hayotzer Telegram Analytics

This file explains how to configure the private Telegram analytics bot.

Important: do not put real tokens, chat IDs, or private secrets in this README.
Real values belong only in:

```text
D:\Stable-Diffusion\hayotzerWEB\hayotzerweb project\.env
```

The `.env` file is intentionally ignored by Git and must not be uploaded to GitHub.

## Required `.env` Values

Use this structure in `.env`:

```env
TELEGRAM_BOT_TOKEN=PUT_TELEGRAM_BOT_TOKEN_HERE
TELEGRAM_ADMIN_CHAT_ID=PUT_NUMERIC_CHAT_ID_HERE
TELEGRAM_ALLOWED_USER_IDS=PUT_NUMERIC_USER_ID_HERE
TELEGRAM_ALLOWED_CHAT_IDS=
TELEGRAM_DAILY_CHAT_IDS=
TELEGRAM_DAILY_REPORT_ENABLED=false
TELEGRAM_DAILY_REPORT_KIND=last24
TELEGRAM_WEBHOOK_SECRET=PUT_LONG_RANDOM_WEBHOOK_SECRET_HERE
ANALYTICS_OWNER_SECRET=PUT_LONG_RANDOM_OWNER_SECRET_HERE
ANALYTICS_TIMEZONE=Asia/Jerusalem
TELEGRAM_NOTIFY_VISITS=false
SITE_PUBLIC_URL=https://your-netlify-site.netlify.app
```

Notes:

- `TELEGRAM_BOT_TOKEN` comes from BotFather.
- `TELEGRAM_ADMIN_CHAT_ID` must be digits only, for example `123456789`.
- `TELEGRAM_ALLOWED_USER_IDS` can contain one or more numeric Telegram user IDs separated by commas.
- `TELEGRAM_ALLOWED_CHAT_IDS` can contain group/channel chat IDs that are allowed to operate the bot.
- `TELEGRAM_DAILY_CHAT_IDS` controls where the daily control panel is sent. Use the channel/group/user chat ID or an `@channelusername` target.
- `TELEGRAM_DAILY_REPORT_ENABLED=true` turns on the daily scheduled report. Leave it `false` until the target is ready.
- `TELEGRAM_DAILY_REPORT_KIND` can be `last24`, `today`, `yesterday`, or `week`.
- `TELEGRAM_WEBHOOK_SECRET` should be a long random private string.
- `ANALYTICS_OWNER_SECRET` is used to mark your own visits so they are not counted like public visitors.
- `SITE_PUBLIC_URL` must be the real Netlify site URL, not the GitHub Pages URL.

## Bot Commands

The bot supports:

- `/start`
- `/today`
- `/last24`
- `/yesterday`
- `/week`
- `/owner`
- `/whoami`

It also includes inline buttons for quick Hebrew reports.

## Daily Channel Control Panel

The project includes a Netlify Scheduled Function that can send a daily Telegram control panel with the same inline buttons.

To enable it:

1. Add the bot as an admin in the Telegram channel or group.
2. Set `TELEGRAM_DAILY_CHAT_IDS` in Netlify to the target chat ID or `@channelusername`.
3. Set `TELEGRAM_DAILY_REPORT_ENABLED=true`.
4. Optional: set `TELEGRAM_ALLOWED_CHAT_IDS` to the numeric channel/group chat ID if you want channel posts such as `/whoami` to work there.
5. Redeploy the Netlify site.

The schedule is currently `0 6 * * *` in UTC, which is morning in Israel for most of the year.

## Setup Flow

1. Fill the real values in `.env`.
2. Deploy the site to Netlify with the same environment variables configured in Netlify.
3. Set `SITE_PUBLIC_URL` to the public Netlify URL.
4. Run:

```powershell
.\scripts\setup-telegram-webhook.ps1
```

Run the webhook setup again after deploying if you want Telegram to also deliver `channel_post` updates from channels.

## Owner Exclusion

To avoid counting your own visits, open the site using the owner secret URL that the bot returns from `/owner`.

Do not share that private link publicly.

## Safety Check

Before publishing to GitHub, make sure:

- `.env` is not staged or committed.
- This README contains placeholders only.
- No real Telegram token appears in `README_TELEGRAM_ANALYTICS.md`, `.env.example`, or `index.html`.
