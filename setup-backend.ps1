# MPFM Monitor - Backend Setup Script
Write-Host "MPFM Monitor - Backend Setup" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Verificar Python
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro: Python nao encontrado. Instale Python 3.10+" -ForegroundColor Red
    exit 1
}
Write-Host "Python: $pythonVersion" -ForegroundColor Green

# Criar ambiente virtual
if (-not (Test-Path "backend\.venv")) {
    Write-Host "Criando ambiente virtual..." -ForegroundColor Yellow
    python -m venv backend\.venv
}

# Ativar ambiente
Write-Host "Ativando ambiente virtual..." -ForegroundColor Yellow
& backend\.venv\Scripts\Activate.ps1

# Instalar dependencias
Write-Host "Instalando dependencias..." -ForegroundColor Yellow
pip install -r backend\requirements.txt

# Criar pastas
Write-Host "Criando pastas de dados..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "backend\data\uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "backend\data\exports" | Out-Null

Write-Host "`nSetup concluido!" -ForegroundColor Green
Write-Host "`nPara iniciar o backend:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  python main.py" -ForegroundColor White
Write-Host "`nOu com uvicorn (hot reload):" -ForegroundColor Cyan
Write-Host "  uvicorn main:app --reload --port 8000" -ForegroundColor White
Write-Host "`nDocumentacao da API:" -ForegroundColor Cyan
Write-Host "  http://localhost:8000/api/docs" -ForegroundColor White
