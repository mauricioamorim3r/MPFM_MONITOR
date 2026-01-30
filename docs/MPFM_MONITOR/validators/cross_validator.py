"""
SGM-FM - Cross Validator
Validação cruzada diária multi-fonte (Excel, XML, PDF, TXT)
Baseado no PRD de Validação Cruzada MultiFonte
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
# ENUMS E CONSTANTES
# ============================================================================

class SourceType(Enum):
    EXCEL = "excel"
    XML = "xml"
    PDF = "pdf"
    TXT = "txt"


class TimeWindow(Enum):
    DAILY = "DAILY"
    HOURLY = "HOURLY"
    CUMULATIVE = "CUMULATIVE"


class ValidationClassification(Enum):
    CONSISTENTE = "CONSISTENTE"         # Valores idênticos
    ACEITAVEL = "ACEITAVEL"             # Diferença dentro da tolerância
    INCONSISTENTE = "INCONSISTENTE"     # Diferença fora da tolerância
    INCOMPLETO = "INCOMPLETO"           # Fonte ausente
    ERRO_ORIGEM = "ERRO_ORIGEM"         # Unidade incompatível


# Tolerâncias padrão por variável (podem ser sobrescritas pelo banco)
DEFAULT_TOLERANCES = {
    'mass_hc': {'abs': 0.01, 'pct': 0.5},           # ±0.5%
    'mass_total': {'abs': 0.01, 'pct': 0.5},        # ±0.5%
    'mass_t': {'abs': 0.01, 'pct': 0.5},
    'volume_std': {'abs': 0.1, 'pct': 0.1},         # ±0.1%
    'gross_std_volume_sm3': {'abs': 0.1, 'pct': 0.1},
    'std_volume_sm3': {'abs': 0.1, 'pct': 0.1},
    'energy_gj': {'abs': 1.0, 'pct': 1.0},          # ±1.0%
    'flow_time_min': {'abs': 0, 'pct': 0},          # Exatamente igual
    'gross_volume_m3': {'abs': 0.1, 'pct': 0.5},
}


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class MeasurementFact:
    """Fato de medição normalizado (modelo canônico)."""
    source_type: SourceType
    source_file: str
    asset_id: int
    asset_tag: str
    variable_code: str
    date_ref: date
    time_window: TimeWindow
    value_num: Optional[float]
    unit: str
    confidence_flags: List[str] = field(default_factory=list)


@dataclass
class ValidationResult:
    """Resultado de uma validação cruzada."""
    asset_id: int
    date_ref: date
    time_window: TimeWindow
    variable_code: str
    
    # Valores por fonte
    values_by_source: Dict[SourceType, float]
    
    # Classificação
    classification: ValidationClassification
    max_deviation_abs: Optional[float]
    max_deviation_pct: Optional[float]
    tolerance_applied: Optional[float]
    
    # Detalhes
    sources_available: List[SourceType]
    comparison_details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class InconsistencyRecord:
    """Registro de inconsistência para rastreamento."""
    asset_id: int
    variable_code: str
    first_occurrence: date
    last_occurrence: date
    consecutive_days: int
    status: str  # ACTIVE, RESOLVED, ESCALATED


# ============================================================================
# CLASSE: CrossValidator
# ============================================================================

class CrossValidator:
    """
    Validador cruzado multi-fonte.
    
    Compara dados do mesmo fato físico de medição entre diferentes representações
    (Excel, XML, PDF, TXT) e classifica a consistência.
    """
    
    def __init__(self, db_path: str, installation_id: int = 1):
        self.db_path = db_path
        self.installation_id = installation_id
        self.tolerances = self._load_tolerances()
    
    def _load_tolerances(self) -> Dict[str, Dict]:
        """Carrega tolerâncias do banco ou usa padrão."""
        tolerances = dict(DEFAULT_TOLERANCES)
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT variable_code, tolerance_abs, tolerance_pct
                FROM validation_tolerance
                WHERE installation_id = ? AND is_active = TRUE
            """, (self.installation_id,))
            
            for row in cursor.fetchall():
                tolerances[row[0]] = {'abs': row[1], 'pct': row[2]}
            
            conn.close()
        except Exception as e:
            logger.warning(f"Erro ao carregar tolerâncias: {e}")
        
        return tolerances
    
    def load_measurement_facts(self, date_ref: date) -> List[MeasurementFact]:
        """
        Carrega todos os fatos de medição de uma data.
        Consolida dados de todas as fontes.
        """
        facts = []
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            # 1. Dados do Excel (daily_measurement)
            cursor.execute("""
                SELECT 
                    dm.asset_id, ar.asset_tag, dm.variable_code, dm.value, dm.unit,
                    dm.block_type, sf.file_name
                FROM daily_measurement dm
                JOIN report r ON dm.report_id = r.id
                JOIN asset_registry ar ON dm.asset_id = ar.id
                LEFT JOIN staged_file sf ON r.staged_file_id = sf.id
                WHERE r.report_date = ?
            """, (date_ref.isoformat(),))
            
            for row in cursor.fetchall():
                time_window = {
                    'DAY': TimeWindow.DAILY,
                    'CUMULATIVE': TimeWindow.CUMULATIVE,
                    'AVG': TimeWindow.DAILY
                }.get(row['block_type'], TimeWindow.DAILY)
                
                facts.append(MeasurementFact(
                    source_type=SourceType.EXCEL,
                    source_file=row['file_name'] or '',
                    asset_id=row['asset_id'],
                    asset_tag=row['asset_tag'],
                    variable_code=row['variable_code'],
                    date_ref=date_ref,
                    time_window=time_window,
                    value_num=row['value'],
                    unit=row['unit'] or ''
                ))
            
            # 2. Dados do XML (xml_production)
            cursor.execute("""
                SELECT 
                    xp.asset_id, ar.asset_tag, sf.file_name,
                    xp.gross_volume_observed, xp.gross_volume_corrected,
                    xp.net_volume, xp.bsw_percent, xp.meter_factor
                FROM xml_production xp
                JOIN asset_registry ar ON xp.asset_id = ar.id
                LEFT JOIN staged_file sf ON xp.staged_file_id = sf.id
                WHERE DATE(xp.period_start) = ?
            """, (date_ref.isoformat(),))
            
            for row in cursor.fetchall():
                asset_id = row['asset_id']
                asset_tag = row['asset_tag']
                source_file = row['file_name'] or ''
                
                # Mapear campos XML para variáveis canônicas
                xml_mappings = [
                    ('gross_volume_observed', 'gross_volume_m3', 'm³'),
                    ('gross_volume_corrected', 'gross_std_volume_sm3', 'Sm³'),
                    ('net_volume', 'net_std_volume_sm3', 'Sm³'),
                    ('bsw_percent', 'bsw_pctvol', '%'),
                    ('meter_factor', 'meter_factor', '')
                ]
                
                for xml_field, var_code, unit in xml_mappings:
                    value = row[xml_field]
                    if value is not None:
                        facts.append(MeasurementFact(
                            source_type=SourceType.XML,
                            source_file=source_file,
                            asset_id=asset_id,
                            asset_tag=asset_tag,
                            variable_code=var_code,
                            date_ref=date_ref,
                            time_window=TimeWindow.DAILY,
                            value_num=value,
                            unit=unit
                        ))
            
            # 3. Dados do PDF (mpfm_daily)
            cursor.execute("""
                SELECT 
                    md.asset_id, ar.asset_tag, sf.file_name,
                    md.corr_mass_oil, md.corr_mass_gas, md.corr_mass_hc,
                    md.corr_mass_water, md.corr_mass_total,
                    md.pvt_ref_vol_oil_sm3, md.pvt_ref_vol_gas_sm3
                FROM mpfm_daily md
                JOIN asset_registry ar ON md.asset_id = ar.id
                LEFT JOIN staged_file sf ON md.staged_file_id = sf.id
                WHERE md.report_date = ?
            """, (date_ref.isoformat(),))
            
            for row in cursor.fetchall():
                asset_id = row['asset_id']
                asset_tag = row['asset_tag']
                source_file = row['file_name'] or ''
                
                pdf_mappings = [
                    ('corr_mass_oil', 'mass_oil_t', 't'),
                    ('corr_mass_gas', 'mass_gas_t', 't'),
                    ('corr_mass_hc', 'mass_hc_t', 't'),
                    ('corr_mass_water', 'mass_water_t', 't'),
                    ('corr_mass_total', 'mass_total_t', 't'),
                    ('pvt_ref_vol_oil_sm3', 'pvt_ref_vol_oil_sm3', 'Sm³'),
                    ('pvt_ref_vol_gas_sm3', 'pvt_ref_vol_gas_sm3', 'Sm³')
                ]
                
                for pdf_field, var_code, unit in pdf_mappings:
                    value = row[pdf_field]
                    if value is not None:
                        facts.append(MeasurementFact(
                            source_type=SourceType.PDF,
                            source_file=source_file,
                            asset_id=asset_id,
                            asset_tag=asset_tag,
                            variable_code=var_code,
                            date_ref=date_ref,
                            time_window=TimeWindow.DAILY,
                            value_num=value,
                            unit=unit
                        ))
            
        finally:
            conn.close()
        
        return facts
    
    def group_facts(self, facts: List[MeasurementFact]) -> Dict[tuple, List[MeasurementFact]]:
        """
        Agrupa fatos pela chave de comparação:
        (asset_id, variable_code, date_ref, time_window)
        """
        groups = defaultdict(list)
        
        for fact in facts:
            key = (fact.asset_id, fact.variable_code, fact.date_ref, fact.time_window)
            groups[key].append(fact)
        
        return dict(groups)
    
    def validate_group(self, key: tuple, facts: List[MeasurementFact]) -> ValidationResult:
        """
        Valida um grupo de fatos do mesmo ponto/variável/data.
        
        Args:
            key: (asset_id, variable_code, date_ref, time_window)
            facts: Lista de fatos de diferentes fontes
            
        Returns:
            ValidationResult com classificação
        """
        asset_id, variable_code, date_ref, time_window = key
        
        # Coletar valores por fonte
        values_by_source = {}
        sources_available = []
        
        for fact in facts:
            if fact.value_num is not None:
                values_by_source[fact.source_type] = fact.value_num
                if fact.source_type not in sources_available:
                    sources_available.append(fact.source_type)
        
        # Classificar
        classification = ValidationClassification.INCOMPLETO
        max_deviation_abs = None
        max_deviation_pct = None
        tolerance_applied = None
        comparison_details = {}
        
        if len(sources_available) < 2:
            # Apenas uma fonte (ou nenhuma) - incompleto
            classification = ValidationClassification.INCOMPLETO
            comparison_details['reason'] = 'insufficient_sources'
        else:
            # Comparar todas as fontes
            values = list(values_by_source.values())
            max_val = max(values) if values else 0
            min_val = min(values) if values else 0
            
            max_deviation_abs = max_val - min_val
            
            # Calcular desvio percentual
            if max_val != 0:
                max_deviation_pct = abs(max_deviation_abs) / abs(max_val) * 100
            elif min_val != 0:
                max_deviation_pct = abs(max_deviation_abs) / abs(min_val) * 100
            else:
                max_deviation_pct = 0
            
            # Obter tolerância
            tolerance = self.tolerances.get(variable_code, {'abs': 0.01, 'pct': 0.5})
            tolerance_abs = tolerance.get('abs', 0.01)
            tolerance_pct = tolerance.get('pct', 0.5)
            
            # Aplicar regra: max(absoluta, percentual)
            tolerance_applied = max(tolerance_abs, abs(max_val * tolerance_pct / 100) if max_val else 0)
            
            # Classificar
            if max_deviation_abs == 0:
                classification = ValidationClassification.CONSISTENTE
            elif abs(max_deviation_abs) <= tolerance_applied:
                classification = ValidationClassification.ACEITAVEL
            else:
                classification = ValidationClassification.INCONSISTENTE
            
            comparison_details = {
                'values': {st.value: v for st, v in values_by_source.items()},
                'max_value': max_val,
                'min_value': min_val,
                'tolerance_abs': tolerance_abs,
                'tolerance_pct': tolerance_pct
            }
        
        return ValidationResult(
            asset_id=asset_id,
            date_ref=date_ref,
            time_window=time_window,
            variable_code=variable_code,
            values_by_source=values_by_source,
            classification=classification,
            max_deviation_abs=max_deviation_abs,
            max_deviation_pct=max_deviation_pct,
            tolerance_applied=tolerance_applied,
            sources_available=sources_available,
            comparison_details=comparison_details
        )
    
    def validate_date(self, date_ref: date) -> List[ValidationResult]:
        """
        Executa validação cruzada para uma data.
        
        Args:
            date_ref: Data de referência
            
        Returns:
            Lista de resultados de validação
        """
        logger.info(f"Iniciando validação cruzada para {date_ref}")
        
        # 1. Carregar fatos
        facts = self.load_measurement_facts(date_ref)
        logger.info(f"Carregados {len(facts)} fatos de medição")
        
        if not facts:
            logger.warning("Nenhum fato encontrado para validação")
            return []
        
        # 2. Agrupar por chave
        groups = self.group_facts(facts)
        logger.info(f"Agrupados em {len(groups)} grupos")
        
        # 3. Validar cada grupo
        results = []
        for key, group_facts in groups.items():
            result = self.validate_group(key, group_facts)
            results.append(result)
        
        # 4. Persistir resultados
        self._save_results(results)
        
        # 5. Atualizar histórico de inconsistências
        self._update_inconsistency_history(date_ref, results)
        
        # Estatísticas
        stats = defaultdict(int)
        for r in results:
            stats[r.classification.value] += 1
        
        logger.info(f"Validação concluída: {dict(stats)}")
        
        return results
    
    def _save_results(self, results: List[ValidationResult]) -> None:
        """Persiste resultados no banco."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            for result in results:
                cursor.execute("""
                    INSERT OR REPLACE INTO cross_validation_result
                    (asset_id, date_ref, time_window, variable_code,
                     value_excel, value_xml, value_pdf, value_txt,
                     sources_available, sources_count, classification,
                     max_deviation_abs, max_deviation_pct, tolerance_applied,
                     comparison_details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    result.asset_id,
                    result.date_ref.isoformat(),
                    result.time_window.value,
                    result.variable_code,
                    result.values_by_source.get(SourceType.EXCEL),
                    result.values_by_source.get(SourceType.XML),
                    result.values_by_source.get(SourceType.PDF),
                    result.values_by_source.get(SourceType.TXT),
                    json.dumps([s.value for s in result.sources_available]),
                    len(result.sources_available),
                    result.classification.value,
                    result.max_deviation_abs,
                    result.max_deviation_pct,
                    result.tolerance_applied,
                    json.dumps(result.comparison_details)
                ))
            
            conn.commit()
        finally:
            conn.close()
    
    def _update_inconsistency_history(self, date_ref: date, results: List[ValidationResult]) -> None:
        """Atualiza histórico de inconsistências para gatilho de desenquadramento."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            for result in results:
                if result.classification == ValidationClassification.INCONSISTENTE:
                    # Verificar se já existe histórico
                    cursor.execute("""
                        SELECT id, first_occurrence, last_occurrence, consecutive_days
                        FROM inconsistency_history
                        WHERE asset_id = ? AND variable_code = ? AND status = 'ACTIVE'
                    """, (result.asset_id, result.variable_code))
                    
                    row = cursor.fetchone()
                    
                    if row:
                        # Atualizar existente
                        last_date = datetime.strptime(row[2], "%Y-%m-%d").date()
                        
                        # Verificar se é dia consecutivo
                        if date_ref - last_date == timedelta(days=1):
                            new_consecutive = row[3] + 1
                        else:
                            new_consecutive = 1
                        
                        cursor.execute("""
                            UPDATE inconsistency_history
                            SET last_occurrence = ?, consecutive_days = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        """, (date_ref.isoformat(), new_consecutive, row[0]))
                        
                        # Verificar gatilho de desenquadramento (10 dias)
                        if new_consecutive >= 10:
                            self._trigger_nonconformance(cursor, result, row[0])
                    else:
                        # Criar novo registro
                        cursor.execute("""
                            INSERT INTO inconsistency_history
                            (asset_id, variable_code, first_occurrence, last_occurrence, consecutive_days, status)
                            VALUES (?, ?, ?, ?, 1, 'ACTIVE')
                        """, (result.asset_id, result.variable_code, date_ref.isoformat(), date_ref.isoformat()))
                
                elif result.classification in [ValidationClassification.CONSISTENTE, ValidationClassification.ACEITAVEL]:
                    # Resolver inconsistências ativas se agora está OK
                    cursor.execute("""
                        UPDATE inconsistency_history
                        SET status = 'RESOLVED', updated_at = CURRENT_TIMESTAMP
                        WHERE asset_id = ? AND variable_code = ? AND status = 'ACTIVE'
                    """, (result.asset_id, result.variable_code))
            
            conn.commit()
        finally:
            conn.close()
    
    def _trigger_nonconformance(self, cursor, result: ValidationResult, history_id: int) -> None:
        """Cria evento de não-conformidade por desenquadramento."""
        unique_id = f"NC-CV-{result.asset_id}-{result.variable_code}-{result.date_ref.isoformat()}"
        
        cursor.execute("""
            INSERT OR IGNORE INTO nonconformance
            (installation_id, asset_id, unique_event_id, status,
             origin_type, origin_id, occurrence_datetime, detection_datetime,
             variable_affected, deviation_description, deadline_partial, deadline_final)
            VALUES (?, ?, ?, 'IN_INVESTIGATION', 'CROSS_VALIDATION', ?, ?, ?, ?, ?, ?, ?)
        """, (
            self.installation_id,
            result.asset_id,
            unique_id,
            history_id,
            result.date_ref.isoformat(),
            datetime.now().isoformat(),
            result.variable_code,
            f"Inconsistência persistente por 10+ dias. Desvio: {result.max_deviation_pct:.2f}%",
            (result.date_ref + timedelta(days=10)).isoformat(),
            (result.date_ref + timedelta(days=30)).isoformat()
        ))
        
        # Atualizar histórico
        cursor.execute("""
            UPDATE inconsistency_history
            SET status = 'ESCALATED', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (history_id,))
        
        logger.warning(f"DESENQUADRAMENTO: {unique_id} - {result.variable_code}")
    
    def get_validation_summary(self, days: int = 7) -> Dict:
        """Retorna resumo das validações dos últimos N dias."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        summary = {
            'period_days': days,
            'total_validations': 0,
            'by_classification': {},
            'inconsistencies_active': 0,
            'desenquadramentos': 0
        }
        
        try:
            # Por classificação
            cursor.execute("""
                SELECT classification, COUNT(*) as cnt
                FROM cross_validation_result
                WHERE date_ref >= date('now', ?)
                GROUP BY classification
            """, (f'-{days} days',))
            
            for row in cursor.fetchall():
                summary['by_classification'][row['classification']] = row['cnt']
                summary['total_validations'] += row['cnt']
            
            # Inconsistências ativas
            cursor.execute("""
                SELECT COUNT(*) FROM inconsistency_history WHERE status = 'ACTIVE'
            """)
            summary['inconsistencies_active'] = cursor.fetchone()[0]
            
            # Desenquadramentos
            cursor.execute("""
                SELECT COUNT(*) FROM inconsistency_history WHERE status = 'ESCALATED'
            """)
            summary['desenquadramentos'] = cursor.fetchone()[0]
            
        finally:
            conn.close()
        
        return summary


# ============================================================================
# FUNÇÕES DE CONVENIÊNCIA
# ============================================================================

def validate_today(db_path: str, installation_id: int = 1) -> List[ValidationResult]:
    """Valida dados de hoje."""
    validator = CrossValidator(db_path, installation_id)
    return validator.validate_date(date.today())


def validate_date_range(db_path: str, start_date: date, end_date: date, 
                        installation_id: int = 1) -> Dict[date, List[ValidationResult]]:
    """Valida range de datas."""
    validator = CrossValidator(db_path, installation_id)
    results = {}
    
    current = start_date
    while current <= end_date:
        results[current] = validator.validate_date(current)
        current += timedelta(days=1)
    
    return results


def reprocess_validation(db_path: str, days: int = 30, installation_id: int = 1) -> Dict:
    """Reprocessa validações dos últimos N dias."""
    validator = CrossValidator(db_path, installation_id)
    
    stats = {'processed': 0, 'results': 0}
    
    for i in range(days):
        d = date.today() - timedelta(days=i)
        results = validator.validate_date(d)
        stats['processed'] += 1
        stats['results'] += len(results)
    
    return stats


# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    import sys
    
    db_path = sys.argv[1] if len(sys.argv) > 1 else "database/mpfm_monitor.db"
    
    validator = CrossValidator(db_path)
    
    # Validar ontem
    yesterday = date.today() - timedelta(days=1)
    results = validator.validate_date(yesterday)
    
    print(f"\n📊 Validação Cruzada - {yesterday}")
    print("=" * 50)
    
    # Agrupar por classificação
    by_class = defaultdict(list)
    for r in results:
        by_class[r.classification].append(r)
    
    icons = {
        ValidationClassification.CONSISTENTE: '✅',
        ValidationClassification.ACEITAVEL: '⚠️',
        ValidationClassification.INCONSISTENTE: '❌',
        ValidationClassification.INCOMPLETO: '❓',
        ValidationClassification.ERRO_ORIGEM: '🔴'
    }
    
    for classification, items in by_class.items():
        print(f"\n{icons.get(classification, '•')} {classification.value}: {len(items)}")
        for item in items[:5]:  # Mostrar até 5
            sources = ', '.join(s.value for s in item.sources_available)
            print(f"   - Asset {item.asset_id}, {item.variable_code} [{sources}]")
    
    # Resumo
    summary = validator.get_validation_summary(30)
    print(f"\n📈 Resumo últimos 30 dias:")
    print(f"   Total: {summary['total_validations']} validações")
    print(f"   Inconsistências ativas: {summary['inconsistencies_active']}")
    print(f"   Desenquadramentos: {summary['desenquadramentos']}")
