"""
MPFM Monitor - XML ANP Extractor
Extrator para arquivos XML ANP tipos 001, 002, 003, 004
Lê dados de configuração e produção dos computadores de vazão.
"""
import os
import re
import hashlib
import sqlite3
import logging
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum
import xml.etree.ElementTree as ET

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============================================================================
# CONSTANTES
# ============================================================================

class XMLType(Enum):
    A001 = "001"  # Óleo
    A002 = "002"  # Gás Linear
    A003 = "003"  # Gás Diferencial
    A004 = "004"  # Alarmes & Eventos
    UNKNOWN = "UNKNOWN"


# Formato de data/hora ANP
DATETIME_FORMAT_ANP = "%d/%m/%Y %H:%M:%S"
DATE_FORMAT_ANP = "%d/%m/%Y"


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class XMLMetadata:
    """Metadados do arquivo XML."""
    file_name: str
    file_hash: str
    xml_type: XMLType
    cnpj8: Optional[str]
    cod_instalacao: Optional[str]
    generation_timestamp: Optional[datetime]


@dataclass
class FlowComputerConfig:
    """Configuração do computador de vazão (CONFIGURACAO_CV)."""
    serial_number: str
    collection_datetime: Optional[datetime]
    temperature: Optional[float]
    atmospheric_pressure: Optional[float]
    reference_pressure: Optional[float]
    relative_density: Optional[float]
    software_version: Optional[str]


@dataclass
class PrimaryElement:
    """Elemento primário com meter factors."""
    meter_factors: Dict[int, float]  # {1: 1.0001, 2: 1.0002, ...}
    pulses: Dict[int, int]  # {1: 1000, 2: 2000, ...}


@dataclass
class Instrument:
    """Instrumento de pressão ou temperatura."""
    instrument_type: str  # PRESSAO ou TEMPERATURA
    serial_number: Optional[str]
    kind: Optional[str]  # PRINCIPAL, BACKUP, etc.
    manufacturer: Optional[str]
    model: Optional[str]
    range_low: Optional[float]
    range_high: Optional[float]
    last_calibration: Optional[datetime]
    uncertainty: Optional[float]


@dataclass
class ProductionRecord:
    """Registro de produção."""
    period_start: Optional[datetime]
    period_end: Optional[datetime]
    flow_duration_min: Optional[float]
    
    # Volumes
    gross_volume_observed: Optional[float]
    gross_volume_corrected: Optional[float]
    net_volume: Optional[float]
    corrected_volume: Optional[float]  # Para gás
    
    # Totalizadores
    totalizer_start: Optional[float]
    totalizer_end: Optional[float]
    
    # Qualidade
    bsw_percent: Optional[float]
    relative_density: Optional[float]
    
    # Condições
    static_pressure: Optional[float]
    temperature: Optional[float]
    differential_pressure: Optional[float]  # Para gás
    
    # Fatores
    ctl: Optional[float]
    cpl: Optional[float]
    ctpl: Optional[float]
    meter_factor: Optional[float]


@dataclass
class Alarm:
    """Registro de alarme (tipo 004)."""
    alarm_datetime: datetime
    parameter: str
    value: str


@dataclass
class Event:
    """Registro de evento (tipo 004)."""
    event_datetime: datetime
    parameter: str
    original_value: str
    new_value: str


@dataclass
class MeasurementPoint:
    """Ponto de medição completo (DADOS_BASICOS)."""
    cod_instalacao: str
    cod_tag: Optional[str]
    primary_element_serial: Optional[str]
    flow_computer_serial: Optional[str]
    
    config: Optional[FlowComputerConfig] = None
    primary_element: Optional[PrimaryElement] = None
    pressure_instruments: List[Instrument] = field(default_factory=list)
    temperature_instruments: List[Instrument] = field(default_factory=list)
    production_records: List[ProductionRecord] = field(default_factory=list)
    alarms: List[Alarm] = field(default_factory=list)
    events: List[Event] = field(default_factory=list)


@dataclass
class XMLExtractionResult:
    """Resultado da extração de XML."""
    success: bool
    metadata: Optional[XMLMetadata]
    measurement_points: List[MeasurementPoint] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


# ============================================================================
# CLASSE PRINCIPAL: XMLExtractor
# ============================================================================

