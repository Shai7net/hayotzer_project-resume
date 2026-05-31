param(
  [string]$EnvPath = (Join-Path (Split-Path -Parent $PSScriptRoot) ".env")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $EnvPath)) {
  throw ".env file was not found at $EnvPath"
}

$envValues = @{}
Get-Content -LiteralPath $EnvPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
    return
  }
  $parts = $line.Split("=", 2)
  $envValues[$parts[0].Trim()] = $parts[1].Trim()
}

$token = $envValues["TELEGRAM_BOT_TOKEN"]
$webhookBaseUrl = $envValues["TELEGRAM_WEBHOOK_BASE_URL"]
if (-not $webhookBaseUrl) {
  $webhookBaseUrl = $envValues["SITE_PUBLIC_URL"]
}
$webhookBaseUrl = ($webhookBaseUrl -replace "/+$", "")
$secret = $envValues["TELEGRAM_WEBHOOK_SECRET"]

if (-not $token) {
  throw "TELEGRAM_BOT_TOKEN is missing in .env"
}
if (-not $webhookBaseUrl -or $webhookBaseUrl -match "your-netlify-site|github\.io") {
  throw "TELEGRAM_WEBHOOK_BASE_URL must be your Netlify site URL in .env"
}
if (-not $secret) {
  throw "TELEGRAM_WEBHOOK_SECRET is missing in .env"
}

$body = @{
  url = "$webhookBaseUrl/api/telegram-bot"
  secret_token = $secret
  allowed_updates = @("message", "callback_query", "channel_post")
} | ConvertTo-Json -Depth 4

$response = Invoke-RestMethod `
  -Uri "https://api.telegram.org/bot$token/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

$response | ConvertTo-Json -Depth 6
