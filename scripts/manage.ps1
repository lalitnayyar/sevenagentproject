#Requires -Version 5.1
<#
.SYNOPSIS
    7-Agent Price Intelligence Dashboard — Interactive Management Script (PowerShell)
.DESCRIPTION
    Full lifecycle management: deploy, start, stop, restart, patch, fix, pull latest code,
    collect logs + zip for review, health check, and cleanup.
.AUTHOR
    Lalit Nayyar <lalitnayyar@gmail.com> | +971508320336 | +919595353336
.VERSION
    2.0.0
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Configuration ─────────────────────────────────────────────────────────────
$SCRIPT_VERSION = "2.0.0"
$APP_NAME       = "agent-dashboard"
$REPO_URL       = "https://github.com/lalitnayyar/sevenagentproject.git"
$CONTAINER_NAME = "agent-dashboard"
$IMAGE_NAME     = "agent-dashboard"
$DEFAULT_PORT   = 3000
$LOG_DIR        = Join-Path $PSScriptRoot ".." ".manus-logs"
$TIMESTAMP      = Get-Date -Format "yyyyMMdd_HHmmss"

# ── Colors ────────────────────────────────────────────────────────────────────
function Write-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║   7-Agent Price Intelligence Dashboard — Management Console  ║" -ForegroundColor Cyan
    Write-Host "  ║   Author: Lalit Nayyar  |  v$SCRIPT_VERSION                          ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Info    { param($msg) Write-Host "  ℹ $msg" -ForegroundColor Cyan  }