class XMLExtractor:
    """
    Extrator de dados de arquivos XML ANP.
    Suporta tipos 001 (Óleo), 002 (Gás Linear), 003 (Gás Diferencial), 004 (Alarmes).
    """
    
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        if not self.file_path.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        
        self._file_hash = None
        self._xml_type = None
        self.root = None
    
    @property
    def file_hash(self) -> str:
        """Calcula hash SHA-256 do arquivo."""
        if self._file_hash is None:
            with open(self.file_path, 'rb') as f:
                self._file_hash = hashlib.sha256(f.read()).hexdigest()
        return self._file_hash
    
    def _detect_xml_type(self) -> XMLType:
        """Detecta tipo de XML pelo nome do arquivo ou tag raiz."""
        name = self.file_path.name.lower()
        
        # Por nome de arquivo (ex: 001_04028583_20260127001000_38480.xml)
        if name.startswith('001'):
            return XMLType.A001
        elif name.startswith('002'):
            return XMLType.A002
        elif name.startswith('003'):
            return XMLType.A003
        elif name.startswith('004'):
            return XMLType.A004
        
        # Por tag raiz
        if self.root is not None:
            root_tag = self.root.tag.lower()
            if root_tag == 'a001':
                return XMLType.A001
            elif root_tag == 'a002':
                return XMLType.A002
            elif root_tag == 'a003':
                return XMLType.A003
            elif root_tag == 'a004':
                return XMLType.A004
        
        return XMLType.UNKNOWN
    
    def _parse_datetime(self, value: str) -> Optional[datetime]:
        """Parse datetime no formato ANP (DD/MM/YYYY HH:MM:SS)."""
        if not value:
            return None
        
        try:
            return datetime.strptime(value.strip(), DATETIME_FORMAT_ANP)
        except ValueError:
            try:
                return datetime.strptime(value.strip(), DATE_FORMAT_ANP)
            except ValueError:
                return None
    
    def _parse_decimal(self, value: str) -> Optional[float]:
        """Parse número decimal (ANP usa vírgula)."""
        if not value:
            return None
        
        try:
            # Substituir vírgula por ponto
            return float(value.strip().replace(',', '.'))
        except ValueError:
            return None
    
    def _get_text(self, element: ET.Element, tag: str) -> Optional[str]:
        """Obtém texto de um subelemento."""
        child = element.find(tag)
        if child is not None and child.text:
            return child.text.strip()
        return None
    
    def _get_float(self, element: ET.Element, tag: str) -> Optional[float]:
        """Obtém float de um subelemento."""
        text = self._get_text(element, tag)
        return self._parse_decimal(text)
    
    def _get_int(self, element: ET.Element, tag: str) -> Optional[int]:
        """Obtém inteiro de um subelemento."""
        text = self._get_text(element, tag)
        if text:
            try:
                return int(text)
            except ValueError:
                return None
        return None
    
    def _get_datetime(self, element: ET.Element, tag: str) -> Optional[datetime]:
        """Obtém datetime de um subelemento."""
        text = self._get_text(element, tag)
        return self._parse_datetime(text)
    
    def _parse_filename_metadata(self) -> Tuple[Optional[str], Optional[str], Optional[datetime]]:
        """Extrai metadados do nome do arquivo."""
        # Formato: 001_04028583_20260127001000_38480.xml
        name = self.file_path.stem
        parts = name.split('_')
        
        cnpj8 = None
        cod_instalacao = None
        gen_timestamp = None
        
        if len(parts) >= 2:
            cnpj8 = parts[1] if len(parts[1]) == 8 else None
        
        if len(parts) >= 3:
            ts_str = parts[2]
            if len(ts_str) == 14:
                try:
                    gen_timestamp = datetime.strptime(ts_str, "%Y%m%d%H%M%S")
                except ValueError:
                    pass
        
        if len(parts) >= 4:
            cod_instalacao = parts[3]
        
        return cnpj8, cod_instalacao, gen_timestamp
    
    def extract(self) -> XMLExtractionResult:
        """
        Extrai todos os dados do arquivo XML.
        
        Returns:
            XMLExtractionResult com dados extraídos
        """
        result = XMLExtractionResult(success=False, metadata=None)
        
        try:
            # Parse XML
            tree = ET.parse(self.file_path)
            self.root = tree.getroot()
            
            xml_type = self._detect_xml_type()
            cnpj8, cod_instalacao, gen_timestamp = self._parse_filename_metadata()
            
            result.metadata = XMLMetadata(
                file_name=self.file_path.name,
                file_hash=self.file_hash,
                xml_type=xml_type,
                cnpj8=cnpj8,
                cod_instalacao=cod_instalacao,
                generation_timestamp=gen_timestamp
            )
            
            # Encontrar LISTA_DADOS_BASICOS
            lista_db = self.root.find('LISTA_DADOS_BASICOS')
            if lista_db is None:
                result.errors.append("LISTA_DADOS_BASICOS não encontrado")
                return result
            
            # Processar cada DADOS_BASICOS
            for db in lista_db.findall('DADOS_BASICOS'):
                mp = self._extract_dados_basicos(db, xml_type, result)
                if mp:
                    result.measurement_points.append(mp)
            
            result.success = len(result.errors) == 0
            
        except ET.ParseError as e:
            result.errors.append(f"Erro de parse XML: {str(e)}")
        except Exception as e:
            result.errors.append(f"Erro ao processar XML: {str(e)}")
            logger.exception("Erro na extração de XML")
        
        return result
    
    def _extract_dados_basicos(self, db: ET.Element, xml_type: XMLType, 
                                result: XMLExtractionResult) -> Optional[MeasurementPoint]:
        """Extrai dados de um bloco DADOS_BASICOS."""
        
        # Atributos
        cod_instalacao = db.get('COD_INSTALACAO', '')
        cod_tag = db.get('COD_TAG_PONTO_MEDICAO', '')
        primary_serial = db.get('NUM_SERIE_ELEMENTO_PRIMARIO', '')
        fc_serial = db.get('NUM_SERIE_COMPUTADOR_VAZAO', '')
        
        mp = MeasurementPoint(
            cod_instalacao=cod_instalacao,
            cod_tag=cod_tag if cod_tag else None,
            primary_element_serial=primary_serial if primary_serial else None,
            flow_computer_serial=fc_serial if fc_serial else None
        )
        
        if xml_type == XMLType.A004:
            # Tipo 004: Alarmes e Eventos
            self._extract_alarms(db, mp, result)
            self._extract_events(db, mp, result)
        else:
            # Tipos 001/002/003: Configuração e Produção
            self._extract_config_cv(db, mp, result)
            self._extract_primary_element(db, mp, result)
            self._extract_instruments(db, mp, result)
            self._extract_production(db, mp, xml_type, result)
        
        return mp
    
    def _extract_config_cv(self, db: ET.Element, mp: MeasurementPoint, 
                           result: XMLExtractionResult) -> None:
        """Extrai configuração do computador de vazão."""
        lista_cv = db.find('LISTA_CONFIGURACAO_CV')
        if lista_cv is None:
            return
        
        cv = lista_cv.find('CONFIGURACAO_CV')
        if cv is None:
            return
        
        mp.config = FlowComputerConfig(
            serial_number=self._get_text(cv, 'NUM_SERIE_COMPUTADOR_VAZAO') or '',
            collection_datetime=self._get_datetime(cv, 'DHA_COLETA'),
            temperature=self._get_float(cv, 'MED_TEMPERATURA'),
            atmospheric_pressure=self._get_float(cv, 'MED_PRESSAO_ATMSA'),
            reference_pressure=self._get_float(cv, 'MED_PRESSAO_RFRNA'),
            relative_density=self._get_float(cv, 'MED_DENSIDADE_RELATIVA'),
            software_version=self._get_text(cv, 'DSC_VERSAO_SOFTWARE')
        )
        
        # Se não tem serial no config, usar do DADOS_BASICOS
        if not mp.config.serial_number and mp.flow_computer_serial:
            mp.config.serial_number = mp.flow_computer_serial
    
    def _extract_primary_element(self, db: ET.Element, mp: MeasurementPoint,
                                  result: XMLExtractionResult) -> None:
        """Extrai dados do elemento primário (meter factors)."""
        lista_ep = db.find('LISTA_ELEMENTO_PRIMARIO')
        if lista_ep is None:
            return
        
        ep = lista_ep.find('ELEMENTO_PRIMARIO')
        if ep is None:
            return
        
        meter_factors = {}
        pulses = {}
        
        for i in range(1, 13):
            mf = self._get_float(ep, f'ICE_METER_FACTOR_{i}')
            if mf is not None:
                meter_factors[i] = mf
            
            p = self._get_int(ep, f'QTD_PULSOS_METER_FACTOR_{i}')
            if p is not None:
                pulses[i] = p
        
        mp.primary_element = PrimaryElement(
            meter_factors=meter_factors,
            pulses=pulses
        )
    
    def _extract_instruments(self, db: ET.Element, mp: MeasurementPoint,
                             result: XMLExtractionResult) -> None:
        """Extrai instrumentos de pressão e temperatura."""
        # Instrumentos de pressão
        lista_ip = db.find('LISTA_INSTRUMENTO_PRESSAO')
        if lista_ip is not None:
            for ip in lista_ip.findall('INSTRUMENTO_PRESSAO'):
                inst = Instrument(
                    instrument_type='PRESSAO',
                    serial_number=self._get_text(ip, 'NUM_SERIE_INSTRUMENTO'),
                    kind=self._get_text(ip, 'IND_TIPO_INSTRUMENTO'),
                    manufacturer=self._get_text(ip, 'DSC_FABRICANTE'),
                    model=self._get_text(ip, 'DSC_MODELO'),
                    range_low=self._get_float(ip, 'MED_LMT_INFOR'),
                    range_high=self._get_float(ip, 'MED_LMT_SUPR'),
                    last_calibration=self._get_datetime(ip, 'DHA_ULT_CALIBRACAO'),
                    uncertainty=self._get_float(ip, 'MED_INCERTEZA_PADRAO')
                )
                mp.pressure_instruments.append(inst)
        
        # Instrumentos de temperatura
        lista_it = db.find('LISTA_INSTRUMENTO_TEMPERATURA')
        if lista_it is not None:
            for it in lista_it.findall('INSTRUMENTO_TEMPERATURA'):
                inst = Instrument(
                    instrument_type='TEMPERATURA',
                    serial_number=self._get_text(it, 'NUM_SERIE_INSTRUMENTO'),
                    kind=self._get_text(it, 'IND_TIPO_INSTRUMENTO'),
                    manufacturer=self._get_text(it, 'DSC_FABRICANTE'),
                    model=self._get_text(it, 'DSC_MODELO'),
                    range_low=self._get_float(it, 'MED_LMT_INFOR'),
                    range_high=self._get_float(it, 'MED_LMT_SUPR'),
                    last_calibration=self._get_datetime(it, 'DHA_ULT_CALIBRACAO'),
                    uncertainty=self._get_float(it, 'MED_INCERTEZA_PADRAO')
                )
                mp.temperature_instruments.append(inst)
    
    def _extract_production(self, db: ET.Element, mp: MeasurementPoint,
                            xml_type: XMLType, result: XMLExtractionResult) -> None:
        """Extrai registros de produção."""
        lista_prod = db.find('LISTA_PRODUCAO')
        if lista_prod is None:
            return
        
        for prod in lista_prod.findall('PRODUCAO'):
            record = ProductionRecord(
                period_start=self._get_datetime(prod, 'DHA_INICIO_PERIODO_MEDICAO'),
                period_end=self._get_datetime(prod, 'DHA_FIM_PERIODO_MEDICAO'),
                flow_duration_min=self._get_float(prod, 'PRZ_DURACAO_FLUXO_EFETIVO'),
                
                gross_volume_observed=self._get_float(prod, 'MED_VOLUME_BRUTO_CRRGO_MVMTAM'),
                gross_volume_corrected=self._get_float(prod, 'MED_VOLUME_BRUTO_CRRDO_MVMTAM'),
                net_volume=self._get_float(prod, 'MED_VOLUME_LIQUIDO_MVMTAM'),
                corrected_volume=self._get_float(prod, 'MED_CORRIGIDO_MVMDO'),
                
                totalizer_start=self._get_float(prod, 'NUM_TTZDR_INIC_PRD_MVMTAM'),
                totalizer_end=self._get_float(prod, 'NUM_TTZDR_FINAL_PRD_MVMTAM'),
                
                bsw_percent=self._get_float(prod, 'PCT_BSW'),
                relative_density=self._get_float(prod, 'ICE_DENSIDADE_RELATIVA'),
                
                static_pressure=self._get_float(prod, 'MED_PRESSAO_ESTATICA'),
                temperature=self._get_float(prod, 'MED_TEMPERATURA'),
                differential_pressure=self._get_float(prod, 'MED_DIFERENCIAL_PRESSAO'),
                
                ctl=self._get_float(prod, 'ICE_CTL'),
                cpl=self._get_float(prod, 'ICE_CPL'),
                ctpl=self._get_float(prod, 'ICE_CTPL'),
                meter_factor=self._get_float(prod, 'ICE_METER_FACTOR')
            )
            mp.production_records.append(record)
    
    def _extract_alarms(self, db: ET.Element, mp: MeasurementPoint,
                        result: XMLExtractionResult) -> None:
        """Extrai alarmes (tipo 004)."""
        lista_alarmes = db.find('LISTA_ALARMES')
        if lista_alarmes is None:
            return
        
        for alarme in lista_alarmes.findall('ALARMES'):
            dt = self._get_datetime(alarme, 'DHA_ALARME')
            param = self._get_text(alarme, 'DSC_DADO_ALARMADO') or ''
            val = self._get_text(alarme, 'DSC_MEDIDA_ALARMADA') or ''
            
            if dt:
                mp.alarms.append(Alarm(
                    alarm_datetime=dt,
                    parameter=param,
                    value=val
                ))
    
    def _extract_events(self, db: ET.Element, mp: MeasurementPoint,
                        result: XMLExtractionResult) -> None:
        """Extrai eventos (tipo 004)."""
        lista_eventos = db.find('LISTA_EVENTOS')
        if lista_eventos is None:
            return
        
        for evento in lista_eventos.findall('EVENTOS'):
            dt = self._get_datetime(evento, 'DHA_OCORRENCIA_EVENTO')
            param = self._get_text(evento, 'DSC_DADO_ALTERADO') or ''
            orig = self._get_text(evento, 'DSC_CONTEUDO_ORIGINAL') or ''
            curr = self._get_text(evento, 'DSC_CONTEUDO_ATUAL') or ''
            
            if dt:
                mp.events.append(Event(
                    event_datetime=dt,
                    parameter=param,
                    original_value=orig,
                    new_value=curr
                ))


