"""
MPFM Monitor - Backend FastAPI
API REST para integração com frontend React
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from enum import Enum
import sqlite3
import json
import os
import zipfile
import tempfile
import hashlib
from pathlib import Path
import re

# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

DATABASE_PATH = os.environ.get("DATABASE_PATH", "data/mpfm_monitor.db")
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "data/uploads")
EXPORT_FOLDER = os.environ.get("EXPORT_FOLDER", "data/exports")

# Criar pastas se não existirem
Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
Path(EXPORT_FOLDER).mkdir(parents=True, exist_ok=True)

# ============================================================================
# APP E CORS
# ============================================================================

app = FastAPI(
    title="MPFM Monitor API",
    description="API REST para Sistema de Gestão de Medição Fiscal Multifásica",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS para desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# ENUMS E MODELOS
# ============================================================================

class FileType(str, Enum):
    EXCEL_DAILY = "EXCEL_DAILY"
    PDF_TOPSIDE = "PDF_TOPSIDE"
    PDF_SUBSEA = "PDF_SUBSEA"
    PDF_SEPARATOR = "PDF_SEPARATOR"
    PDF_CALIBRATION = "PDF_CALIBRATION"
    MPFM_HOURLY = "MPFM_HOURLY"
    MPFM_DAILY = "MPFM_DAILY"
    PVT_CALIB = "PVT_CALIB"
    XML_ANP = "XML_ANP"
    ZIP_BATCH = "ZIP_BATCH"
    UNKNOWN = "UNKNOWN"

class SourceType(str, Enum):
    TOPSIDE = "TOPSIDE"
    SUBSEA = "SUBSEA"
    SEPARATOR = "SEPARATOR"

class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"

class ValidationClassification(str, Enum):
    CONSISTENTE = "CONSISTENTE"
    ACEITAVEL = "ACEITAVEL"
    INCONSISTENTE = "INCONSISTENTE"
    FONTE_UNICA = "FONTE_UNICA"
    SEM_DADOS = "SEM_DADOS"

# ============================================================================
# SCHEMAS PYDANTIC
# ============================================================================

class DailyMeasurement(BaseModel):
    date: date
    source: SourceType
    asset_tag: str
    oil: Optional[float] = None
    gas: Optional[float] = None
    water: Optional[float] = None
    hc: Optional[float] = None
    total: Optional[float] = None
    bsw: Optional[float] = None
    k_oil: Optional[float] = None
    k_gas: Optional[float] = None
    k_water: Optional[float] = None

class CalibrationRecord(BaseModel):
    calibration_no: int
    asset_tag: str
    start_date: datetime
    end_date: datetime
    k_oil_used: float
    k_oil_new: float
    k_gas_used: float
    k_gas_new: float
    k_water_used: float
    k_water_new: float
    status: str

class AlertCreate(BaseModel):
    meter_tag: str
    category: str
    severity: AlertSeverity
    title: str
    description: str
    value: Optional[float] = None
    threshold: Optional[float] = None

class AlertResponse(BaseModel):
    id: int
    timestamp: datetime
    meter_tag: Optional[str]
    category: str
    severity: AlertSeverity
    title: str
    description: str
    acknowledged: bool
    resolved: bool

class ValidationResult(BaseModel):
    variable_code: str
    date_ref: date
    asset_tag: str
    excel_value: Optional[float]
    pdf_value: Optional[float]
    deviation_pct: Optional[float]
    classification: ValidationClassification

class UploadResponse(BaseModel):
    success: bool
    file_name: str
    file_type: FileType
    records_extracted: int
    warnings: List[str]
    errors: List[str]

class StatusResponse(BaseModel):
    status: str
    database: str
    tables_count: int
    last_import: Optional[datetime]
    alerts_active: int

# ============================================================================
# DATABASE
# ============================================================================

def get_db():
    """Obtém conexão com banco de dados."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_database():
    """Inicializa banco de dados com schema básico."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Tabela de medições diárias
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_measurement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            source TEXT NOT NULL,
            asset_tag TEXT NOT NULL,
            oil REAL,
            gas REAL,
            water REAL,
            hc REAL,
            total REAL,
            bsw REAL,
            k_oil REAL,
            k_gas REAL,
            k_water REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(date, source, asset_tag)
        )
    """)
    
    # Tabela de calibrações
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS calibration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            calibration_no INTEGER NOT NULL,
            asset_tag TEXT NOT NULL,
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            k_oil_used REAL,
            k_oil_new REAL,
            k_gas_used REAL,
            k_gas_new REAL,
            k_water_used REAL,
            k_water_new REAL,
            status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(calibration_no, asset_tag)
        )
    """)
    
    # Tabela de alertas
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alert (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            meter_tag TEXT,
            category TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            value REAL,
            threshold REAL,
            acknowledged INTEGER DEFAULT 0,
            acknowledged_by TEXT,
            acknowledged_at TIMESTAMP,
            resolved INTEGER DEFAULT 0,
            resolved_at TIMESTAMP,
            resolution_note TEXT
        )
    """)
    
    # Tabela de validação cruzada
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cross_validation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date_ref DATE NOT NULL,
            asset_tag TEXT NOT NULL,
            variable_code TEXT NOT NULL,
            excel_value REAL,
            pdf_value REAL,
            xml_value REAL,
            deviation_abs REAL,
            deviation_pct REAL,
            classification TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(date_ref, asset_tag, variable_code)
        )
    """)
    
    # Tabela de arquivos importados
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS staged_file (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id TEXT,
            file_name TEXT NOT NULL,
            original_path TEXT,
            file_type TEXT NOT NULL,
            file_size INTEGER,
            file_hash TEXT,
            parse_status TEXT DEFAULT 'PENDING',
            records_extracted INTEGER DEFAULT 0,
            warnings TEXT,
            errors TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # --- NOVAS TABELAS V2 (Modelo Normalizado) ---

    # Fatos Horários (MPFM Hourly)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fact_mpfm_hourly (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meter_tag TEXT NOT NULL,
            period_end TIMESTAMP NOT NULL,
            period_start TIMESTAMP,
            phase TEXT,
            uncorrected_mass REAL,
            corrected_mass REAL,
            pvt_ref_mass REAL,
            pvt_ref_vol REAL,
            avg_pressure REAL,
            avg_temp REAL,
            avg_density REAL,
            source_file_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(meter_tag, period_end, phase)
        )
    """)

    # Matriz de Completude (Completeness Matrix)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fact_completeness (
            date_ref DATE NOT NULL,
            meter_tag TEXT NOT NULL,
            expected_hourly INTEGER DEFAULT 24,
            found_hourly INTEGER DEFAULT 0,
            has_daily INTEGER DEFAULT 0,
            missing_hours TEXT,
            status TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (date_ref, meter_tag)
        )
    """)
    
    conn.commit()
    conn.close()

# Inicializa banco na startup
init_database()

# ============================================================================
# ENDPOINTS - STATUS
# ============================================================================

@app.get("/api/status", response_model=StatusResponse)
def get_status(conn: sqlite3.Connection = Depends(get_db)):
    """Retorna status do sistema."""
    cursor = conn.cursor()
    
    # Conta tabelas
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
    tables_count = cursor.fetchone()[0]
    
    # Última importação
    cursor.execute("SELECT MAX(created_at) FROM staged_file")
    last_import = cursor.fetchone()[0]
    
    # Alertas ativos
    cursor.execute("SELECT COUNT(*) FROM alert WHERE resolved = 0")
    alerts_active = cursor.fetchone()[0]
    
    return StatusResponse(
        status="online",
        database=DATABASE_PATH,
        tables_count=tables_count,
        last_import=last_import,
        alerts_active=alerts_active
    )

@app.get("/api/health")
def health_check():
    """Health check para monitoring."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# ============================================================================
