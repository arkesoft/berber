$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Wait-Http([string] $Url) {
    $deadline = (Get-Date).AddSeconds(30)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { return }
        } catch {}
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw "Servis acilamadi: $Url. .local klasorundeki loglari kontrol edin."
}

function Test-Port([int] $Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.ConnectAsync('127.0.0.1', $Port)
        return ($connection.Wait(1000) -and $client.Connected)
    } catch { return $false }
    finally { $client.Dispose() }
}

function Start-LocalNode([string] $Name, [string[]] $NodeArguments, [string] $Directory) {
    $statePath = Join-Path $projectRoot ".local/$Name-process.json"
    if (Test-Path -LiteralPath $statePath) {
        $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        $existing = Get-Process -Id $state.id -ErrorAction SilentlyContinue
        if ($existing -and $existing.ProcessName -eq 'node' -and $existing.StartTime.ToUniversalTime().Ticks.ToString() -eq $state.started) {
            return
        }
    }
    $process = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList $NodeArguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot ".local/$Name.stdout.log") -RedirectStandardError (Join-Path $projectRoot ".local/$Name.stderr.log")
    @{ id = $process.Id; started = $process.StartTime.ToUniversalTime().Ticks.ToString() } | ConvertTo-Json | Set-Content -LiteralPath $statePath
}

foreach ($required in @('.local/local.env', '.local/pgdata/PG_VERSION', '.local/pgsql/bin/pg_ctl.exe', 'node_modules', 'backend/node_modules')) {
    if (!(Test-Path -LiteralPath $required)) {
        throw "Yerel kurulum eksik: $required. docs/quality/local-backend-testing.md dosyasina bakin."
    }
}

if (!(Test-Port 55432)) {
    & ./.local/pgsql/bin/pg_ctl.exe start -D .local/pgdata -l .local/postgres.log -o '-h 127.0.0.1 -p 55432' -w -t 20
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL baslatilamadi; .local/postgres.log dosyasina bakin.' }
}

if (!(Test-Port 3001)) {
    & npm.cmd --prefix backend run build
    if ($LASTEXITCODE -ne 0) { throw 'Backend derlenemedi.' }
    Start-LocalNode 'api' @('--env-file=../.local/local.env', '--enable-source-maps', 'dist/backend/src/server.js') (Join-Path $projectRoot 'backend')
}
Wait-Http 'http://127.0.0.1:3001/health/ready'

Start-LocalNode 'worker' @('--env-file=../.local/local.env', '--enable-source-maps', 'dist/backend/src/worker.js') (Join-Path $projectRoot 'backend')

if (!(Test-Port 5174)) {
    Start-LocalNode 'frontend' @('node_modules/@react-router/dev/bin.js', 'dev', '--mode', 'backend', '--host', '127.0.0.1', '--port', '5174', '--strictPort') $projectRoot
}
Wait-Http 'http://127.0.0.1:5174/giris'
Wait-Http 'http://127.0.0.1:5174/api/v1/catalog'

Write-Host 'Uygulama hazir: http://127.0.0.1:5174/giris'
Write-Host 'Yerel giris bilgileri: .local/local-accounts.json'
Write-Host 'Servisler arka planda calisir. Loglar: .local/*.log'