# ============================================================================
# CLASSE: XMLDatabaseLoader
# ============================================================================

class XMLDatabaseLoader:
    """Carrega dados XML extraídos no banco de dados SQLite."""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def load(self, result: XMLExtractionResult, installation_id: int = 1) -> Dict:
        """
        Carrega dados extraídos no banco.
        
        Returns:
            Dict com estatísticas
        """
        stats = {
            'import_id': None,
            'configs_inserted': 0,
            'production_records': 0,
            'alarms_inserted': 0,
            'events_inserted': 0,
            'instruments_inserted': 0
        }
        
        if not result.success or not result.metadata:
            return stats
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # 1. Registrar importação
            report_date = None
            if result.metadata.generation_timestamp:
                report_date = result.metadata.generation_timestamp.date().isoformat()
            
            cursor.execute("""
                INSERT OR IGNORE INTO import_log 
                (file_name, file_hash, file_type, report_date, records_extracted, status)
                VALUES (?, ?, ?, ?, ?, 'SUCCESS')
            """, (
                result.metadata.file_name,
                result.metadata.file_hash,
                f"XML_{result.metadata.xml_type.value}",
                report_date,
                len(result.measurement_points)
            ))
            
            cursor.execute("SELECT id FROM import_log WHERE file_hash = ?", 
                          (result.metadata.file_hash,))
            row = cursor.fetchone()
            if row:
                stats['import_id'] = row[0]
            
            # 2. Processar cada ponto de medição
            for mp in result.measurement_points:
                # Criar/obter meter
                if mp.cod_tag:
                    fluid_type = {
                        XMLType.A001: 'OIL',
                        XMLType.A002: 'GAS',
                        XMLType.A003: 'GAS'
                    }.get(result.metadata.xml_type)
                    
                    cursor.execute("""
                        INSERT OR IGNORE INTO meter (installation_id, tag, fluid_type)
                        VALUES (?, ?, ?)
                    """, (installation_id, mp.cod_tag, fluid_type))
                    
                    cursor.execute("""
                        SELECT id FROM meter WHERE tag = ? AND installation_id = ?
                    """, (mp.cod_tag, installation_id))
                    meter_row = cursor.fetchone()
                    meter_id = meter_row[0] if meter_row else None
                else:
                    meter_id = None
                
                # Inserir configuração CV
                if mp.config:
                    cursor.execute("""
                        INSERT INTO flow_computer_config
                        (import_id, meter_id, serial_number, collection_datetime,
                         temperature, atmospheric_pressure, reference_pressure,
                         relative_density, software_version)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        stats['import_id'],
                        meter_id,
                        mp.config.serial_number,
                        mp.config.collection_datetime.isoformat() if mp.config.collection_datetime else None,
                        mp.config.temperature,
                        mp.config.atmospheric_pressure,
                        mp.config.reference_pressure,
                        mp.config.relative_density,
                        mp.config.software_version
                    ))
                    config_id = cursor.lastrowid
                    stats['configs_inserted'] += 1
                    
                    # Inserir elemento primário
                    if mp.primary_element:
                        cursor.execute("""
                            INSERT INTO primary_element
                            (config_id, meter_id,
                             meter_factor_1, meter_factor_2, meter_factor_3, meter_factor_4,
                             meter_factor_5, meter_factor_6, meter_factor_7, meter_factor_8,
                             meter_factor_9, meter_factor_10, meter_factor_11, meter_factor_12,
                             pulses_mf_1, pulses_mf_2, pulses_mf_3, pulses_mf_4,
                             pulses_mf_5, pulses_mf_6, pulses_mf_7, pulses_mf_8,
                             pulses_mf_9, pulses_mf_10, pulses_mf_11, pulses_mf_12)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            config_id, meter_id,
                            mp.primary_element.meter_factors.get(1),
                            mp.primary_element.meter_factors.get(2),
                            mp.primary_element.meter_factors.get(3),
                            mp.primary_element.meter_factors.get(4),
                            mp.primary_element.meter_factors.get(5),
                            mp.primary_element.meter_factors.get(6),
                            mp.primary_element.meter_factors.get(7),
                            mp.primary_element.meter_factors.get(8),
                            mp.primary_element.meter_factors.get(9),
                            mp.primary_element.meter_factors.get(10),
                            mp.primary_element.meter_factors.get(11),
                            mp.primary_element.meter_factors.get(12),
                            mp.primary_element.pulses.get(1),
                            mp.primary_element.pulses.get(2),
                            mp.primary_element.pulses.get(3),
                            mp.primary_element.pulses.get(4),
                            mp.primary_element.pulses.get(5),
                            mp.primary_element.pulses.get(6),
                            mp.primary_element.pulses.get(7),
                            mp.primary_element.pulses.get(8),
                            mp.primary_element.pulses.get(9),
                            mp.primary_element.pulses.get(10),
                            mp.primary_element.pulses.get(11),
                            mp.primary_element.pulses.get(12)
                        ))
                    
                    # Inserir instrumentos
                    for inst in mp.pressure_instruments + mp.temperature_instruments:
                        table = 'pressure_instrument' if inst.instrument_type == 'PRESSAO' else 'temperature_instrument'
                        cursor.execute(f"""
                            INSERT INTO {table}
                            (config_id, serial_number, instrument_type, manufacturer, model,
                             range_low, range_high, last_calibration, uncertainty)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            config_id,
                            inst.serial_number,
                            inst.kind,
                            inst.manufacturer,
                            inst.model,
                            inst.range_low,
                            inst.range_high,
                            inst.last_calibration.isoformat() if inst.last_calibration else None,
                            inst.uncertainty
                        ))
                        stats['instruments_inserted'] += 1
                    
                    # Inserir registros de produção
                    for prod in mp.production_records:
                        cursor.execute("""
                            INSERT INTO production_record
                            (config_id, meter_id, import_id, period_start, period_end,
                             flow_duration_min, gross_volume_observed, gross_volume_corrected,
                             net_volume, corrected_volume, totalizer_start, totalizer_end,
                             bsw_percent, relative_density, static_pressure, temperature,
                             differential_pressure, ctl, cpl, ctpl, meter_factor)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            config_id, meter_id, stats['import_id'],
                            prod.period_start.isoformat() if prod.period_start else None,
                            prod.period_end.isoformat() if prod.period_end else None,
                            prod.flow_duration_min,
                            prod.gross_volume_observed, prod.gross_volume_corrected,
                            prod.net_volume, prod.corrected_volume,
                            prod.totalizer_start, prod.totalizer_end,
                            prod.bsw_percent, prod.relative_density,
                            prod.static_pressure, prod.temperature, prod.differential_pressure,
                            prod.ctl, prod.cpl, prod.ctpl, prod.meter_factor
                        ))
                        stats['production_records'] += 1
                else:
                    config_id = None
                
                # Inserir alarmes (tipo 004)
                for alarm in mp.alarms:
                    cursor.execute("""
                        INSERT INTO alarm
                        (import_id, config_id, alarm_datetime, parameter, value)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        stats['import_id'],
                        config_id,
                        alarm.alarm_datetime.isoformat(),
                        alarm.parameter,
                        alarm.value
                    ))
                    stats['alarms_inserted'] += 1
                
                # Inserir eventos (tipo 004)
                for event in mp.events:
                    cursor.execute("""
                        INSERT INTO event
                        (import_id, config_id, event_datetime, parameter, original_value, new_value)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        stats['import_id'],
                        config_id,
                        event.event_datetime.isoformat(),
                        event.parameter,
                        event.original_value,
                        event.new_value
                    ))
                    stats['events_inserted'] += 1
            
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            logger.exception("Erro ao carregar XML no banco")
            raise
        finally:
            conn.close()
        
        return stats