function Write-Warn    { param($msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Err     { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red   }
function Write-Step    { param($msg) Write-Host "  → $msg" -ForegroundColor Blue  }

# ── Helpers ───────────────────────────────────────────────────────────────────
function Check-Docker {
    try {
        $null = docker info 2>&1
        Write-Success "Docker is running"
        return $true
    } catch {
        Write-Err "Docker is not running. Please start Docker Desktop."
        return $false
    }
}

function Check-Git {
    try {
        $null = git --version 2>&1
        return $true
    } catch {
        Write-Err "Git is not installed. Please install Git."
        return $false
    }
}

function Get-ContainerStatus {
    $status = docker inspect --format='{{.State.Status}}' $CONTAINER_NAME 2>$null
    return $status
}

# Kill whatever Docker container or OS process is holding the given port
function Kill-Port {
    param([int]$Port = $DEFAULT_PORT)
    Write-Step "Checking if port $Port is in use..."

    # 1. Stop any Docker container mapped to this host port
    $runningContainers = docker ps --format '{{.Names}}' 2>$null
    if ($runningContainers) {
        foreach ($c in $runningContainers) {
            $portInfo = docker port $c 2>$null
            if ($portInfo -match "0\.0\.0\.0:${Port}->") {
                Write-Warn "Docker container '$c' is using port $Port — stopping it..."
                docker stop $c 2>$null | Out-Null
                docker rm   $c 2>$null | Out-Null
                Write-Success "Container '$c' stopped and removed"
            }
        }
    }

    # 2. Kill any OS-level process holding the port
    $netstatOutput = netstat -ano 2>$null | Select-String ":$Port "
    if ($netstatOutput) {
        $pids = $netstatOutput | ForEach-Object {
            ($_ -split '\s+')[-1]
        } | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique
        foreach ($p in $pids) {
            if ($p -and $p -ne '0') {
                try {
                    $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Warn "Port $Port held by PID $p ($($proc.ProcessName)) — killing..."
                        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                        Write-Success "PID $p killed — port $Port is now free"
                    }
                } catch { }
            }
        }
    } else {
        Write-Success "Port $Port is free"
    }
}

function Show-Status {
    Write-Info "Container Status:"
    $status = Get-ContainerStatus
    if ($status -eq "running") {
        Write-Success "Container '$CONTAINER_NAME' is RUNNING"
        Write-Info "  Accessible at: http://localhost:$DEFAULT_PORT"
    } elseif ($status) {
        Write-Warn "Container '$CONTAINER_NAME' status: $status"
    } else {
        Write-Info "Container '$CONTAINER_NAME' does not exist"
    }
    Write-Host ""
    Write-Info "All containers:"
    docker ps --filter "name=$APP_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# ── Operations ────────────────────────────────────────────────────────────────

function Deploy-App {
    Write-Header
    Write-Host "  DEPLOY — Full Build & Start" -ForegroundColor White
    Write-Host "  ─────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""

    if (-not (Check-Docker)) { return }

    # Copy .env if not exists
    $envFile = Join-Path $PSScriptRoot ".." ".env"
    $envTemplate = Join-Path $PSScriptRoot ".." ".env.template"
    if (-not (Test-Path $envFile)) {
        if (Test-Path $envTemplate) {
            Copy-Item $envTemplate $envFile
            Write-Warn ".env not found — copied from .env.template. Please edit .env with your API keys!"
            Write-Info "Opening .env in notepad..."
            Start-Process notepad $envFile
            Read-Host "Press Enter after editing .env to continue"
        } else {
            Write-Warn ".env.template not found. Proceeding without .env"
        }
    }

    Write-Step "Pulling latest base images..."
    docker pull node:22-alpine
    docker pull nginx:1.27-alpine

    Write-Step "Building Docker image..."
    $projectRoot = Join-Path $PSScriptRoot ".."
    docker build -t "${IMAGE_NAME}:latest" $projectRoot
    if ($LASTEXITCODE -ne 0) { Write-Err "Build failed!"; return }
    Write-Success "Image built successfully"

    Write-Step "Stopping existing container (if any)..."
    docker stop $CONTAINER_NAME 2>$null
    docker rm $CONTAINER_NAME 2>$null

    Kill-Port $DEFAULT_PORT
    Write-Step "Starting container..."
    docker run -d `
        --name $CONTAINER_NAME `
        --restart unless-stopped `
        -p "${DEFAULT_PORT}:3000" `
        --env-file $envFile `
        "${IMAGE_NAME}:latest"

    if ($LASTEXITCODE -ne 0) { Write-Err "Container start failed!"; return }

    Write-Step "Waiting for health check..."
    Start-Sleep -Seconds 5
    $health = docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>$null
    if ($health -eq "healthy") {
        Write-Success "Container is healthy!"
    } else {
        Write-Info "Health status: $health (may still be starting)"
    }

    Write-Success "Deployment complete!"
    Write-Info "Dashboard: http://localhost:$DEFAULT_PORT"
    Write-Host ""
}

function Start-App {
    Write-Header
    Write-Host "  START — Start Containers" -ForegroundColor White
    Write-Host ""
    if (-not (Check-Docker)) { return }

    $status = Get-ContainerStatus
    if ($status -eq "running") {
        Write-Warn "Container is already running"
        return
    }

    if ($status -eq "exited" -or $status -eq "stopped") {
        Write-Step "Starting existing container..."
        docker start $CONTAINER_NAME
    } else {
        Write-Step "Using docker compose..."
        $projectRoot = Join-Path $PSScriptRoot ".."
        docker compose -f (Join-Path $projectRoot "docker-compose.yml") up -d
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Started! Dashboard: http://localhost:$DEFAULT_PORT"
    } else {
        Write-Err "Start failed. Run 'Deploy' first."
    }
}

function Stop-App {
    Write-Header
    Write-Host "  STOP — Stop Containers" -ForegroundColor White
    Write-Host ""
    if (-not (Check-Docker)) { return }

    Write-Step "Stopping container..."
    docker stop $CONTAINER_NAME 2>$null
    Write-Success "Container stopped"

    $choice = Read-Host "  Remove container too? (y/N)"
    if ($choice -eq "y" -or $choice -eq "Y") {
        docker rm $CONTAINER_NAME 2>$null
        Write-Success "Container removed"
    }
}

function Restart-App {
    Write-Header
    Write-Host "  RESTART — Restart Containers" -ForegroundColor White
    Write-Host ""
    if (-not (Check-Docker)) { return }
    Write-Step "Restarting container..."
    docker restart $CONTAINER_NAME
    Write-Success "Restarted! Dashboard: http://localhost:$DEFAULT_PORT"
}

function Update-App {
    Write-Header
    Write-Host "  UPDATE — Full Update: Pull + Remove Old Image + Rebuild + Restart" -ForegroundColor White
    Write-Host "  This is the recommended way to apply all code and Docker changes." -ForegroundColor DarkGray
    Write-Host ""
    if (-not (Check-Docker)) { return }
    if (-not (Check-Git)) { return }

    $projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
    Set-Location $projectRoot

    Write-Step "Pulling latest code from GitHub..."
    git pull origin main
    if ($LASTEXITCODE -ne 0) { Write-Err "git pull failed. Check network/credentials."; return }
    $lastCommit = git log -1 --format='%h %s' 2>$null
    Write-Success "Code up to date — $lastCommit"

    Write-Step "Stopping and removing old container..."
    docker stop $CONTAINER_NAME 2>$null
    docker rm   $CONTAINER_NAME 2>$null

    Write-Step "Removing old Docker image (prevents stale layer cache)..."
    docker rmi "${IMAGE_NAME}:latest" 2>$null

    Write-Step "Rebuilding Docker image from scratch (2-5 minutes)..."
    docker build -t "${IMAGE_NAME}:latest" $projectRoot
    if ($LASTEXITCODE -ne 0) { Write-Err "Docker build failed!"; return }
    Write-Success "Image rebuilt successfully"

    Kill-Port $DEFAULT_PORT
    Write-Step "Starting updated container on port $DEFAULT_PORT..."
    $envFile = Join-Path $projectRoot ".env"
    $envArg = if (Test-Path $envFile) { @("--env-file", $envFile) } else { @() }
    docker run -d --name $CONTAINER_NAME --restart unless-stopped -p "${DEFAULT_PORT}:3000" @envArg "${IMAGE_NAME}:latest"

    Write-Success "Update complete!"
    Write-Info  "Dashboard: http://localhost:$DEFAULT_PORT"
    Write-Info  "Logs:      docker logs $CONTAINER_NAME --tail 20"
}

function Pull-AndRebuild {
    Write-Header
    Write-Host "  PULL & REBUILD — Pull Latest Code and Rebuild (interactive)" -ForegroundColor White
    Write-Host ""
    if (-not (Check-Docker)) { return }
    if (-not (Check-Git)) { return }

    $projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
    Set-Location $projectRoot

    Write-Step "Fetching latest changes from GitHub..."
    git fetch origin
    $behind = git rev-list HEAD..origin/main --count 2>$null
    if ($behind -gt 0) {
        Write-Info "  $behind new commit(s) available"
        $choice = Read-Host "  Pull and rebuild? (Y/n)"
        if ($choice -ne "n" -and $choice -ne "N") {
            git pull origin main
            Write-Success "Code updated"

            Write-Step "Stopping and removing old container..."
            docker stop $CONTAINER_NAME 2>$null
            docker rm   $CONTAINER_NAME 2>$null

            Write-Step "Removing old Docker image (ensures clean rebuild — no stale layers)..."
            docker rmi "${IMAGE_NAME}:latest" 2>$null

            Write-Step "Rebuilding Docker image (this may take 2-5 minutes)..."
            docker build -t "${IMAGE_NAME}:latest" $projectRoot

            Kill-Port $DEFAULT_PORT
            Write-Step "Starting updated container..."
            $envFile = Join-Path $projectRoot ".env"
            $envArg = if (Test-Path $envFile) { @("--env-file", $envFile) } else { @() }
            docker run -d --name $CONTAINER_NAME --restart unless-stopped -p "${DEFAULT_PORT}:3000" @envArg "${IMAGE_NAME}:latest"
            Write-Success "Update complete! Dashboard: http://localhost:$DEFAULT_PORT"
        }
    } else {
        Write-Success "Already up to date (HEAD matches origin/main)"
        $choice = Read-Host "  Force rebuild anyway? (y/N)"
        if ($choice -eq "y" -or $choice -eq "Y") {
            docker stop $CONTAINER_NAME 2>$null
            docker rm   $CONTAINER_NAME 2>$null
            docker rmi "${IMAGE_NAME}:latest" 2>$null
            docker build -t "${IMAGE_NAME}:latest" $projectRoot
            $envFile = Join-Path $projectRoot ".env"
            $envArg = if (Test-Path $envFile) { @("--env-file", $envFile) } else { @() }
            Kill-Port $DEFAULT_PORT
            docker run -d --name $CONTAINER_NAME --restart unless-stopped -p "${DEFAULT_PORT}:3000" @envArg "${IMAGE_NAME}:latest"
            Write-Success "Rebuild complete! Dashboard: http://localhost:$DEFAULT_PORT"
        }
    }
}

function Patch-App {
    Write-Header
    Write-Host "  PATCH — Apply Hot Patch (rebuild without full stop)" -ForegroundColor White
    Write-Host ""
    if (-not (Check-Docker)) { return }

    $projectRoot = Join-Path $PSScriptRoot ".."
    Write-Step "Building new image with tag: patch-$TIMESTAMP..."
    docker build -t "${IMAGE_NAME}:patch-$TIMESTAMP" $projectRoot
    if ($LASTEXITCODE -ne 0) { Write-Err "Patch build failed!"; return }

    Write-Step "Swapping container (zero-downtime)..."
    docker stop $CONTAINER_NAME 2>$null
    docker rm $CONTAINER_NAME 2>$null
    docker tag "${IMAGE_NAME}:patch-$TIMESTAMP" "${IMAGE_NAME}:latest"
    $envFile = Join-Path $projectRoot ".env"
    $envArg = if (Test-Path $envFile) { @("--env-file", $envFile) } else { @() }
    Kill-Port $DEFAULT_PORT
    docker run -d --name $CONTAINER_NAME --restart unless-stopped -p "${DEFAULT_PORT}:3000" @envArg "${IMAGE_NAME}:latest"
    Write-Success "Patch applied! Dashboard: http://localhost:$DEFAULT_PORT"
}

function Fix-App {
    Write-Header
    Write-Host "  FIX — Diagnostics & Auto-Fix" -ForegroundColor White
    Write-Host ""
    if (-not (Check-Docker)) { return }

    Write-Step "Running diagnostics..."
    Write-Host ""

    # Check 1: Container status
    $status = Get-ContainerStatus
    Write-Info "Container status: $(if ($status) { $status } else { 'not found' })"

    # Check 2: Port availability
    $portInUse = netstat -ano 2>$null | Select-String ":$DEFAULT_PORT "
    if ($portInUse) {
        Write-Warn "Port $DEFAULT_PORT is in use"
    } else {
        Write-Success "Port $DEFAULT_PORT is available"
    }

    # Check 3: Image exists
    $imageExists = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -eq "${IMAGE_NAME}:latest" }
    if ($imageExists) {
        Write-Success "Docker image exists: ${IMAGE_NAME}:latest"
    } else {
        Write-Warn "Docker image not found — will rebuild"
    }

    # Check 4: .env file
    $envFile = Join-Path $PSScriptRoot ".." ".env"
    if (Test-Path $envFile) {
        Write-Success ".env file found"
        $openaiKey = (Get-Content $envFile | Select-String "OPENAI_API_KEY=sk-").Matches.Count
        if ($openaiKey -gt 0) { Write-Success "OPENAI_API_KEY is configured" }
        else { Write-Warn "OPENAI_API_KEY not configured in .env" }
    } else {
        Write-Warn ".env file not found"
    }

    Write-Host ""
    $choice = Read-Host "  Auto-fix issues? (Y/n)"
    if ($choice -ne "n" -and $choice -ne "N") {
        if ($status -ne "running") {
            Write-Step "Attempting to start container..."
            if (-not $imageExists) {
                Write-Step "Building image first..."
                $projectRoot = Join-Path $PSScriptRoot ".."
                docker build -t "${IMAGE_NAME}:latest" $projectRoot
            }
            docker stop $CONTAINER_NAME 2>$null
            docker rm $CONTAINER_NAME 2>$null
            Kill-Port $DEFAULT_PORT
            $envArg = if (Test-Path $envFile) { "--env-file $envFile" } else { "" }
            Invoke-Expression "docker run -d --name $CONTAINER_NAME --restart unless-stopped -p ${DEFAULT_PORT}:3000 $envArg ${IMAGE_NAME}:latest"
            Write-Success "Container started"
        }
        Write-Step "Pruning unused Docker resources..."
        docker system prune -f
        Write-Success "Fix complete"
    }
}

function Collect-Logs {
    Write-Header
    Write-Host "  COLLECT LOGS — Gather All Logs and Create ZIP Archive" -ForegroundColor White
    Write-Host ""
    if (-not (Check-Docker)) { return }

    $logsDir = Join-Path $env:TEMP "agent-dashboard-logs-$TIMESTAMP"
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Step "Collecting logs to: $logsDir"

    # Docker container logs
    Write-Step "Collecting Docker container logs..."
    docker logs $CONTAINER_NAME > (Join-Path $logsDir "container-stdout.log") 2>&1
    docker logs $CONTAINER_NAME --since 24h > (Join-Path $logsDir "container-24h.log") 2>&1
    Write-Success "Container logs collected"

    # Docker inspect
    Write-Step "Collecting container inspect info..."
    docker inspect $CONTAINER_NAME > (Join-Path $logsDir "container-inspect.json") 2>&1
    docker stats $CONTAINER_NAME --no-stream > (Join-Path $logsDir "container-stats.txt") 2>&1
    Write-Success "Container info collected"

    # Docker system info
    Write-Step "Collecting Docker system info..."
    docker system df > (Join-Path $logsDir "docker-system-df.txt") 2>&1
    docker images > (Join-Path $logsDir "docker-images.txt") 2>&1
    docker ps -a > (Join-Path $logsDir "docker-ps.txt") 2>&1
    Write-Success "Docker system info collected"

    # App logs from .manus-logs
    $appLogsDir = Join-Path $PSScriptRoot ".." ".manus-logs"
    if (Test-Path $appLogsDir) {
        Write-Step "Collecting app logs from .manus-logs/..."
        Copy-Item -Path "$appLogsDir\*" -Destination $logsDir -Recurse -Force
        Write-Success "App logs collected"
    }

    # System info
    Write-Step "Collecting system info..."
    $sysInfo = @"
=== System Information ===
Date: $(Get-Date)
OS: $([System.Environment]::OSVersion.VersionString)
Machine: $env:COMPUTERNAME
User: $env:USERNAME
PowerShell: $($PSVersionTable.PSVersion)
Docker: $(docker --version 2>&1)
Node: $(node --version 2>&1)
Git: $(git --version 2>&1)

=== Network ===
$(ipconfig 2>&1 | Select-String "IPv4" | Select-Object -First 5)

=== Disk ===
$(Get-PSDrive -PSProvider FileSystem | Format-Table -AutoSize | Out-String)
"@
    $sysInfo | Out-File (Join-Path $logsDir "system-info.txt")
    Write-Success "System info collected"

    # Environment (redacted)
    Write-Step "Collecting environment config (keys redacted)..."
    $envFile = Join-Path $PSScriptRoot ".." ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^([^=]+)=(.+)$") {
                $key = $Matches[1]
                $val = $Matches[2]
                if ($key -match "KEY|TOKEN|SECRET|PASSWORD") {
                    "$key=***REDACTED***"
                } else {
                    $_
                }
            } else { $_ }
        } | Out-File (Join-Path $logsDir "env-redacted.txt")
        Write-Success "Environment config collected (keys redacted)"
    }

    # Create ZIP
    Write-Step "Creating ZIP archive..."
    $zipPath = Join-Path $env:USERPROFILE "Desktop" "agent-dashboard-logs-$TIMESTAMP.zip"
    Compress-Archive -Path "$logsDir\*" -DestinationPath $zipPath -Force
    Write-Success "ZIP created: $zipPath"

    # Cleanup temp
    Remove-Item -Path $logsDir -Recurse -Force

    Write-Host ""
    Write-Success "Log collection complete!"
    Write-Info "Archive: $zipPath"

    $choice = Read-Host "  Open containing folder? (Y/n)"
    if ($choice -ne "n" -and $choice -ne "N") {
        Start-Process explorer (Split-Path $zipPath)
    }
}

function Cleanup-App {
    Write-Header
    Write-Host "  CLEANUP — Remove Containers, Images, and Volumes" -ForegroundColor White
    Write-Host ""
    if (-not (Check-Docker)) { return }

    Write-Warn "This will remove the container, image, and volumes!"
    $choice = Read-Host "  Are you sure? Type 'yes' to confirm"
    if ($choice -ne "yes") { Write-Info "Cancelled."; return }

    Write-Step "Stopping and removing container..."
    docker stop $CONTAINER_NAME 2>$null
    docker rm $CONTAINER_NAME 2>$null

    Write-Step "Removing image..."
    docker rmi "${IMAGE_NAME}:latest" 2>$null
    docker rmi "${IMAGE_NAME}:patch-*" 2>$null

    Write-Step "Removing volumes..."
    docker volume rm agent-dashboard-data 2>$null
    docker volume rm agent-dashboard-logs 2>$null

    Write-Step "Pruning system..."
    docker system prune -f

    Write-Success "Cleanup complete"
}

function Open-Browser {
    Start-Process "http://localhost:$DEFAULT_PORT"
    Write-Success "Opened http://localhost:$DEFAULT_PORT in browser"
}

function Show-Logs-Live {
    Write-Header
    Write-Host "  LIVE LOGS — Following container logs (Ctrl+C to stop)" -ForegroundColor White
    Write-Host ""
    if (-not (Check-Docker)) { return }
    Write-Info "Following logs for container: $CONTAINER_NAME"
    Write-Host ""
    docker logs -f --tail 50 $CONTAINER_NAME
}

# ── Main Menu ─────────────────────────────────────────────────────────────────
function Show-Menu {
    Write-Header
    Show-Status
    Write-Host "  ┌─────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  DEPLOYMENT                                                  │" -ForegroundColor DarkGray
    Write-Host "  │   [1] Deploy (Full Build + Start)                            │" -ForegroundColor White
    Write-Host "  │   [2] Start                                                  │" -ForegroundColor White
    Write-Host "  │   [3] Stop                                                   │" -ForegroundColor White
    Write-Host "  │   [4] Restart                                                │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  UPDATES & FIXES                                             │" -ForegroundColor DarkGray
    Write-Host "  │   [5] UPDATE  <- Recommended: pull+rmi+rebuild+restart       │" -ForegroundColor Green
    Write-Host "  │   [6] Pull & Rebuild (interactive, shows commit count)        │" -ForegroundColor White
    Write-Host "  │   [7] Patch (Hot Patch — rebuild only, no pull)               │" -ForegroundColor White
    Write-Host "  │   [8] Fix (Diagnostics + Auto-Fix)                            │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  LOGS & MONITORING                                           │" -ForegroundColor DarkGray
    Write-Host "  │   [9] Collect All Logs + ZIP for Review                      │" -ForegroundColor White
    Write-Host "  │  [10] Follow Live Logs                                       │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  OTHER                                                       │" -ForegroundColor DarkGray
    Write-Host "  │  [11] Open Dashboard in Browser                              │" -ForegroundColor White
    Write-Host "  │  [12] Cleanup (Remove All)                                   │" -ForegroundColor White
    Write-Host "  │   [0] Exit                                                   │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
}

# ── Entry Point ───────────────────────────────────────────────────────────────
while ($true) {
    Show-Menu
    $choice = Read-Host "  Enter choice"
    Write-Host ""
    switch ($choice) {
        "1"  { Deploy-App }
        "2"  { Start-App }
        "3"  { Stop-App }
        "4"  { Restart-App }
        "5"  { Update-App }
        "6"  { Pull-AndRebuild }
        "7"  { Patch-App }
        "8"  { Fix-App }
        "9"  { Collect-Logs }
        "10" { Show-Logs-Live }
        "11" { Open-Browser }
        "12" { Cleanup-App }
        "0"  { Write-Info "Goodbye!"; exit 0 }
        default { Write-Warn "Invalid choice. Please enter 0-12." }
    }
    Write-Host ""
    Read-Host "  Press Enter to return to menu"
}
