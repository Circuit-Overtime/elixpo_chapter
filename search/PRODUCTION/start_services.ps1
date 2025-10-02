# Elixpo Search Service Manager for Windows PowerShell
# Manages the embedding server and app workers

param(
    [int]$Workers = 2,
    [int]$BasePort = 5000,
    [string]$SrcDir = "src",
    [switch]$Help
)

if ($Help) {
    Write-Host "Elixpo Search Service Manager"
    Write-Host "Usage: .\start_services.ps1 [-Workers <count>] [-BasePort <port>] [-SrcDir <path>]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -Workers <count>    Number of app workers (default: 2)"
    Write-Host "  -BasePort <port>    Base port for app workers (default: 5000)"
    Write-Host "  -SrcDir <path>      Source directory path (default: src)"
    Write-Host "  -Help               Show this help message"
    Write-Host ""
    Write-Host "Example:"
    Write-Host "  .\start_services.ps1 -Workers 3 -BasePort 5000"
    exit 0
}

# Initialize variables
$processes = @()
$srcPath = Join-Path $PSScriptRoot $SrcDir

# Check if source directory exists
if (-not (Test-Path $srcPath)) {
    Write-Error "Source directory not found: $srcPath"
    exit 1
}

# Function to stop all processes
function Stop-AllProcesses {
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    
    foreach ($proc in $processes) {
        if (-not $proc.HasExited) {
            Write-Host "Stopping $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Yellow
            try {
                $proc.Kill()
                $proc.WaitForExit(5000)
            }
            catch {
                Write-Warning "Failed to stop process $($proc.Id): $_"
            }
        }
    }
    Write-Host "All services stopped" -ForegroundColor Green
}

# Handle Ctrl+C
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Stop-AllProcesses
}

try {
    Write-Host "Starting Elixpo Search with $Workers workers..." -ForegroundColor Cyan
    Write-Host "Source directory: $srcPath" -ForegroundColor Gray
    
    # Start embedding server
    Write-Host "Starting embedding server..." -ForegroundColor Yellow
    $embeddingProcess = Start-Process -FilePath "python" -ArgumentList "modelServer.py" -WorkingDirectory $srcPath -PassThru -WindowStyle Hidden
    $processes += $embeddingProcess
    Write-Host "Embedding server started with PID: $($embeddingProcess.Id)" -ForegroundColor Green
    
    # Wait for embedding server to initialize
    Start-Sleep -Seconds 5
    
    # Test embedding server connection
    Write-Host "Testing embedding server connection..." -ForegroundColor Yellow
    try {
        $testPath = Join-Path $PSScriptRoot "test_embedding_ipc.py"
        $testResult = Start-Process -FilePath "python" -ArgumentList $testPath -WorkingDirectory $srcPath -Wait -PassThru -WindowStyle Hidden
        
        if ($testResult.ExitCode -eq 0) {
            Write-Host "Embedding server connection test passed" -ForegroundColor Green
        } else {
            Write-Error "Embedding server connection test failed"
            Stop-AllProcesses
            exit 1
        }
    }
    catch {
        Write-Error "Error testing embedding server: $_"
        Stop-AllProcesses
        exit 1
    }
    
    # Start app workers
    for ($i = 0; $i -lt $Workers; $i++) {
        $port = $BasePort + $i
        Write-Host "Starting app worker $i on port $port..." -ForegroundColor Yellow
        
        # Set environment variable for port
        $env:PORT = $port
        
        $workerProcess = Start-Process -FilePath "python" -ArgumentList "app.py" -WorkingDirectory $srcPath -PassThru -WindowStyle Hidden
        $processes += $workerProcess
        Write-Host "App worker $i started with PID: $($workerProcess.Id) on port $port" -ForegroundColor Green
        
        Start-Sleep -Seconds 2  # Stagger startup
    }
    
    Write-Host "" -ForegroundColor White
    Write-Host "All services started successfully!" -ForegroundColor Green
    Write-Host "Embedding server: localhost:5002" -ForegroundColor Cyan
    for ($i = 0; $i -lt $Workers; $i++) {
        $port = $BasePort + $i
        Write-Host "App worker ${i}: localhost:$port" -ForegroundColor Cyan
    }
    Write-Host "" -ForegroundColor White
    Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
    
    # Monitor processes
    while ($true) {
        $deadProcesses = @()
        
        foreach ($proc in $processes) {
            if ($proc.HasExited) {
                $deadProcesses += $proc
                Write-Error "Process $($proc.ProcessName) (PID: $($proc.Id)) has died with exit code $($proc.ExitCode)"
            }
        }
        
        if ($deadProcesses.Count -gt 0) {
            Write-Error "Some processes have died, stopping all services"
            Stop-AllProcesses
            break
        }
        
        Start-Sleep -Seconds 5  # Check every 5 seconds
    }
}
catch {
    Write-Error "Error starting services: $_"
    Stop-AllProcesses
    exit 1
}
finally {
    if ($processes.Count -gt 0) {
        Stop-AllProcesses
    }
}