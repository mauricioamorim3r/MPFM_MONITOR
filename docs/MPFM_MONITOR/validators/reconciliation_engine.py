"""
SGM-FM - Reconciliation Engine
Reconciliação Σ(24 Hourly) ↔ Daily

Baseado no PRD Pipeline Diário SGM-FM v6 - Passo 4
"""
import sqlite3
import json
import logging
from datetime import datetime, date, timedelta
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
from collections import defaultdict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============================================================================
# CONSTANTES E CONFIGURAÇÃO
# ============================================================================

class ReconciliationStatus(Enum):
    OK = "OK"
    WARN = "WARN"
    FAIL = "FAIL"
    INCOMPLETE = "INCOMPLETE"


# Métricas para reconciliação (por fase)
RECONCILIATION_METRICS = [
    ('uncorr_mass_gas', 'MPFM uncorrected mass - Gas'),
    ('uncorr_mass_oil', 'MPFM uncorrected mass - Oil'),
    ('uncorr_mass_hc', 'MPFM uncorrected mass - HC'),
    ('uncorr_mass_water', 'MPFM uncorrected mass - Water'),
    ('corr_mass_gas', 'MPFM corrected mass - Gas'),
    ('corr_mass_oil', 'MPFM corrected mass - Oil'),
    ('corr_mass_hc', 'MPFM corrected mass - HC'),
    ('corr_mass_water', 'MPFM corrected mass - Water'),
    ('corr_mass_total', 'MPFM corrected mass - Total'),
    ('pvt_ref_vol_gas_sm3', 'PVT reference volume - Gas'),
    ('pvt_ref_vol_oil_sm3', 'PVT reference volume - Oil'),
]

# Tolerâncias padrão (PRD: max(0.01 t, 0.0005 * daily) = 0.05%)
DEFAULT_TOLERANCE = {
    'absolute': 0.01,      # 0.01 t (10 kg)
    'relative': 0.0005,    # 0.05%
}


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class MetricComparison:
    """Comparação de uma métrica específica."""
    metric_name: str
    sum_hourly: Optional[float]
    daily_value: Optional[float]
    delta_abs: Optional[float]
    delta_pct: Optional[float]
    tolerance_applied: float
    status: ReconciliationStatus
    

@dataclass
class ReconciliationResult:
    """Resultado completo de reconciliação para um asset/dia."""
    asset_id: int
    asset_tag: str
    report_date: date
    
    # Contagem de arquivos
    hourly_count: int
    daily_count: int
    missing_hours: List[int]
    
    # Status geral
    overall_status: ReconciliationStatus
    
    # Comparações por métrica
    metrics: List[MetricComparison]
    
    # Métricas que falharam
    failed_metrics: List[str]
    
    # Quality flags
    quality_flags: List[str] = field(default_factory=list)


# ============================================================================
# CLASSE: ReconciliationEngine
# ============================================================================

