"""
SGM-FM - Reconciliation Validator (V2)
Realiza a validação cruzada entre Hourly e Daily usando a nova tabela fact_mpfm_production.
Conforme especificado em 05_validation_rules.md
"""
import sqlite3
import json
import logging
from datetime import datetime, date
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

# Mapeamento de métricas a serem somadas e comparadas
# (Nome Coluna Hourly, Nome Coluna Daily (mesmo nome na tabela unificada))
METRICS_MAP = [
    # MPFM Uncorrected
    ('uncorrected_mass_gas_t', 'uncorrected_mass_gas_t'),
    ('uncorrected_mass_oil_t', 'uncorrected_mass_oil_t'),
    ('uncorrected_mass_hc_t', 'uncorrected_mass_hc_t'),
    ('uncorrected_mass_water_t', 'uncorrected_mass_water_t'),
    ('uncorrected_mass_total_t', 'uncorrected_mass_total_t'),

    # MPFM Corrected
    ('corrected_mass_gas_t', 'corrected_mass_gas_t'),
    ('corrected_mass_oil_t', 'corrected_mass_oil_t'),
    ('corrected_mass_hc_t', 'corrected_mass_hc_t'),
    ('corrected_mass_water_t', 'corrected_mass_water_t'),
    ('corrected_mass_total_t', 'corrected_mass_total_t'),

    # PVT Reference
    ('pvt_ref_mass_gas_t', 'pvt_ref_mass_gas_t'),
    ('pvt_ref_mass_oil_t', 'pvt_ref_mass_oil_t'),
    
    # PVT Reference Volume
    ('pvt_ref_vol_gas_sm3', 'pvt_ref_vol_gas_sm3'),
    ('pvt_ref_vol_oil_sm3', 'pvt_ref_vol_oil_sm3'),
    
     # PVT Reference @20C
    ('pvt_ref_mass_20c_gas_t', 'pvt_ref_mass_20c_gas_t'),
    ('pvt_ref_mass_20c_oil_t', 'pvt_ref_mass_20c_oil_t'),
]

class ValidationStatus(str, Enum):
    PASS = "PASS"
    WARN = "WARN"
    FAIL = "FAIL"
    MISSING_DAILY = "MISSING_DAILY"
    MISSING_HOURLY = "MISSING_HOURLY"

@dataclass
class DailyValidationResult:
    business_date: str
    asset_tag: str
    metrics: Dict[str, Dict] = field(default_factory=dict)
    hourly_count: int = 0
    has_daily: bool = False
    validation_status: ValidationStatus = ValidationStatus.PASS

