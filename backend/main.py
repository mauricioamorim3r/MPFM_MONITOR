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
import sys
import re

# Adicionar caminho para módulos em docs
DOCS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../docs"))
if DOCS_PATH not in sys.path:
    sys.path.append(DOCS_PATH)

try:
    from MPFM_MONITOR.extractors.mpfm_pdf_parser import MPFMPDFParser, MPFMReportType, MPFMProductionData
except ImportError:
    # Fallback ou log de erro se não encontrar
    print("AVISO: MPFM_MONITOR.extractors não encontrado em docs/")
    MPFMPDFParser = None
    MPFMReportType = None

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
    
    # --- TABELAS DIMENSIONAIS (Schema Recomendado v7) ---

    # Tabela de Arquivos (dim_file)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dim_file (
            file_id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            file_hash_sha256 TEXT UNIQUE,
            file_type TEXT,
            file_size_bytes INTEGER,
            ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source_path TEXT,
            parser_version TEXT,
            status TEXT DEFAULT 'PROCESSED',
            error_message TEXT
        )
    """)

    # Tabela de Ativos (dim_asset_registry)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dim_asset_registry (
            asset_id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_tag TEXT NOT NULL UNIQUE,
            asset_label TEXT,
            asset_type TEXT,
            bank_expected INTEGER,
            stream_expected INTEGER,
            details_json TEXT,
            effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    """)

    # --- TABELAS FATO (Schema Recomendado v7) ---

    # Fato Produção MPFM (Unifica Daily e Hourly)
    # Cobre todos os campos do doc 02_field_map_mpfm_daily_hourly.md
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fact_mpfm_production (
            fact_id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER,
            asset_id INTEGER,
            asset_tag TEXT NOT NULL,
            report_type TEXT NOT NULL, -- 'DAILY' ou 'HOURLY'
            
            -- Tempo
            period_start TIMESTAMP NOT NULL,
            period_end TIMESTAMP NOT NULL,
            business_date DATE,
            
            -- Metadados
            bank INTEGER,
            stream INTEGER,
            riser_name TEXT,
            
            -- 1. MPFM Uncorrected Mass (t)
            uncorrected_mass_gas_t REAL,
            uncorrected_mass_oil_t REAL,
            uncorrected_mass_hc_t REAL,
            uncorrected_mass_water_t REAL,
            uncorrected_mass_total_t REAL,

            -- 2. MPFM Corrected Mass (t)
            corrected_mass_gas_t REAL,
            corrected_mass_oil_t REAL,
            corrected_mass_hc_t REAL,
            corrected_mass_water_t REAL,
            corrected_mass_total_t REAL,

            -- 3. PVT Reference Mass (t)
            pvt_ref_mass_gas_t REAL,
            pvt_ref_mass_oil_t REAL,
            pvt_ref_mass_water_t REAL,

            -- 4. PVT Reference Volume (Sm3)
            pvt_ref_vol_gas_sm3 REAL,
            pvt_ref_vol_oil_sm3 REAL,
            pvt_ref_vol_water_sm3 REAL,

            -- 5. PVT Reference Mass @20C (t)
            pvt_ref_mass_20c_gas_t REAL,
            pvt_ref_mass_20c_oil_t REAL,
            pvt_ref_mass_20c_water_t REAL,

            -- 6. PVT Reference Volume @20C (Sm3)
            pvt_ref_vol_20c_gas_sm3 REAL,
            pvt_ref_vol_20c_oil_sm3 REAL,
            pvt_ref_vol_20c_water_sm3 REAL,

            -- 7. Variações/Médias
            pressure_kpa REAL,
            temperature_c REAL,
            density_gas_kgm3 REAL,
            density_oil_kgm3 REAL,
            density_water_kgm3 REAL,

            quality_flags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY(file_id) REFERENCES dim_file(file_id),
            UNIQUE(asset_tag, period_end, report_type)
        )
    """)

    # Fato Calibração PVT (fact_pvt_calibration)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fact_pvt_calibration (
            cal_id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER,
            asset_tag TEXT,
            calibration_no INTEGER,
            
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            status TEXT,
            
            -- Fatores K (Used/New)
            k_oil_used REAL, k_oil_new REAL,
            k_gas_used REAL, k_gas_new REAL,
            k_water_used REAL, k_water_new REAL,
            k_hc_used REAL, k_hc_new REAL,

            -- Médias (MPFM vs Separator)
            mpfm_pressure_kpa REAL, sep_pressure_kpa REAL,
            mpfm_temp_c REAL, sep_temp_c REAL,
            
            mpfm_dens_oil_kgm3 REAL, sep_dens_oil_kgm3 REAL,
            mpfm_dens_gas_kgm3 REAL, sep_dens_gas_kgm3 REAL,
            mpfm_dens_water_kgm3 REAL, sep_dens_water_kgm3 REAL,

            -- Acumulados Mass (t)
            mpfm_accum_oil_t REAL, sep_accum_oil_t REAL,
            mpfm_accum_gas_t REAL, sep_accum_gas_t REAL,
            mpfm_accum_water_t REAL, sep_accum_water_t REAL,

            details_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY(file_id) REFERENCES dim_file(file_id),
            UNIQUE(calibration_no, asset_tag)
        )
    """)
    
    # Fato Reconciliação Diária (fact_reconciliation_daily)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fact_reconciliation_daily (
            rec_id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_date DATE NOT NULL,
            asset_tag TEXT NOT NULL,
            metric_name TEXT NOT NULL, -- ex: 'corrected_mass_oil_t'
            
            daily_value REAL,
            sum_hourly_value REAL,
            diff_abs REAL,
            diff_pct REAL,
            
            status TEXT, -- PASS, WARN, FAIL
            details TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(business_date, asset_tag, metric_name)
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

