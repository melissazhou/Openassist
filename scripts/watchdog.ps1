# OpenAssist Watchdog - Health Check & Auto-Restart
# Usage: powershell -ExecutionPolicy Bypass -File watchdog.ps1 [-Mode start|check]
# Modes:
#   start - Start OpenAssist (used by boot task)
#   check - Health check + auto-restart if down (used by heartbeat task)

param(
    [ValidateSet("start", "check")]
    [string]$Mode = "check"
)

$ProjectDir = "D:\Project\OpenAssist"
$Port = 3000
$HealthUrl = "http://localhost:$Port/api/admin/health"
$LogFile = "$ProjectDir\logs\watchdog.log"
$PidFile = "$ProjectDir\logs\openassist.pid"
$MaxRetries = 3
$HealthTimeout = 10

# Ensure logs directory
if (-not (Test-Path "$ProjectDir\logs")) {
    New-Item -ItemType Directory -Path "$ProjectDir\logs" -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] $Message"
    Add-Content -Path $LogFile -Value $entry
    Write-Host $entry
}

function Test-OpenAssist {
    try {
        $response = Invoke-WebRequest -Uri $HealthUrl -TimeoutSec $HealthTimeout -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Test-PortListening {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

function Stop-OpenAssist {
    # Kill any existing node process on port 3000
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Log "Stopping existing process: $($proc.Name) (PID: $($proc.Id))"
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
            }
        }
    }
}

function Start-OpenAssist {
    Write-Log "Starting OpenAssist..."
    
    Set-Location $ProjectDir
    
    # Start next in production mode, detached
    $process = Start-Process -FilePath "pnpm" -ArgumentList "start", "--port", "$Port" `
        -WorkingDirectory $ProjectDir `
        -WindowStyle Hidden `
        -PassThru `
        -RedirectStandardOutput "$ProjectDir\logs\stdout.log" `
        -RedirectStandardError "$ProjectDir\logs\stderr.log"
    
    $process.Id | Set-Content $PidFile
    Write-Log "Started with PID: $($process.Id)"
    
    # Wait for startup (max 30s)
    $waited = 0
    while ($waited -lt 30) {
        Start-Sleep -Seconds 3
        $waited += 3
        if (Test-PortListening) {
            Write-Log "Port $Port is listening after ${waited}s"
            Start-Sleep -Seconds 2
            if (Test-OpenAssist) {
                Write-Log "Health check PASSED - OpenAssist is running"
                return $true
            }
        }
    }
    
    Write-Log "WARNING: Started but health check not passing after 30s"
    return (Test-PortListening)
}

# --- Main ---

switch ($Mode) {
    "start" {
        Write-Log "=== BOOT START ==="
        Stop-OpenAssist
        Start-Sleep -Seconds 2
        
        $success = Start-OpenAssist
        if ($success) {
            Write-Log "Boot start: SUCCESS"
        } else {
            Write-Log "Boot start: FAILED - will retry on next heartbeat"
        }
    }
    
    "check" {
        # Quick check first
        if (Test-OpenAssist) {
            # Healthy - silent exit (no log spam)
            exit 0
        }
        
        Write-Log "=== HEALTH CHECK FAILED ==="
        
        if (Test-PortListening) {
            Write-Log "Port $Port is listening but health endpoint not responding"
        } else {
            Write-Log "Port $Port is NOT listening - process is down"
        }
        
        # Retry loop
        for ($i = 1; $i -le $MaxRetries; $i++) {
            Write-Log "Restart attempt $i/$MaxRetries..."
            Stop-OpenAssist
            Start-Sleep -Seconds 3
            
            $success = Start-OpenAssist
            if ($success) {
                Write-Log "Restart attempt $i: SUCCESS"
                exit 0
            }
            Write-Log "Restart attempt $i: FAILED"
            Start-Sleep -Seconds 5
        }
        
        Write-Log "ERROR: All $MaxRetries restart attempts failed!"
        exit 1
    }
}