class ReconciliationEngine:
    """
    Motor de reconciliação Hourly vs Daily.
    
    Regra PRD: abs(sum_hourly - daily) <= max(0.01 t, 0.0005 * daily)
    """
    
    def __init__(self, db_path: str, installation_id: int = 1):
        self.db_path = db_path
        self.installation_id = installation_id
        self.tolerance = self._load_tolerance()
    
    def _load_tolerance(self) -> Dict[str, float]:
        """Carrega tolerância do banco ou usa padrão."""
        tolerance = dict(DEFAULT_TOLERANCE)
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT warning_value, critical_value
                FROM operational_limit
                WHERE installation_id = ? AND parameter = 'RECONCILIATION'
            """, (self.installation_id,))
            
            row = cursor.fetchone()
            if row:
                tolerance['relative'] = row[1] / 100  # Converter % para decimal
            
            conn.close()
        except Exception as e:
            logger.warning(f"Erro ao carregar tolerância: {e}")
        
        return tolerance
    
    def _get_hourly_data(self, asset_id: int, report_date: date) -> Tuple[List[Dict], List[int]]:
        """
        Obtém dados hourly para um asset/dia.
        
        Returns:
            (lista de registros, lista de horas faltantes)
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT *
                FROM mpfm_hourly
                WHERE asset_id = ? AND report_date = ?
                ORDER BY hour_of_day
            """, (asset_id, report_date.isoformat()))
            
            records = [dict(row) for row in cursor.fetchall()]
            
            # Identificar horas faltantes
            found_hours = {r['hour_of_day'] for r in records}
            expected_hours = set(range(24))
            missing_hours = sorted(expected_hours - found_hours)
            
            return records, missing_hours
            
        finally:
            conn.close()
    
    def _get_daily_data(self, asset_id: int, report_date: date) -> Optional[Dict]:
        """Obtém registro daily para um asset/dia."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT *
                FROM mpfm_daily
                WHERE asset_id = ? AND report_date = ?
            """, (asset_id, report_date.isoformat()))
            
            row = cursor.fetchone()
            return dict(row) if row else None
            
        finally:
            conn.close()
    
    def _sum_hourly_metrics(self, hourly_records: List[Dict]) -> Dict[str, float]:
        """Soma métricas dos registros hourly."""
        sums = {}
        
        for metric, _ in RECONCILIATION_METRICS:
            total = 0.0
            has_value = False
            
            for record in hourly_records:
                value = record.get(metric)
                if value is not None:
                    total += value
                    has_value = True
            
            sums[metric] = total if has_value else None
        
        return sums
    
    def _compare_metric(self, metric_name: str, sum_hourly: Optional[float], 
                        daily_value: Optional[float]) -> MetricComparison:
        """Compara uma métrica específica."""
        
        # Casos especiais
        if sum_hourly is None and daily_value is None:
            return MetricComparison(
                metric_name=metric_name,
                sum_hourly=None,
                daily_value=None,
                delta_abs=None,
                delta_pct=None,
                tolerance_applied=0,
                status=ReconciliationStatus.OK
            )
        
        if sum_hourly is None or daily_value is None:
            return MetricComparison(
                metric_name=metric_name,
                sum_hourly=sum_hourly,
                daily_value=daily_value,
                delta_abs=None,
                delta_pct=None,
                tolerance_applied=0,
                status=ReconciliationStatus.INCOMPLETE
            )
        
        # Calcular delta
        delta_abs = abs(sum_hourly - daily_value)
        
        if daily_value != 0:
            delta_pct = delta_abs / abs(daily_value) * 100
        elif sum_hourly != 0:
            delta_pct = delta_abs / abs(sum_hourly) * 100
        else:
            delta_pct = 0
        
        # Calcular tolerância: max(0.01 t, 0.05% do daily)
        tolerance = max(
            self.tolerance['absolute'],
            abs(daily_value) * self.tolerance['relative']
        )
        
        # Determinar status
        if delta_abs <= tolerance:
            status = ReconciliationStatus.OK
        elif delta_abs <= tolerance * 2:
            status = ReconciliationStatus.WARN
        else:
            status = ReconciliationStatus.FAIL
        
        return MetricComparison(
            metric_name=metric_name,
            sum_hourly=sum_hourly,
            daily_value=daily_value,
            delta_abs=delta_abs,
            delta_pct=delta_pct,
            tolerance_applied=tolerance,
            status=status
        )
    
    def reconcile(self, asset_id: int, report_date: date) -> ReconciliationResult:
        """
        Executa reconciliação para um asset/dia.
        
        Args:
            asset_id: ID do asset
            report_date: Data do relatório
            
        Returns:
            ReconciliationResult com detalhes da reconciliação
        """
        # Obter asset_tag
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT asset_tag FROM asset_registry WHERE id = ?", (asset_id,))
        row = cursor.fetchone()
        asset_tag = row[0] if row else f"ASSET_{asset_id}"
        conn.close()
        
        # Obter dados
        hourly_records, missing_hours = self._get_hourly_data(asset_id, report_date)
        daily_record = self._get_daily_data(asset_id, report_date)
        
        # Inicializar resultado
        quality_flags = []
        
        # Verificar completude
        if len(hourly_records) < 24:
            quality_flags.append('batch_incomplete')
        
        if not daily_record:
            quality_flags.append('daily_missing')
        
        # Se não há dados suficientes
        if len(hourly_records) == 0 or not daily_record:
            return ReconciliationResult(
                asset_id=asset_id,
                asset_tag=asset_tag,
                report_date=report_date,
                hourly_count=len(hourly_records),
                daily_count=1 if daily_record else 0,
                missing_hours=missing_hours,
                overall_status=ReconciliationStatus.INCOMPLETE,
                metrics=[],
                failed_metrics=[],
                quality_flags=quality_flags
            )
        
        # Somar métricas hourly
        hourly_sums = self._sum_hourly_metrics(hourly_records)
        
        # Comparar cada métrica
        metrics = []
        failed_metrics = []
        
        for metric_name, description in RECONCILIATION_METRICS:
            comparison = self._compare_metric(
                metric_name,
                hourly_sums.get(metric_name),
                daily_record.get(metric_name)
            )
            metrics.append(comparison)
            
            if comparison.status == ReconciliationStatus.FAIL:
                failed_metrics.append(metric_name)
        
        # Determinar status geral
        if failed_metrics:
            overall_status = ReconciliationStatus.FAIL
            quality_flags.append('reconciliation_mismatch')
        elif any(m.status == ReconciliationStatus.WARN for m in metrics):
            overall_status = ReconciliationStatus.WARN
        elif missing_hours:
            overall_status = ReconciliationStatus.WARN
        else:
            overall_status = ReconciliationStatus.OK
        
        return ReconciliationResult(
            asset_id=asset_id,
            asset_tag=asset_tag,
            report_date=report_date,
            hourly_count=len(hourly_records),
            daily_count=1,
            missing_hours=missing_hours,
            overall_status=overall_status,
            metrics=metrics,
            failed_metrics=failed_metrics,
            quality_flags=quality_flags
        )
    
    def reconcile_all_assets(self, report_date: date) -> List[ReconciliationResult]:
        """Reconcilia todos os assets para uma data."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Encontrar todos os assets com dados hourly ou daily nessa data
        cursor.execute("""
            SELECT DISTINCT asset_id FROM (
                SELECT asset_id FROM mpfm_hourly WHERE report_date = ?
                UNION
                SELECT asset_id FROM mpfm_daily WHERE report_date = ?
            )
        """, (report_date.isoformat(), report_date.isoformat()))
        
        asset_ids = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        results = []
        for asset_id in asset_ids:
            result = self.reconcile(asset_id, report_date)
            results.append(result)
            
            logger.info(
                f"Reconciliação {result.asset_tag} @ {report_date}: "
                f"{result.overall_status.value} ({result.hourly_count}/24 hourly)"
            )
        
        return results
    
    def save_result(self, result: ReconciliationResult) -> int:
        """Salva resultado no banco."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Encontrar mpfm_daily_id se existir
            cursor.execute("""
                SELECT id FROM mpfm_daily WHERE asset_id = ? AND report_date = ?
            """, (result.asset_id, result.report_date.isoformat()))
            row = cursor.fetchone()
            mpfm_daily_id = row[0] if row else None
            
            # Calcular somatórios dos hourly
            sums = {}
            for metric in result.metrics:
                if metric.sum_hourly is not None:
                    sums[f"sum_hourly_{metric.metric_name}"] = metric.sum_hourly
            
            # Inserir/atualizar resultado
            cursor.execute("""
                INSERT OR REPLACE INTO reconciliation_result
                (asset_id, mpfm_daily_id, report_date,
                 sum_hourly_uncorr_gas, sum_hourly_uncorr_oil, sum_hourly_uncorr_hc,
                 sum_hourly_corr_gas, sum_hourly_corr_oil, sum_hourly_corr_hc,
                 delta_uncorr_hc_abs, delta_uncorr_hc_pct, delta_corr_hc_abs, delta_corr_hc_pct,
                 status, failed_metrics)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result.asset_id,
                mpfm_daily_id,
                result.report_date.isoformat(),
                sums.get('sum_hourly_uncorr_mass_gas'),
                sums.get('sum_hourly_uncorr_mass_oil'),
                sums.get('sum_hourly_uncorr_mass_hc'),
                sums.get('sum_hourly_corr_mass_gas'),
                sums.get('sum_hourly_corr_mass_oil'),
                sums.get('sum_hourly_corr_mass_hc'),
                next((m.delta_abs for m in result.metrics if m.metric_name == 'uncorr_mass_hc'), None),
                next((m.delta_pct for m in result.metrics if m.metric_name == 'uncorr_mass_hc'), None),
                next((m.delta_abs for m in result.metrics if m.metric_name == 'corr_mass_hc'), None),
                next((m.delta_pct for m in result.metrics if m.metric_name == 'corr_mass_hc'), None),
                result.overall_status.value,
                json.dumps(result.failed_metrics) if result.failed_metrics else None
            ))
            
            conn.commit()
            return cursor.lastrowid
            
        finally:
            conn.close()
    
    def get_summary(self, start_date: date, end_date: date) -> Dict:
        """Retorna resumo de reconciliações no período."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        summary = {
            'period': {'start': start_date.isoformat(), 'end': end_date.isoformat()},
            'total': 0,
            'by_status': {},
            'assets_with_issues': []
        }
        
        try:
            cursor.execute("""
                SELECT status, COUNT(*) as cnt
                FROM reconciliation_result
                WHERE report_date BETWEEN ? AND ?
                GROUP BY status
            """, (start_date.isoformat(), end_date.isoformat()))
            
            for row in cursor.fetchall():
                summary['by_status'][row[0]] = row[1]
                summary['total'] += row[1]
            
            # Assets com problemas
            cursor.execute("""
                SELECT DISTINCT ar.asset_tag, rr.status, COUNT(*) as days_with_issue
                FROM reconciliation_result rr
                JOIN asset_registry ar ON rr.asset_id = ar.id
                WHERE rr.report_date BETWEEN ? AND ?
                AND rr.status IN ('FAIL', 'WARN')
                GROUP BY ar.asset_tag, rr.status
                ORDER BY days_with_issue DESC
            """, (start_date.isoformat(), end_date.isoformat()))
            
            for row in cursor.fetchall():
                summary['assets_with_issues'].append({
                    'asset_tag': row[0],
                    'status': row[1],
                    'days': row[2]
                })
            
        finally:
            conn.close()
        
        return summary


# ============================================================================
# FUNÇÕES DE CONVENIÊNCIA
# ============================================================================

def reconcile_date(db_path: str, report_date: date, save: bool = True) -> List[ReconciliationResult]:
    """Reconcilia todos os assets para uma data."""
    engine = ReconciliationEngine(db_path)
    results = engine.reconcile_all_assets(report_date)
    
    if save:
        for result in results:
            engine.save_result(result)
    
    return results


def reconcile_date_range(db_path: str, start_date: date, end_date: date) -> Dict:
    """Reconcilia um range de datas."""
    engine = ReconciliationEngine(db_path)
    
    all_results = []
    current = start_date
    
    while current <= end_date:
        results = engine.reconcile_all_assets(current)
        for result in results:
            engine.save_result(result)
        all_results.extend(results)
        current += timedelta(days=1)
    
    return engine.get_summary(start_date, end_date)


# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    import sys
    
    db_path = sys.argv[1] if len(sys.argv) > 1 else "database/mpfm_monitor.db"
    
    # Reconciliar ontem
    yesterday = date.today() - timedelta(days=1)
    
    print(f"\n⚖️  Reconciliação Hourly vs Daily - {yesterday}")
    print("=" * 60)
    
    engine = ReconciliationEngine(db_path)
    results = engine.reconcile_all_assets(yesterday)
    
    if not results:
        print("Nenhum dado para reconciliar")
    else:
        for result in results:
            status_icon = {
                ReconciliationStatus.OK: '✅',
                ReconciliationStatus.WARN: '⚠️',
                ReconciliationStatus.FAIL: '❌',
                ReconciliationStatus.INCOMPLETE: '❓'
            }.get(result.overall_status, '•')
            
            print(f"\n{status_icon} {result.asset_tag}")
            print(f"   Hourly: {result.hourly_count}/24")
            print(f"   Daily: {result.daily_count}")
            
            if result.missing_hours:
                print(f"   Horas faltantes: {result.missing_hours[:10]}...")
            
            if result.failed_metrics:
                print(f"   Métricas com falha: {result.failed_metrics}")
            
            # Mostrar algumas métricas
            for metric in result.metrics[:3]:
                if metric.delta_abs is not None:
                    print(f"   {metric.metric_name}: Σ={metric.sum_hourly:.3f}, D={metric.daily_value:.3f}, Δ={metric.delta_pct:.3f}%")
            
            # Salvar
            engine.save_result(result)
    
    # Resumo
    print("\n📊 Resumo:")
    summary = engine.get_summary(yesterday - timedelta(days=7), yesterday)
    print(f"   Por status: {summary['by_status']}")