# ============================================================================
# FUNÇÕES DE PROCESSAMENTO
# ============================================================================

def process_xml_file(file_path: str, db_path: str, installation_id: int = 1) -> Dict:
    """
    Processa um arquivo XML ANP e carrega no banco.
    
    Args:
        file_path: Caminho do arquivo XML
        db_path: Caminho do banco SQLite
        installation_id: ID da instalação
        
    Returns:
        Dict com resultado
    """
    logger.info(f"Processando XML: {file_path}")
    
    extractor = XMLExtractor(file_path)
    result = extractor.extract()
    
    logger.info(f"Tipo: {result.metadata.xml_type.value if result.metadata else 'N/A'}")
    logger.info(f"Pontos de medição: {len(result.measurement_points)}")
    
    if result.warnings:
        for w in result.warnings:
            logger.warning(w)
    
    if result.errors:
        for e in result.errors:
            logger.error(e)
        return {'success': False, 'errors': result.errors}
    
    # Carregar no banco
    loader = XMLDatabaseLoader(db_path)
    stats = loader.load(result, installation_id)
    
    logger.info(f"Carregamento: {stats}")
    
    return {
        'success': True,
        'xml_type': result.metadata.xml_type.value if result.metadata else None,
        'measurement_points': len(result.measurement_points),
        'stats': stats
    }


def process_xml_directory(dir_path: str, db_path: str, installation_id: int = 1) -> List[Dict]:
    """Processa todos os arquivos XML em um diretório."""
    results = []
    dir_path = Path(dir_path)
    
    for file_path in dir_path.glob("*.xml"):
        try:
            result = process_xml_file(str(file_path), db_path, installation_id)
            results.append({'file': file_path.name, **result})
        except Exception as e:
            logger.exception(f"Erro ao processar {file_path.name}")
            results.append({'file': file_path.name, 'success': False, 'error': str(e)})
    
    return results


# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python xml_extractor.py <arquivo.xml ou diretório> [banco.db]")
        sys.exit(1)
    
    path = sys.argv[1]
    db_path = sys.argv[2] if len(sys.argv) > 2 else "mpfm_monitor.db"
    
    if os.path.isdir(path):
        results = process_xml_directory(path, db_path)
        print(f"\nProcessados {len(results)} arquivos XML")
        for r in results:
            status = "✅" if r.get('success') else "❌"
            print(f"  {status} {r['file']} ({r.get('xml_type', 'N/A')})")
    else:
        result = process_xml_file(path, db_path)
        print(f"\nResultado: {'✅ Sucesso' if result.get('success') else '❌ Falha'}")