# ENDPOINTS - MEDIÇÕES DIÁRIAS
# ============================================================================

@app.get("/api/measurements/daily", response_model=List[Dict[str, Any]])
def get_daily_measurements(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    source: Optional[SourceType] = None,
    asset_tag: Optional[str] = None,
    limit: int = Query(100, le=1000),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Lista medições diárias com filtros."""
    cursor = conn.cursor()
    
    query = "SELECT * FROM daily_measurement WHERE 1=1"
    params = []
    
    if start_date:
        query += " AND date >= ?"
        params.append(start_date.isoformat())
    
    if end_date:
        query += " AND date <= ?"
        params.append(end_date.isoformat())
    
    if source:
        query += " AND source = ?"
        params.append(source.value)
    
    if asset_tag:
        query += " AND asset_tag = ?"
        params.append(asset_tag)
    
    query += f" ORDER BY date DESC LIMIT {limit}"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    return [dict(row) for row in rows]

@app.post("/api/measurements/daily", response_model=Dict[str, Any])
def create_daily_measurement(
    measurement: DailyMeasurement,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Cria ou atualiza medição diária."""
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO daily_measurement 
            (date, source, asset_tag, oil, gas, water, hc, total, bsw, k_oil, k_gas, k_water)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            measurement.date.isoformat(),
            measurement.source.value,
            measurement.asset_tag,
            measurement.oil,
            measurement.gas,
            measurement.water,
            measurement.hc,
            measurement.total,
            measurement.bsw,
            measurement.k_oil,
            measurement.k_gas,
            measurement.k_water
        ))
        conn.commit()
        
        return {"success": True, "id": cursor.lastrowid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/measurements/summary")
def get_measurements_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Retorna resumo de medições por fonte."""
    cursor = conn.cursor()
    
    query = """
        SELECT 
            source,
            COUNT(*) as count,
            AVG(oil) as avg_oil,
            AVG(gas) as avg_gas,
            AVG(water) as avg_water,
            AVG(hc) as avg_hc,
            AVG(bsw) as avg_bsw,
            MIN(date) as first_date,
            MAX(date) as last_date
        FROM daily_measurement
        WHERE 1=1
    """
    params = []
    
    if start_date:
        query += " AND date >= ?"
        params.append(start_date.isoformat())
    
    if end_date:
        query += " AND date <= ?"
        params.append(end_date.isoformat())
    
    query += " GROUP BY source"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    return [dict(row) for row in rows]

# ============================================================================
# ENDPOINTS - CALIBRAÇÕES
# ============================================================================

@app.get("/api/calibrations", response_model=List[Dict[str, Any]])
def get_calibrations(
    asset_tag: Optional[str] = None,
    limit: int = Query(50, le=200),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Lista calibrações."""
    cursor = conn.cursor()
    
    query = "SELECT * FROM calibration WHERE 1=1"
    params = []
    
    if asset_tag:
        query += " AND asset_tag = ?"
        params.append(asset_tag)
    
    query += f" ORDER BY start_date DESC LIMIT {limit}"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    return [dict(row) for row in rows]

@app.post("/api/calibrations", response_model=Dict[str, Any])
def create_calibration(
    calibration: CalibrationRecord,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Cria registro de calibração."""
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO calibration 
            (calibration_no, asset_tag, start_date, end_date, 
             k_oil_used, k_oil_new, k_gas_used, k_gas_new, k_water_used, k_water_new, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            calibration.calibration_no,
            calibration.asset_tag,
            calibration.start_date.isoformat(),
            calibration.end_date.isoformat(),
            calibration.k_oil_used,
            calibration.k_oil_new,
            calibration.k_gas_used,
            calibration.k_gas_new,
            calibration.k_water_used,
            calibration.k_water_new,
            calibration.status
        ))
        conn.commit()
        
        return {"success": True, "id": cursor.lastrowid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# ENDPOINTS - ALERTAS
# ============================================================================

@app.get("/api/alerts", response_model=List[Dict[str, Any]])
def get_alerts(
    severity: Optional[AlertSeverity] = None,
    category: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = Query(100, le=500),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Lista alertas com filtros."""
    cursor = conn.cursor()
    
    query = "SELECT * FROM alert WHERE 1=1"
    params = []
    
    if severity:
        query += " AND severity = ?"
        params.append(severity.value)
    
    if category:
        query += " AND category = ?"
        params.append(category)
    
    if resolved is not None:
        query += " AND resolved = ?"
        params.append(1 if resolved else 0)
    
    query += f" ORDER BY timestamp DESC LIMIT {limit}"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    return [dict(row) for row in rows]

@app.get("/api/alerts/active", response_model=List[Dict[str, Any]])
def get_active_alerts(conn: sqlite3.Connection = Depends(get_db)):
    """Lista apenas alertas ativos (não resolvidos)."""
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM alert 
        WHERE resolved = 0 
        ORDER BY 
            CASE severity 
                WHEN 'critical' THEN 1 
                WHEN 'warning' THEN 2 
                ELSE 3 
            END,
            timestamp DESC
    """)
    rows = cursor.fetchall()
    
    return [dict(row) for row in rows]

@app.post("/api/alerts", response_model=Dict[str, Any])
def create_alert(
    alert: AlertCreate,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Cria novo alerta."""
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO alert (meter_tag, category, severity, title, description, value, threshold)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        alert.meter_tag,
        alert.category,
        alert.severity.value,
        alert.title,
        alert.description,
        alert.value,
        alert.threshold
    ))
    conn.commit()
    
    return {"success": True, "id": cursor.lastrowid}

