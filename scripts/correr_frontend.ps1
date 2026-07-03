# Arranca el frontend — dejar esta terminal abierta
# Desde: frontend-analitica
#   .\scripts\correr_frontend.ps1

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path ".\.env")) {
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "Creado .env desde .env.example"
}

if (-not (Test-Path ".\node_modules")) {
    Write-Host "Instalando dependencias npm..."
    npm install
}

Write-Host "App en http://localhost:5173" -ForegroundColor Green
npm run dev
