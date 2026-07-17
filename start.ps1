$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = Join-Path $root "server"
$web = Join-Path $root "web"

New-Item -ItemType Directory -Force -Path (Join-Path $server "data") | Out-Null

Write-Host "Building server..." -ForegroundColor Cyan
Push-Location $server
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

Write-Host "Starting API on :3000 ..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "dist/main.js" -WorkingDirectory $server -WindowStyle Minimized

Write-Host "Starting Web on :5173 ..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run","dev","--","--port","5173","--host","0.0.0.0" -WorkingDirectory $web -WindowStyle Minimized

Start-Sleep -Seconds 3
Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173"
Write-Host "  API:      http://localhost:3000/api"
Write-Host "  Login:    demo / 123456"