@app.put("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    user_id: str = Query(...),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Reconhece um alerta."""
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE alert 
        SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (user_id, alert_id))
    conn.commit()
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    return {"success": True}

@app.put("/api/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    note: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Resolve um alerta."""
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE alert 
        SET resolved = 1, resolved_at = CURRENT_TIMESTAMP, resolution_note = ?
        WHERE id = ?
    """, (note, alert_id))
    conn.commit()
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    return {"success": True}

# ============================================================================
# ENDPOINTS - VALIDAÇÃO CRUZADA
# ============================================================================

@app.get("/api/validation/cross", response_model=List[Dict[str, Any]])
def get_cross_validations(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    classification: Optional[ValidationClassification] = None,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Lista resultados de validação cruzada."""
    cursor = conn.cursor()
    
    query = "SELECT * FROM cross_validation WHERE 1=1"
    params = []
    
    if start_date:
        query += " AND date_ref >= ?"
        params.append(start_date.isoformat())
    
    if end_date:
        query += " AND date_ref <= ?"
        params.append(end_date.isoformat())
    
    if classification:
        query += " AND classification = ?"
        params.append(classification.value)
    
    query += " ORDER BY date_ref DESC, variable_code"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    return [dict(row) for row in rows]

@app.get("/api/validation/summary")
def get_validation_summary(
    date_ref: date,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Retorna resumo de validação para uma data."""
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            classification,
            COUNT(*) as count
        FROM cross_validation
        WHERE date_ref = ?
        GROUP BY classification
    """, (date_ref.isoformat(),))
    
    rows = cursor.fetchall()
    
    summary = {
        "date": date_ref.isoformat(),
        "CONSISTENTE": 0,
        "ACEITAVEL": 0,
        "INCONSISTENTE": 0,
        "FONTE_UNICA": 0,
        "SEM_DADOS": 0
    }
    
    for row in rows:
        summary[row["classification"]] = row["count"]
    
    # Define status geral
    if summary["INCONSISTENTE"] > 0:
        summary["overall_status"] = "CRITICAL"
    elif summary["ACEITAVEL"] > 0:
        summary["overall_status"] = "WARNING"
    else:
        summary["overall_status"] = "OK"
    
    return summary

# ============================================================================
# ENDPOINTS - UPLOAD DE ARQUIVOS
# ============================================================================

@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    file_type: Optional[FileType] = None,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Upload de arquivo para processamento."""
    try:
        # Salva arquivo
        file_path = Path(UPLOAD_FOLDER) / file.filename
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

    # 2. Classificação
    file_type = classify_file(file.filename)
    
    # 3. Hash e Batch ID
    file_hash = hashlib.sha256(content).hexdigest()
    batch_id = f"BATCH_{timestamp}" if file_type == FileType.ZIP_BATCH else None
    
    # 4. Registrar Staging
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO staged_file 
        (batch_id, file_name, file_type, file_size, file_hash, parse_status)
        VALUES (?, ?, ?, ?, ?, 'PENDING')
    """, (batch_id, file.filename, file_type, len(content), file_hash))
    
    file_id = cursor.lastrowid
    conn.commit()
    
    extracted_count = 0
    warnings = []
    
    # 5. Processamento específico
    if file_type == FileType.ZIP_BATCH:
        try:
            process_zip_upload(file_path, batch_id, conn)
            extracted_count = -1 # Indica batch
        except Exception as e:
            cursor.execute("UPDATE staged_file SET parse_status = 'ERROR', errors = ? WHERE id = ?", (str(e), file_id))
            conn.commit()
            raise HTTPException(status_code=500, detail=f"Erro processando ZIP: {str(e)}")

    return UploadResponse(
        success=True,
        file_name=file.filename,
        file_type=file_type,
        records_extracted=extracted_count,
        warnings=warnings,
        errors=[]
    )

