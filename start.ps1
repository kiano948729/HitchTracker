# Start HitchTracker (database + backend + frontend) in Docker.
#   .\start.ps1          bouwen en starten
#   .\start.ps1 -Down    alles stoppen
#   .\start.ps1 -Logs    logs volgen
param(
    [switch]$Down,
    [switch]$Logs
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker draait niet. Start Docker Desktop en probeer opnieuw.' }

if ($Down) { docker compose down; exit $LASTEXITCODE }
if ($Logs) { docker compose logs -f; exit $LASTEXITCODE }

docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw 'docker compose up is mislukt.' }

Write-Host 'Wachten tot de API reageert...'
$ok = $false
foreach ($i in 1..30) {
    try {
        Invoke-RestMethod http://localhost:5165/api/taxis/beschikbaar | Out-Null
        $ok = $true; break
    } catch { Start-Sleep -Seconds 2 }
}
if (-not $ok) { throw 'API reageert niet. Bekijk de logs met: .\start.ps1 -Logs' }

Write-Host ''
Write-Host 'Frontend: http://localhost:3000'
Write-Host 'Backend:  http://localhost:5165'