def classify_file(filename: str) -> FileType:
    lower = filename.lower()
    if filename.endswith(".zip"):
        return FileType.ZIP_BATCH
    if filename.endswith(".xml"):
        return FileType.XML_ANP
    if "daily" in lower and "mpfm" in lower:
        return FileType.MPFM_DAILY
    if "hourly" in lower and "mpfm" in lower:
        return FileType.MPFM_HOURLY
    if "pvt" in lower and "calibration" in lower:
        return FileType.PDF_CALIBRATION
    if "daily" in lower and ".xls" in lower:
        return FileType.EXCEL_DAILY
    return FileType.UNKNOWN

def insert_mpfm_production(cursor, record, file_id, report_type):
    prod = record.production
    if not prod: return

    cursor.execute("""
        INSERT OR REPLACE INTO fact_mpfm_production (
            file_id, asset_tag, report_type,
            period_start, period_end, business_date,
            bank, stream, riser_name,
            
            uncorrected_mass_gas_t, uncorrected_mass_oil_t, uncorrected_mass_hc_t, uncorrected_mass_water_t, uncorrected_mass_total_t,
            corrected_mass_gas_t, corrected_mass_oil_t, corrected_mass_hc_t, corrected_mass_water_t, corrected_mass_total_t,
            pvt_ref_mass_gas_t, pvt_ref_mass_oil_t, pvt_ref_mass_water_t,
            pvt_ref_vol_gas_sm3, pvt_ref_vol_oil_sm3, pvt_ref_vol_water_sm3,
            pvt_ref_mass_20c_gas_t, pvt_ref_mass_20c_oil_t, pvt_ref_mass_20c_water_t,
            pvt_ref_vol_20c_gas_sm3, pvt_ref_vol_20c_oil_sm3, pvt_ref_vol_20c_water_sm3,
            
            pressure_kpa, temperature_c,
            density_gas_kgm3, density_oil_kgm3, density_water_kgm3,
            quality_flags
        ) VALUES (
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?
        )
    """, (
        file_id, record.asset_tag, report_type,
        record.period_start, record.period_end, record.period_start.date(),
        record.bank, record.stream, record.riser_name,
        
        prod.uncorr_mass_gas, prod.uncorr_mass_oil, prod.uncorr_mass_hc, prod.uncorr_mass_water, prod.uncorr_mass_total,
        prod.corr_mass_gas, prod.corr_mass_oil, prod.corr_mass_hc, prod.corr_mass_water, prod.corr_mass_total,
        prod.pvt_ref_mass_gas, prod.pvt_ref_mass_oil, prod.pvt_ref_mass_water,
        prod.pvt_ref_vol_gas_sm3, prod.pvt_ref_vol_oil_sm3, prod.pvt_ref_vol_water_sm3,
        prod.pvt_ref_mass_20c_gas, prod.pvt_ref_mass_20c_oil, prod.pvt_ref_mass_20c_water,
        prod.pvt_ref_vol_20c_gas_sm3, prod.pvt_ref_vol_20c_oil_sm3, prod.pvt_ref_vol_20c_water_sm3,
        
        record.averages.pressure_kpa if record.averages else None,
        record.averages.temperature_c if record.averages else None,
        record.averages.density_gas if record.averages else None,
        record.averages.density_oil if record.averages else None,
        record.averages.density_water if record.averages else None,
        json.dumps(record.quality_flags)
    ))