class ReconciliationValidatorV2:
    def __init__(self, db_path: str):
        self.db_path = db_path
        
        # Tolerâncias (hardcoded por enquanto, pode vir do DB)
        self.abs_tol_mass = 0.5 # toneladas
        self.pct_tol_mass = 0.005 # 0.5%
        self.abs_tol_vol = 1.0 # sm3
        self.pct_tol_vol = 0.005 # 0.5%

    def validate_date_range(self, start_date: date, end_date: date) -> List[DailyValidationResult]:
        """Valida um range de datas para todos os assets."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Buscar Assets ativos no período
        cursor.execute("""
            SELECT DISTINCT asset_tag 
            FROM fact_mpfm_production 
            WHERE business_date BETWEEN ? AND ?
        """, (start_date, end_date))
        
        assets = [r['asset_tag'] for r in cursor.fetchall()]
        results = []

        for asset in assets:
            # Para cada dia no range (simplificado: pegando dias com dados)
            cursor.execute("""
                SELECT DISTINCT business_date 
                FROM fact_mpfm_production 
                WHERE asset_tag = ? AND business_date BETWEEN ? AND ?
            """, (asset, start_date, end_date))
            
            dates = [r['business_date'] for r in cursor.fetchall()]
            
            for d_str in dates:
                res = self.validate_asset_day(cursor, asset, d_str)
                self.persist_result(cursor, res)
                results.append(res)
        
        conn.commit()
        conn.close()
        return results

    def validate_asset_day(self, cursor: sqlite3.Cursor, asset_tag: str, business_date: str) -> DailyValidationResult:
        result = DailyValidationResult(business_date=business_date, asset_tag=asset_tag)
        
        # 1. Obter Daily
        cursor.execute("""
            SELECT * FROM fact_mpfm_production 
            WHERE asset_tag = ? AND business_date = ? AND report_type = 'DAILY'
        """, (asset_tag, business_date))
        daily_row = cursor.fetchone()
        
        if daily_row:
            result.has_daily = True
            
        # 2. Obter Hourly Sum
        # Dynamically build SUM query
        sum_cols = [f"SUM({m[0]}) as sum_{m[0]}" for m in METRICS_MAP]
        query = f"""
            SELECT COUNT(*) as count, {', '.join(sum_cols)}
            FROM fact_mpfm_production
            WHERE asset_tag = ? AND business_date = ? AND report_type = 'HOURLY'
        """
        cursor.execute(query, (asset_tag, business_date))
        hourly_row = cursor.fetchone()
        
        result.hourly_count = hourly_row['count']
        
        # 3. Validar
        if not result.has_daily:
            result.validation_status = ValidationStatus.MISSING_DAILY
            return result
            
        if result.hourly_count < 24:
             # Pode ser parcial, mas vamos flagar warning se for muito baixo ou fail se zero
             if result.hourly_count == 0:
                 result.validation_status = ValidationStatus.MISSING_HOURLY
                 # No hourly data to compare
                 return result
        
        # Comparar métricas
        overall_status = ValidationStatus.PASS
        
        for metric_col, _ in METRICS_MAP:
            daily_val = daily_row[metric_col]
            sum_val = hourly_row[f"sum_{metric_col}"]
            
            # Skip if both None
            if daily_val is None and sum_val is None:
                continue
                
            # Treat None as 0 for comparison if one is missing? Or fail?
            # Standard: if one exists and other is None/Zero, it's a diff
            d = daily_val or 0.0
            h = sum_val or 0.0
            
            # Determine tolerance type
            is_vol = 'vol' in metric_col or 'sm3' in metric_col
            abs_tol = self.abs_tol_vol if is_vol else self.abs_tol_mass
            pct_tol = self.pct_tol_vol if is_vol else self.pct_tol_mass
            
            diff_abs = abs(d - h)
            # Avoid division by zero
            diff_pct = (diff_abs / d) if abs(d) > 1e-6 else (1.0 if diff_abs > abs_tol else 0.0)
            
            status = "PASS"
            if diff_abs > abs_tol and diff_pct > pct_tol:
                status = "FAIL"
                overall_status = ValidationStatus.FAIL
            elif diff_abs > (abs_tol * 0.8): # Near limit
                 status = "WARN"
                 if overall_status == ValidationStatus.PASS:
                     overall_status = ValidationStatus.WARN
            
            result.metrics[metric_col] = {
                "daily": d,
                "sum_hourly": h,
                "diff_abs": diff_abs,
                "diff_pct": diff_pct,
                "status": status
            }
            
        result.validation_status = overall_status
        return result

    def persist_result(self, cursor: sqlite3.Cursor, res: DailyValidationResult):
        # Update fact_reconciliation_daily
        # First, clear old validation for this day/asset
        cursor.execute("""
            DELETE FROM fact_reconciliation_daily
            WHERE business_date = ? AND asset_tag = ?
        """, (res.business_date, res.asset_tag))
        
        # Persist metrics status
        for metric, data in res.metrics.items():
            if data['status'] != 'PASS': # Only persist significant diffs or all? Spec says "PASS/WARN/FAIL".
                 cursor.execute("""
                    INSERT INTO fact_reconciliation_daily
                    (business_date, asset_tag, metric_name, daily_value, sum_hourly_value, diff_abs, diff_pct, status, details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 """, (
                     res.business_date, res.asset_tag, metric,
                     data['daily'], data['sum_hourly'], data['diff_abs'], data['diff_pct'],
                     data['status'], f"Reconciliação V2: {res.validation_status.value}"
                 ))
        
        # Also, we might want to update a "Completeness" table
        cursor.execute("""
            INSERT OR REPLACE INTO fact_completeness
            (date_ref, meter_tag, found_hourly, has_daily, status)
            VALUES (?, ?, ?, ?, ?)
        """, (res.business_date, res.asset_tag, res.hourly_count, 1 if res.has_daily else 0, res.validation_status.value))

