"""
MPFM Monitor - Daily Analyzer
Análise de dados diários e geração de alertas.
"""
import sqlite3
import logging
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AlertType(Enum):
    BSW_HIGH = "BSW_HIGH"
    TOC_HIGH = "TOC_HIGH"
    GAS_BALANCE_ERROR = "GAS_BALANCE_ERROR"
    PRODUCTION_VARIATION = "PRODUCTION_VARIATION"
    MISSING_DATA = "MISSING_DATA"
    API_OUT_OF_RANGE = "API_OUT_OF_RANGE"
    METER_FACTOR_CHANGE = "METER_FACTOR_CHANGE"
    TOTALIZER_GAP = "TOTALIZER_GAP"
    WATER_CUT_HIGH = "WATER_CUT_HIGH"
    FLARE_HIGH = "FLARE_HIGH"


@dataclass
class Alert:
    """Alerta gerado."""
    alert_type: AlertType
    severity: AlertSeverity
    parameter: str
    current_value: float
    limit_value: float
    unit: str
    message: str
    meter_id: Optional[int] = None


class DailyAnalyzer:
    """
    Analisador de dados diários.
    Executa validações e gera alertas.
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.limits = self._load_limits()
    
    def _load_limits(self) -> Dict[str, Dict]:
        """Carrega limites operacionais do banco."""
        limits = {}
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT parameter, warning_value, critical_value, unit, description
                FROM operational_limit
                WHERE is_active = TRUE
            """)
            
            for row in cursor.fetchall():
                limits[row[0]] = {
                    'warning': row[1],
                    'critical': row[2],
                    'unit': row[3],
                    'description': row[4]
                }
        except Exception as e:
            logger.warning(f"Erro ao carregar limites: {e}")
        finally:
            conn.close()
        
        return limits
    
    def analyze_snapshot(self, snapshot_id: int) -> List[Alert]:
        """
        Analisa um snapshot diário e retorna alertas.
        
        Args:
            snapshot_id: ID do snapshot
            
        Returns:
            Lista de alertas gerados
        """
        alerts = []
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            # Verificar BSW
            alerts.extend(self._check_bsw(cursor, snapshot_id))
            
            # Verificar balanço de gás
            alerts.extend(self._check_gas_balance(cursor, snapshot_id))
            
            # Verificar variação de produção
            alerts.extend(self._check_production_variation(cursor, snapshot_id))
            
            # Verificar dados faltantes
            alerts.extend(self._check_missing_data(cursor, snapshot_id))
            
            # Salvar alertas no banco
            self._save_alerts(cursor, snapshot_id, alerts)
            conn.commit()
            
        except Exception as e:
            logger.exception("Erro na análise do snapshot")
        finally:
            conn.close()
        
        return alerts
    
    def _check_bsw(self, cursor, snapshot_id: int) -> List[Alert]:
        """Verifica valores de BSW."""
        alerts = []
        
        cursor.execute("""
            SELECT dm.meter_id, m.tag, dm.value, dm.unit
            FROM daily_measurement dm
            JOIN meter m ON dm.meter_id = m.id
            WHERE dm.snapshot_id = ? 
            AND dm.variable_code LIKE '%bsw%'
            AND dm.value IS NOT NULL
        """, (snapshot_id,))
        
        limit = self.limits.get('BSW', {'warning': 30, 'critical': 50})
        
        for row in cursor.fetchall():
            value = row['value']
            tag = row['tag']
            
            if value >= limit['critical']:
                alerts.append(Alert(
                    alert_type=AlertType.BSW_HIGH,
                    severity=AlertSeverity.CRITICAL,
                    parameter='BSW',
                    current_value=value,
                    limit_value=limit['critical'],
                    unit='%',
                    message=f"BSW CRÍTICO em {tag}: {value:.1f}% (limite: {limit['critical']}%)",
                    meter_id=row['meter_id']
                ))
            elif value >= limit['warning']:
                alerts.append(Alert(
                    alert_type=AlertType.BSW_HIGH,
                    severity=AlertSeverity.WARNING,
                    parameter='BSW',
                    current_value=value,
                    limit_value=limit['warning'],
                    unit='%',
                    message=f"BSW elevado em {tag}: {value:.1f}% (alerta: {limit['warning']}%)",
                    meter_id=row['meter_id']
                ))
        
        return alerts
    
    def _check_gas_balance(self, cursor, snapshot_id: int) -> List[Alert]:
        """Verifica fechamento do balanço de gás."""
        alerts = []
        
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN line_sign = '+' THEN pd_value ELSE 0 END) as entradas,
                SUM(CASE WHEN line_sign = '-' THEN pd_value ELSE 0 END) as saidas,
                MAX(CASE WHEN line_sign = 'TOTAL' THEN pd_value END) as total_declarado
            FROM gas_balance
            WHERE snapshot_id = ?
        """, (snapshot_id,))
        
        row = cursor.fetchone()
        if row and row['entradas'] and row['saidas']:
            entradas = row['entradas']
            saidas = row['saidas']
            calculado = entradas - saidas
            declarado = row['total_declarado'] or calculado
            
            if calculado != 0:
                diferenca_pct = abs(calculado - declarado) / abs(calculado) * 100
            else:
                diferenca_pct = 0
            
            limit = self.limits.get('GAS_BALANCE', {'warning': 1, 'critical': 2})
            
            if diferenca_pct >= limit['critical']:
                alerts.append(Alert(
                    alert_type=AlertType.GAS_BALANCE_ERROR,
                    severity=AlertSeverity.CRITICAL,
                    parameter='GAS_BALANCE',
                    current_value=diferenca_pct,
                    limit_value=limit['critical'],
                    unit='%',
                    message=f"Balanço de gás com diferença crítica: {diferenca_pct:.2f}%"
                ))
            elif diferenca_pct >= limit['warning']:
                alerts.append(Alert(
                    alert_type=AlertType.GAS_BALANCE_ERROR,
                    severity=AlertSeverity.WARNING,
                    parameter='GAS_BALANCE',
                    current_value=diferenca_pct,
                    limit_value=limit['warning'],
                    unit='%',
                    message=f"Balanço de gás com diferença: {diferenca_pct:.2f}%"
                ))
        
        return alerts
    
    def _check_production_variation(self, cursor, snapshot_id: int) -> List[Alert]:
        """Verifica variação de produção dia-a-dia."""
        alerts = []
        
        # Obter data do snapshot atual
        cursor.execute("SELECT report_date FROM daily_snapshot WHERE id = ?", (snapshot_id,))
        row = cursor.fetchone()
        if not row:
            return alerts
        
        current_date = row['report_date']
        
        # Calcular dia anterior
        try:
            dt = datetime.strptime(current_date, "%Y-%m-%d")
            previous_date = (dt - timedelta(days=1)).strftime("%Y-%m-%d")
        except:
            return alerts
        
        # Comparar produção
        cursor.execute("""
            SELECT 
                dm.meter_id, m.tag, dm.variable_code, dm.value
            FROM daily_measurement dm
            JOIN meter m ON dm.meter_id = m.id
            JOIN daily_snapshot ds ON dm.snapshot_id = ds.id
            WHERE ds.report_date = ?
            AND dm.block_type = 'DAY'
            AND dm.variable_code LIKE '%volume%'
            AND dm.value IS NOT NULL
        """, (current_date,))
        
        current_values = {(row['meter_id'], row['variable_code']): row['value'] for row in cursor.fetchall()}
        
        cursor.execute("""
            SELECT 
                dm.meter_id, m.tag, dm.variable_code, dm.value
            FROM daily_measurement dm
            JOIN meter m ON dm.meter_id = m.id
            JOIN daily_snapshot ds ON dm.snapshot_id = ds.id
            WHERE ds.report_date = ?
            AND dm.block_type = 'DAY'
            AND dm.variable_code LIKE '%volume%'
            AND dm.value IS NOT NULL
        """, (previous_date,))
        
        previous_values = {(row['meter_id'], row['variable_code']): (row['value'], row['tag']) 
                          for row in cursor.fetchall()}
        
        limit = self.limits.get('PRODUCTION_VARIATION', {'warning': 15, 'critical': 25})
        
        for key, current_val in current_values.items():
            if key in previous_values:
                prev_val, tag = previous_values[key]
                if prev_val > 0:
                    variation_pct = abs(current_val - prev_val) / prev_val * 100
                    
                    if variation_pct >= limit['critical']:
                        alerts.append(Alert(
                            alert_type=AlertType.PRODUCTION_VARIATION,
                            severity=AlertSeverity.CRITICAL,
                            parameter='PRODUCTION_VARIATION',
                            current_value=variation_pct,
                            limit_value=limit['critical'],
                            unit='%',
                            message=f"Variação crítica de produção em {tag}: {variation_pct:.1f}%",
                            meter_id=key[0]
                        ))
                    elif variation_pct >= limit['warning']:
                        alerts.append(Alert(
                            alert_type=AlertType.PRODUCTION_VARIATION,
                            severity=AlertSeverity.WARNING,
                            parameter='PRODUCTION_VARIATION',
                            current_value=variation_pct,
                            limit_value=limit['warning'],
                            unit='%',
                            message=f"Variação de produção em {tag}: {variation_pct:.1f}%",
                            meter_id=key[0]
                        ))
        
        return alerts
    
    def _check_missing_data(self, cursor, snapshot_id: int) -> List[Alert]:
        """Verifica dados faltantes."""
        alerts = []
        
        # Verificar medidores ativos sem dados
        cursor.execute("""
            SELECT m.id, m.tag, m.fluid_type
            FROM meter m
            WHERE m.is_active = TRUE
            AND m.id NOT IN (
                SELECT DISTINCT meter_id FROM daily_measurement WHERE snapshot_id = ?
            )
        """, (snapshot_id,))
        
        for row in cursor.fetchall():
            alerts.append(Alert(
                alert_type=AlertType.MISSING_DATA,
                severity=AlertSeverity.WARNING,
                parameter='DATA',
                current_value=0,
                limit_value=1,
                unit='',
                message=f"Sem dados para medidor {row['tag']} ({row['fluid_type']})",
                meter_id=row['id']
            ))
        
        return alerts
    
    def _save_alerts(self, cursor, snapshot_id: int, alerts: List[Alert]) -> None:
        """Salva alertas no banco."""
        for alert in alerts:
            cursor.execute("""
                INSERT INTO alert 
                (snapshot_id, meter_id, alert_type, severity, parameter, 
                 current_value, limit_value, unit, message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                snapshot_id,
                alert.meter_id,
                alert.alert_type.value,
                alert.severity.value,
                alert.parameter,
                alert.current_value,
                alert.limit_value,
                alert.unit,
                alert.message
            ))
    
    def analyze_date(self, report_date: str) -> List[Alert]:
        """
        Analisa dados de uma data específica.
        
        Args:
            report_date: Data no formato YYYY-MM-DD
            
        Returns:
            Lista de alertas
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT id FROM daily_snapshot WHERE report_date = ?
            """, (report_date,))
            
            row = cursor.fetchone()
            if row:
                return self.analyze_snapshot(row[0])
            else:
                logger.warning(f"Nenhum snapshot encontrado para {report_date}")
                return []
        finally:
            conn.close()
    
    def get_summary(self, days: int = 7) -> Dict:
        """
        Retorna resumo dos últimos N dias.
        
        Args:
            days: Número de dias
            
        Returns:
            Dict com resumo
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        summary = {
            'period_days': days,
            'snapshots': 0,
            'total_alerts': 0,
            'alerts_by_type': {},
            'alerts_by_severity': {},
            'production_trend': []
        }
        
        try:
            # Contar snapshots
            cursor.execute("""
                SELECT COUNT(*) FROM daily_snapshot
                WHERE report_date >= date('now', ?)
            """, (f'-{days} days',))
            summary['snapshots'] = cursor.fetchone()[0]
            
            # Alertas por tipo
            cursor.execute("""
                SELECT alert_type, COUNT(*) as cnt
                FROM alert a
                JOIN daily_snapshot ds ON a.snapshot_id = ds.id
                WHERE ds.report_date >= date('now', ?)
                GROUP BY alert_type
            """, (f'-{days} days',))
            summary['alerts_by_type'] = dict(cursor.fetchall())
            summary['total_alerts'] = sum(summary['alerts_by_type'].values())
            
            # Alertas por severidade
            cursor.execute("""
                SELECT severity, COUNT(*) as cnt
                FROM alert a
                JOIN daily_snapshot ds ON a.snapshot_id = ds.id
                WHERE ds.report_date >= date('now', ?)
                GROUP BY severity
            """, (f'-{days} days',))
            summary['alerts_by_severity'] = dict(cursor.fetchall())
            
            # Tendência de produção
            cursor.execute("""
                SELECT ds.report_date, SUM(dm.value) as total_volume
                FROM daily_measurement dm
                JOIN daily_snapshot ds ON dm.snapshot_id = ds.id
                WHERE ds.report_date >= date('now', ?)
                AND dm.block_type = 'DAY'
                AND dm.variable_code LIKE '%volume%'
                GROUP BY ds.report_date
                ORDER BY ds.report_date
            """, (f'-{days} days',))
            
            summary['production_trend'] = [
                {'date': row['report_date'], 'volume': row['total_volume']}
                for row in cursor.fetchall()
            ]
            
        except Exception as e:
            logger.exception("Erro ao gerar resumo")
        finally:
            conn.close()
        
        return summary


def analyze_today(db_path: str) -> List[Alert]:
    """Analisa dados de hoje."""
    analyzer = DailyAnalyzer(db_path)
    return analyzer.analyze_date(date.today().isoformat())


def analyze_all_pending(db_path: str) -> Dict:
    """Analisa todos os snapshots sem alertas."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    results = {'analyzed': 0, 'alerts_generated': 0}
    
    try:
        # Encontrar snapshots sem alertas
        cursor.execute("""
            SELECT ds.id, ds.report_date
            FROM daily_snapshot ds
            WHERE NOT EXISTS (
                SELECT 1 FROM alert a WHERE a.snapshot_id = ds.id
            )
        """)
        
        pending = cursor.fetchall()
        conn.close()
        
        analyzer = DailyAnalyzer(db_path)
        
        for snapshot_id, report_date in pending:
            alerts = analyzer.analyze_snapshot(snapshot_id)
            results['analyzed'] += 1
            results['alerts_generated'] += len(alerts)
            logger.info(f"Analisado {report_date}: {len(alerts)} alertas")
        
    except Exception as e:
        logger.exception("Erro na análise")
    
    return results


if __name__ == "__main__":
    import sys
    
    db_path = sys.argv[1] if len(sys.argv) > 1 else "database/mpfm_monitor.db"
    
    # Analisar todos os pendentes
    results = analyze_all_pending(db_path)
    print(f"Analisados: {results['analyzed']} snapshots")
    print(f"Alertas gerados: {results['alerts_generated']}")
    
    # Mostrar resumo
    analyzer = DailyAnalyzer(db_path)
    summary = analyzer.get_summary(30)
    print(f"\nResumo últimos 30 dias:")
    print(f"  Snapshots: {summary['snapshots']}")
    print(f"  Alertas: {summary['total_alerts']}")
    if summary['alerts_by_severity']:
        print(f"  Por severidade: {summary['alerts_by_severity']}")