def detect_file_type(filename: str) -> Optional[FileType]:
    # Deprecated: use classify_file instead
    return classify_file(filename)

# ============================================================================
# ENDPOINTS - EXPORTAÇÃO
# ============================================================================

@app.get("/api/export/daily-report")
def export_daily_report(
    date_ref: date,
    format: str = Query("json", regex="^(json|csv|excel)$"),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Exporta relatório diário."""
    cursor = conn.cursor()
    
    # Busca medições
    cursor.execute("""
        SELECT * FROM daily_measurement WHERE date = ?
    """, (date_ref.isoformat(),))
    measurements = [dict(row) for row in cursor.fetchall()]
    
    # Busca validações
    cursor.execute("""
        SELECT * FROM cross_validation WHERE date_ref = ?
    """, (date_ref.isoformat(),))
    validations = [dict(row) for row in cursor.fetchall()]
    
    # Busca alertas do dia
    cursor.execute("""
        SELECT * FROM alert WHERE DATE(timestamp) = ?
    """, (date_ref.isoformat(),))
    alerts = [dict(row) for row in cursor.fetchall()]
    
    report = {
        "date": date_ref.isoformat(),
        "generated_at": datetime.now().isoformat(),
        "measurements": measurements,
        "validations": validations,
        "alerts": alerts
    }
    
    if format == "json":
        return report
    else:
        # TODO: Implementar CSV e Excel
        return report

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