def insert_pvt_calibration(cursor, record, file_id):
    cursor.execute("""
        INSERT OR REPLACE INTO fact_pvt_calibration (
            file_id, asset_tag, calibration_no,
            start_date, end_date, status,
            
            k_oil_used, k_oil_new,
            k_gas_used, k_gas_new,
            k_water_used, k_water_new,
            k_hc_used, k_hc_new,
            
            mpfm_pressure_kpa, sep_pressure_kpa,
            mpfm_temp_c, sep_temp_c,
            mpfm_dens_oil_kgm3, sep_dens_oil_kgm3,
            mpfm_dens_gas_kgm3, sep_dens_gas_kgm3,
            mpfm_dens_water_kgm3, sep_dens_water_kgm3,
            
            mpfm_accum_oil_t, sep_accum_oil_t,
            mpfm_accum_gas_t, sep_accum_gas_t,
            mpfm_accum_water_t, sep_accum_water_t
        ) VALUES (
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
        )
    """, (
        file_id, record.asset_tag, record.calibration_no,
        record.calibration_started, record.calibration_ended, record.status,
        
        record.k_factor_oil_used, record.k_factor_oil_new,
        record.k_factor_gas_used, record.k_factor_gas_new,
        record.k_factor_water_used, record.k_factor_water_new,
        record.k_factor_hc_used, record.k_factor_hc_new,
        
        record.avg_pressure_mpfm_kpa, record.avg_pressure_sep_kpa,
        record.avg_temperature_mpfm_c, record.avg_temperature_sep_c,
        record.avg_density_oil_mpfm, record.avg_density_oil_sep,
        record.avg_density_gas_mpfm, record.avg_density_gas_sep,
        record.avg_density_water_mpfm, record.avg_density_water_sep,
        
        record.accum_mass_oil_mpfm, record.accum_mass_oil_sep,
        record.accum_mass_gas_mpfm, record.accum_mass_gas_sep,
        record.accum_mass_water_mpfm, record.accum_mass_water_sep
    ))

def process_pdf_file(file_path: Path, file_id: int, conn: sqlite3.Connection):
    if not MPFMPDFParser:
        raise Exception("Módulo parser não carregado")
        
    parser = MPFMPDFParser(str(file_path))
    result = parser.extract()
    
    if not result.success:
        raise Exception(f"Erro no parser: {result.errors}")
    
    cursor = conn.cursor()
    
    for rec in result.hourly_records:
        insert_mpfm_production(cursor, rec, file_id, "HOURLY")
        
    for rec in result.daily_records:
        insert_mpfm_production(cursor, rec, file_id, "DAILY")
        
    for rec in result.calibration_records:
        insert_pvt_calibration(cursor, rec, file_id)

    conn.commit()

