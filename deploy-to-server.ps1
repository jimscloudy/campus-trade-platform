# 从本机一键同步代码到 Linux 服务器并 Docker 部署
# 用法:
#   .\deploy-to-server.ps1 -Server "root@192.168.1.100" -RemoteDir "/opt/campus-trade"
# 依赖: 本机已配置 ssh / scp（OpenSSH）

param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [string]$RemoteDir = "/opt/campus-trade",

  [string]$WebPort = "8080"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> 同步代码到 $Server`:$RemoteDir" -ForegroundColor Cyan

# 排除 node_modules / dist / 本地数据库
$exclude = @(
  "node_modules",
  "server/node_modules",
  "web/node_modules",
  "server/dist",
  "web/dist",
  "server/data",
  ".git",
  "*.log"
)

$tarName = "campus-trade-deploy.tgz"
$tarPath = Join-Path $env:TEMP $tarName

if (Get-Command tar -ErrorAction SilentlyContinue) {
  Push-Location $Root
  $exArgs = @()
  foreach ($e in $exclude) { $exArgs += @("--exclude", $e) }
  & tar -czf $tarPath @exArgs .
  Pop-Location
} else {
  throw "需要 tar 命令（Windows 10+ 自带）"
}

ssh $Server "mkdir -p $RemoteDir"
scp $tarPath "${Server}:/tmp/$tarName"
ssh $Server "cd $RemoteDir && tar -xzf /tmp/$tarName && rm -f /tmp/$tarName && chmod +x deploy.sh && sed -i 's/^WEB_PORT=.*/WEB_PORT=$WebPort/' .env.docker 2>/dev/null || true; ./deploy.sh"

Remove-Item $tarPath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "部署完成。浏览器打开: http://$($Server.Split('@')[-1]):$WebPort" -ForegroundColor Green
Write-Host "演示账号: demo / 123456"
