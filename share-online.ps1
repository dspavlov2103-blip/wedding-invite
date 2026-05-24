# Временная публичная ссылка (пока включён этот скрипт и компьютер)
# Для постоянной ссылки см. DEPLOY-RU.md — Render.com

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "Node.js не найден. Установите Node с https://nodejs.org" -ForegroundColor Red
  exit 1
}

$port = 3847
$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Write-Host "Запускаю сайт на порту $port..."
  Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $Root -WindowStyle Minimized
  Start-Sleep -Seconds 2
}

$tools = Join-Path $Root "tools"
$cloudflared = Join-Path $tools "cloudflared.exe"
if (-not (Test-Path $cloudflared)) {
  New-Item -ItemType Directory -Force -Path $tools | Out-Null
  $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
  Write-Host "Скачиваю cloudflared (один раз)..."
  Invoke-WebRequest -Uri $url -OutFile $cloudflared -UseBasicParsing
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Публичная ссылка появится ниже через" -ForegroundColor Cyan
Write-Host "  несколько секунд (https://....trycloudflare.com)" -ForegroundColor Cyan
Write-Host "  Отправьте ЕЁ друзьям в WhatsApp / Telegram" -ForegroundColor Cyan
Write-Host "  Не закрывайте это окно!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

& $cloudflared tunnel --url "http://localhost:$port"
