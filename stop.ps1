Get-NetTCPConnection -LocalPort 3000,5173,5174 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Write-Host "Stopped processes on ports 3000/5173/5174"
