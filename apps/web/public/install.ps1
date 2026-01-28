$ErrorActionPreference = "Stop"

$defaultRepoUrl = "https://github.com/Peiiii/moltbot-manager.git"
$repoUrl = $env:MANAGER_REPO_URL
$apiPort = if ($env:MANAGER_API_PORT) { $env:MANAGER_API_PORT } else { "17321" }
$apiHost = if ($env:MANAGER_API_HOST) { $env:MANAGER_API_HOST } else { "0.0.0.0" }

if (-not $repoUrl) {
  $repoUrl = $defaultRepoUrl
  Write-Host "[manager] MANAGER_REPO_URL not set. Using default: $repoUrl"
}

function Require-Command {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Hint
  )
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    if ($Hint) { Write-Error $Hint } else { Write-Error "[manager] $Name is required." }
    exit 1
  }
}

Require-Command -Name "git"
Require-Command -Name "node" -Hint "[manager] Node.js >= 22 is required."

if (-not (Get-Command "pnpm" -ErrorAction SilentlyContinue)) {
  if (Get-Command "corepack" -ErrorAction SilentlyContinue) {
    corepack enable | Out-Null
    corepack prepare pnpm@10.23.0 --activate | Out-Null
  } else {
    Write-Error "[manager] pnpm is required (install via corepack)."
    exit 1
  }
}

$installDir = if ($env:MANAGER_INSTALL_DIR) { $env:MANAGER_INSTALL_DIR } else { Join-Path $env:USERPROFILE "clawdbot-manager" }
$configDir = if ($env:MANAGER_CONFIG_DIR) { $env:MANAGER_CONFIG_DIR } else { Join-Path $env:USERPROFILE ".clawdbot-manager" }

if (Test-Path (Join-Path $installDir ".git")) {
  Write-Host "[manager] Updating $installDir"
  git -C $installDir pull --rebase
} else {
  Write-Host "[manager] Cloning to $installDir"
  git clone $repoUrl $installDir
}

Set-Location $installDir

if (-not $env:MANAGER_ADMIN_USER) {
  $env:MANAGER_ADMIN_USER = Read-Host "Admin username"
}

if (-not $env:MANAGER_ADMIN_PASS) {
  $secure = Read-Host "Admin password" -AsSecureString
  $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $env:MANAGER_ADMIN_PASS = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

pnpm install
pnpm build

New-Item -ItemType Directory -Force -Path $configDir | Out-Null

node apps/api/scripts/create-admin.mjs `
  --username "$($env:MANAGER_ADMIN_USER)" `
  --password "$($env:MANAGER_ADMIN_PASS)" `
  --config (Join-Path $configDir "config.json")

$logPath = if ($env:MANAGER_LOG_PATH) { $env:MANAGER_LOG_PATH } else { Join-Path $env:TEMP "clawdbot-manager.log" }
$webDist = Join-Path $installDir "apps/web/dist"
$configPath = Join-Path $configDir "config.json"

$cmdLine = "set MANAGER_API_HOST=$apiHost&& set MANAGER_API_PORT=$apiPort&& set MANAGER_WEB_DIST=$webDist&& set MANAGER_CONFIG_PATH=$configPath&& node $installDir\\apps\\api\\dist\\index.js > `"$logPath`" 2>&1"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmdLine -WorkingDirectory $installDir -WindowStyle Hidden | Out-Null

Write-Host "[manager] Started in background (log: $logPath)."
Write-Host "[manager] Open (local): http://localhost:$apiPort"
Write-Host "[manager] Open (local): http://127.0.0.1:$apiPort"
Write-Host "[manager] Open (LAN): http://<your-server-ip>:$apiPort"