def process_zip_upload(zip_path: Path, batch_id: str, conn: sqlite3.Connection):
    """Processa arquivo ZIP contendo múltiplos relatórios."""
    with zipfile.ZipFile(zip_path, 'r') as z:
        for file_info in z.infolist():
            if file_info.filename.endswith('/') or file_info.filename.startswith('__MACOSX'):
                continue
                
            with tempfile.TemporaryDirectory() as temp_dir:
                extracted_path = Path(temp_dir) / Path(file_info.filename).name
                with open(extracted_path, 'wb') as f_out:
                    f_out.write(z.read(file_info.filename))
                
                f_type = classify_file(extracted_path.name)
                
                # Registrar no dim_file
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO dim_file (file_name, file_type, file_size_bytes, source_path)
                    VALUES (?, ?, ?, ?)
                """, (extracted_path.name, f_type.value, file_info.file_size, f"{batch_id}/{file_info.filename}"))
                file_id = cursor.lastrowid
                
                try:
                    if f_type in [FileType.MPFM_DAILY, FileType.MPFM_HOURLY, FileType.PDF_CALIBRATION]:
                        process_pdf_file(extracted_path, file_id, conn)
                        cursor.execute("UPDATE dim_file SET status = 'SUCCESS' WHERE file_id = ?", (file_id,))
                    else:
                        cursor.execute("UPDATE dim_file SET status = 'SKIPPED', error_message='Tipo não suportado' WHERE file_id = ?", (file_id,))
                except Exception as e:
                    cursor.execute("UPDATE dim_file SET status = 'ERROR', error_message = ? WHERE file_id = ?", (str(e), file_id))
                
                conn.commit()

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
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    content = b""
    
    try:
        # Salva arquivo
        file_path = Path(UPLOAD_FOLDER) / file.filename
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # 2. Classificação
        detected_type = classify_file(file.filename)
        if file_type is None:
            file_type = detected_type
        
        # 3. Hash e Batch ID
        file_hash = hashlib.sha256(content).hexdigest()
        batch_id = f"BATCH_{timestamp}" if file_type == FileType.ZIP_BATCH else None
        
        # 4. Registrar Staging
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO staged_file 
            (batch_id, file_name, file_type, file_size, file_hash, parse_status)
            VALUES (?, ?, ?, ?, ?, 'PENDING')
        """, (batch_id, file.filename, file_type.value if file_type else "UNKNOWN", len(content), file_hash))
        
        file_id = cursor.lastrowid
        conn.commit()
        
        extracted_count = 0
        warnings = []
        
        # 5. Processamento específico
        if file_type == FileType.ZIP_BATCH:
            process_zip_upload(file_path, batch_id, conn)
            extracted_count = -1 # Indica batch
        elif file_type in [FileType.MPFM_DAILY, FileType.MPFM_HOURLY, FileType.PDF_CALIBRATION]:
             process_pdf_file(file_path, file_id, conn)
             extracted_count = 1
             cursor.execute("UPDATE staged_file SET parse_status = 'SUCCESS' WHERE id = ?", (file_id,))
             conn.commit()

        return UploadResponse(
            success=True,
            file_name=file.filename,
            file_type=file_type,
            records_extracted=extracted_count,
            warnings=warnings,
            errors=[]
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro no upload: {str(e)}")

def detect_file_type(filename: str) -> Optional[FileType]:
    # Deprecated: use classify_file instead
    return classify_file(filename)

from backend.validators.reconciliation_v2 import ReconciliationValidatorV2

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

@app.post("/api/validate/run")
def run_validation(
    start_date: date,
    end_date: date,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Executa validação de reconciliação (V2) para um período."""
    validator = ReconciliationValidatorV2(DATABASE_PATH)
    try:
        results = validator.validate_date_range(start_date, end_date)
        
        # Resumo estatístico
        summary = {
            "total_checked": len(results),
            "pass": sum(1 for r in results if r.validation_status == "PASS"),
            "warn": sum(1 for r in results if r.validation_status == "WARN"),
            "fail": sum(1 for r in results if r.validation_status == "FAIL"),
            "missing": sum(1 for r in results if "MISSING" in r.validation_status)
        }
        
        return {"success": True, "summary": summary, "details_count": len(results)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
