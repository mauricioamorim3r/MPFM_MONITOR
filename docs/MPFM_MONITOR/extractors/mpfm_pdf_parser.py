"""
SGM-FM - MPFM PDF Parser
Parser especializado para relatórios MPFM em PDF.
Suporta: MPFM Hourly, MPFM Daily, PVTCalibration

Baseado no PRD Pipeline Diário SGM-FM v6
"""
import re
import hashlib
import logging
from datetime import datetime, date, timedelta
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS E CONSTANTES
# ============================================================================

class MPFMReportType(Enum):
    HOURLY = "MPFM_HOURLY"
    DAILY = "MPFM_DAILY"
    PVT_CALIBRATION = "PVT_CALIBRATION"
    UNKNOWN = "UNKNOWN"


# Padrões de nome de arquivo
FILENAME_PATTERNS = {
    MPFMReportType.HOURLY: [r'mpfm.*hourly', r'mpfm_hourly', r'mpfm-hourly'],
    MPFMReportType.DAILY: [r'mpfm.*daily', r'mpfm_daily', r'mpfm-daily'],
    MPFMReportType.PVT_CALIBRATION: [r'pvtcalibration', r'pvt.*calibration']
}

# Padrões de conteúdo para identificação
CONTENT_PATTERNS = {
    MPFMReportType.HOURLY: [r'hourly\s+report\s+from', r'production\s+previous\s+hour'],
    MPFMReportType.DAILY: [r'daily\s+report\s+from', r'production\s+previous\s+day'],
    MPFMReportType.PVT_CALIBRATION: [r'calibration\s+no', r'selected\s+mpfm', r'mass\s+correction\s+factors']
}

# Fases do MPFM
PHASES = ['Gas', 'Oil', 'HC', 'Water', 'Total']


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class MPFMProductionData:
    """Dados de produção MPFM (por fase)."""
    # 1. Massas não corrigidas (t)
    uncorr_mass_gas: Optional[float] = None
    uncorr_mass_oil: Optional[float] = None
    uncorr_mass_hc: Optional[float] = None
    uncorr_mass_water: Optional[float] = None
    uncorr_mass_total: Optional[float] = None
    
    # 2. Massas corrigidas (t)
    corr_mass_gas: Optional[float] = None
    corr_mass_oil: Optional[float] = None
    corr_mass_hc: Optional[float] = None
    corr_mass_water: Optional[float] = None
    corr_mass_total: Optional[float] = None
    
    # 3. Referência PVT Mass (t)
    pvt_ref_mass_gas: Optional[float] = None
    pvt_ref_mass_oil: Optional[float] = None
    pvt_ref_mass_water: Optional[float] = None
    # HC e Total geralmente são "-"
    
    # 4. Referência PVT Volume (Sm³)
    pvt_ref_vol_gas_sm3: Optional[float] = None
    pvt_ref_vol_oil_sm3: Optional[float] = None
    pvt_ref_vol_water_sm3: Optional[float] = None
    
    # 5. Referência PVT Mass @20°C (t)
    pvt_ref_mass_20c_gas: Optional[float] = None
    pvt_ref_mass_20c_oil: Optional[float] = None
    pvt_ref_mass_20c_water: Optional[float] = None
    
    # 6. Referência PVT Volume @20°C (Sm³)
    pvt_ref_vol_20c_gas_sm3: Optional[float] = None
    pvt_ref_vol_20c_oil_sm3: Optional[float] = None
    pvt_ref_vol_20c_water_sm3: Optional[float] = None


@dataclass
class MPFMAverages:
    """Médias ponderadas MPFM."""
    pressure_kpa: Optional[float] = None
    temperature_c: Optional[float] = None
    density_gas: Optional[float] = None
    density_oil: Optional[float] = None
    density_water: Optional[float] = None


@dataclass
class MPFMHourlyRecord:
    """Registro MPFM Hourly."""
    asset_tag: str
    bank: Optional[str]
    stream: Optional[str]
    riser_name: Optional[str]
    
    period_start: datetime
    period_end: datetime
    hour_of_day: int
    
    production: MPFMProductionData
    averages: Optional[MPFMAverages] = None
    
    source_file: str = ""
    source_page: int = 0
    quality_flags: List[str] = field(default_factory=list)


@dataclass
class MPFMDailyRecord:
    """Registro MPFM Daily."""
    asset_tag: str
    bank: Optional[str]
    stream: Optional[str]
    riser_name: Optional[str]
    
    report_date: date
    period_start: datetime
    period_end: datetime
    
    production: MPFMProductionData
    averages: Optional[MPFMAverages] = None
    
    source_file: str = ""
    source_page: int = 0
    quality_flags: List[str] = field(default_factory=list)


@dataclass
class PVTCalibrationRecord:
    """Registro de calibração PVT."""
    calibration_no: int
    selected_mpfm: str
    asset_tag: Optional[str]
    
    calibration_started: Optional[datetime]
    calibration_ended: Optional[datetime]
    status: str
    
    # Average Values - MPFM
    avg_pressure_mpfm_kpa: Optional[float] = None
    avg_temperature_mpfm_c: Optional[float] = None
    avg_density_oil_mpfm: Optional[float] = None
    avg_density_gas_mpfm: Optional[float] = None
    avg_density_water_mpfm: Optional[float] = None
    
    # Average Values - Separator
    avg_pressure_sep_kpa: Optional[float] = None
    avg_temperature_sep_c: Optional[float] = None
    avg_density_oil_sep: Optional[float] = None
    avg_density_gas_sep: Optional[float] = None
    avg_density_water_sep: Optional[float] = None
    
    # Accumulated mass - MPFM (t)
    accum_mass_oil_mpfm: Optional[float] = None
    accum_mass_gas_mpfm: Optional[float] = None
    accum_mass_water_mpfm: Optional[float] = None
    accum_mass_hc_mpfm: Optional[float] = None
    
    # Accumulated mass - Separator (t)
    accum_mass_oil_sep: Optional[float] = None
    accum_mass_gas_sep: Optional[float] = None
    accum_mass_water_sep: Optional[float] = None
    accum_mass_hc_sep: Optional[float] = None
    
    # Mass Correction Factors - Used
    k_factor_oil_used: Optional[float] = None
    k_factor_gas_used: Optional[float] = None
    k_factor_water_used: Optional[float] = None
    k_factor_hc_used: Optional[float] = None
    
    # Mass Correction Factors - New
    k_factor_oil_new: Optional[float] = None
    k_factor_gas_new: Optional[float] = None
    k_factor_water_new: Optional[float] = None
    k_factor_hc_new: Optional[float] = None
    
    # Flags
    water_new_factor_flag: Optional[str] = None  # ignore_for_k_update
    k_factor_outlier_flag: Optional[str] = None
    
    # PVT Reference volumes
    pvt_ref_vol_oil_sm3: Optional[float] = None
    pvt_ref_vol_gas_sm3: Optional[float] = None
    
    source_file: str = ""
    quality_flags: List[str] = field(default_factory=list)


@dataclass
class MPFMExtractionResult:
    """Resultado da extração de PDF MPFM."""
    success: bool
    report_type: MPFMReportType
    file_name: str
    file_hash: str
    
    hourly_records: List[MPFMHourlyRecord] = field(default_factory=list)
    daily_records: List[MPFMDailyRecord] = field(default_factory=list)
    calibration_records: List[PVTCalibrationRecord] = field(default_factory=list)
    
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


# ============================================================================
# CLASSE: MPFMPDFParser
# ============================================================================

class MPFMPDFParser:
    """
    Parser especializado para relatórios MPFM em PDF.
    """
    
    def __init__(self, file_path: str):
        if pdfplumber is None:
            raise ImportError("pdfplumber é necessário. Instale: pip install pdfplumber")
        
        self.file_path = Path(file_path)
        if not self.file_path.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        
        self._file_hash = None
        self._text_cache = {}
    
    @property
    def file_hash(self) -> str:
        """Calcula SHA-256."""
        if self._file_hash is None:
            with open(self.file_path, 'rb') as f:
                self._file_hash = hashlib.sha256(f.read()).hexdigest()
        return self._file_hash
    
    def _detect_report_type(self, text: str) -> MPFMReportType:
        """Detecta tipo de relatório pelo conteúdo."""
        text_lower = text.lower()
        
        # Por nome de arquivo
        name_lower = self.file_path.name.lower()
        for report_type, patterns in FILENAME_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, name_lower):
                    return report_type
        
        # Por conteúdo
        for report_type, patterns in CONTENT_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return report_type
        
        return MPFMReportType.UNKNOWN
    
    def _parse_datetime(self, text: str) -> Optional[datetime]:
        """Parse datetime em vários formatos."""
        if not text:
            return None
        
        text = text.strip()
        
        # Formatos conhecidos
        formats = [
            "%Y.%m.%d %H:%M",           # 2026.01.25 01:00
            "%d.%m.%Y %H:%M",           # 25.01.2026 01:00
            "%Y-%m-%d %H:%M:%S",        # 2026-01-25 01:00:00
            "%d/%m/%Y %H:%M",           # 25/01/2026 01:00
            "%Y-%m-%dT%H:%M:%S",        # ISO format
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(text, fmt)
            except ValueError:
                continue
        
        return None
    
    def _parse_float(self, text: str) -> Optional[float]:
        """Parse número decimal."""
        if not text or text.strip() in ['-', '', 'N/A', 'n/a']:
            return None
        
        try:
            # Limpar e converter
            clean = text.strip().replace(',', '.').replace(' ', '')
            # Remover unidade se presente
            clean = re.sub(r'[a-zA-Z³°]+$', '', clean)
            return float(clean)
        except ValueError:
            return None
    
    def _extract_asset_tag(self, text: str) -> Optional[str]:
        """Extrai TAG do medidor."""
        # Padrão: "Riser P5 - 13FT0367" ou "N1 - 13FT0367"
        match = re.search(r'(\d{2}[A-Z]{2}\d{4}[A-B]?)', text)
        return match.group(1) if match else None
    
    def _extract_bank_stream(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """Extrai Bank e Stream do nome ou conteúdo."""
        bank = None
        stream = None
        
        # Padrão nome arquivo: B03_...
        match = re.search(r'B(\d{2})', text, re.IGNORECASE)
        if match:
            bank = match.group(1)
        
        # Padrão: Bank03_Stream01
        match = re.search(r'bank\s*(\d+)', text, re.IGNORECASE)
        if match:
            bank = match.group(1).zfill(2)
        
        match = re.search(r'stream\s*(\d+)', text, re.IGNORECASE)
        if match:
            stream = match.group(1).zfill(2)
        
        return bank, stream
    
    def _extract_period(self, text: str) -> Tuple[Optional[datetime], Optional[datetime]]:
        """Extrai período (start, end) do cabeçalho."""
        # Padrão: "Hourly Report from 2026.01.25 00:00 to 2026.01.25 01:00"
        match = re.search(
            r'(?:hourly|daily)\s+report\s+from\s+([\d\.\-/]+\s+[\d:]+)\s+to\s+([\d\.\-/]+\s+[\d:]+)',
            text, re.IGNORECASE
        )
        
        if match:
            start = self._parse_datetime(match.group(1))
            end = self._parse_datetime(match.group(2))
            return start, end
        
        return None, None
    
    def _extract_production_table(self, text: str, section_name: str = "Production") -> MPFMProductionData:
        """
        Extrai tabela de produção do texto.
        """
        data = MPFMProductionData()
        lines = text.split('\n')
        
        for line in lines:
            line_lower = line.lower()
            
            # 1. MPFM uncorrected mass
            if 'mpfm uncorrected mass' in line_lower:
                values = self._extract_phase_values(line)
                if values:
                    data.uncorr_mass_gas = values.get('Gas')
                    data.uncorr_mass_oil = values.get('Oil')
                    data.uncorr_mass_hc = values.get('HC')
                    data.uncorr_mass_water = values.get('Water')
                    data.uncorr_mass_total = values.get('Total')
            
            # 2. MPFM corrected mass
            elif 'mpfm corrected mass' in line_lower:
                values = self._extract_phase_values(line)
                if values:
                    data.corr_mass_gas = values.get('Gas')
                    data.corr_mass_oil = values.get('Oil')
                    data.corr_mass_hc = values.get('HC')
                    data.corr_mass_water = values.get('Water')
                    data.corr_mass_total = values.get('Total')
            
            # 3. PVT reference mass (normal)
            elif 'pvt reference mass' in line_lower and '20' not in line_lower:
                values = self._extract_phase_values(line)
                if values:
                    data.pvt_ref_mass_gas = values.get('Gas')
                    data.pvt_ref_mass_oil = values.get('Oil')
                    data.pvt_ref_mass_water = values.get('Water')
            
            # 4. PVT reference volume (normal)
            elif 'pvt reference volume' in line_lower and '20' not in line_lower:
                values = self._extract_phase_values(line)
                if values:
                    data.pvt_ref_vol_gas_sm3 = values.get('Gas')
                    data.pvt_ref_vol_oil_sm3 = values.get('Oil')
                    data.pvt_ref_vol_water_sm3 = values.get('Water')
            
            # 5. PVT reference mass @20 degC
            elif 'pvt reference mass' in line_lower and '20' in line_lower:
                values = self._extract_phase_values(line)
                if values:
                    data.pvt_ref_mass_20c_gas = values.get('Gas')
                    data.pvt_ref_mass_20c_oil = values.get('Oil')
                    data.pvt_ref_mass_20c_water = values.get('Water')

            # 6. PVT reference volume @20 degC
            elif 'pvt reference volume' in line_lower and '20' in line_lower:
                values = self._extract_phase_values(line)
                if values:
                    data.pvt_ref_vol_20c_gas_sm3 = values.get('Gas')
                    data.pvt_ref_vol_20c_oil_sm3 = values.get('Oil')
                    data.pvt_ref_vol_20c_water_sm3 = values.get('Water')
        
        return data
        
        return data
    
    def _extract_phase_values(self, line: str) -> Dict[str, float]:
        """
        Extrai valores por fase de uma linha.
        Assume ordem: Gas, Oil, HC, Water, Total
        """
        # Extrair todos os números da linha
        numbers = re.findall(r'[\-\d]+\.?\d*', line)
        
        values = {}
        phase_order = ['Gas', 'Oil', 'HC', 'Water', 'Total']
        
        for i, num_str in enumerate(numbers):
            if i < len(phase_order):
                val = self._parse_float(num_str)
                if val is not None:
                    values[phase_order[i]] = val
        
        return values
    
    def _extract_averages(self, text: str) -> MPFMAverages:
        """Extrai médias ponderadas."""
        averages = MPFMAverages()
        
        lines = text.split('\n')
        
        for line in lines:
            line_lower = line.lower()
            
            if 'pressure' in line_lower and 'kpa' in line_lower:
                match = re.search(r'(\d+\.?\d*)\s*kpa', line_lower)
                if match:
                    averages.pressure_kpa = self._parse_float(match.group(1))
            
            elif 'temperature' in line_lower:
                match = re.search(r'(\d+\.?\d*)\s*[°c]', line_lower)
                if match:
                    averages.temperature_c = self._parse_float(match.group(1))
            
            elif 'density' in line_lower:
                if 'gas' in line_lower:
                    match = re.search(r'(\d+\.?\d*)\s*kg', line_lower)
                    if match:
                        averages.density_gas = self._parse_float(match.group(1))
                elif 'oil' in line_lower:
                    match = re.search(r'(\d+\.?\d*)\s*kg', line_lower)
                    if match:
                        averages.density_oil = self._parse_float(match.group(1))
                elif 'water' in line_lower:
                    match = re.search(r'(\d+\.?\d*)\s*kg', line_lower)
                    if match:
                        averages.density_water = self._parse_float(match.group(1))
        
        return averages
    
    def _parse_hourly(self, pdf) -> List[MPFMHourlyRecord]:
        """Parse relatório MPFM Hourly."""
        records = []
        
        full_text = ""
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            full_text += page_text + "\n"
        
        # Extrair metadados
        period_start, period_end = self._extract_period(full_text)
        asset_tag = self._extract_asset_tag(full_text)
        bank, stream = self._extract_bank_stream(self.file_path.name + " " + full_text)
        
        # Extrair nome do riser
        riser_match = re.search(r'(Riser\s+[A-Z]\d+)', full_text, re.IGNORECASE)
        riser_name = riser_match.group(1) if riser_match else None
        
        if not period_start:
            logger.warning(f"Não foi possível extrair período de {self.file_path.name}")
            return records
        
        # Extrair dados de produção
        production = self._extract_production_table(full_text)
        averages = self._extract_averages(full_text)
        
        # Determinar hora do dia
        hour_of_day = period_end.hour if period_end else period_start.hour
        
        record = MPFMHourlyRecord(
            asset_tag=asset_tag or "UNKNOWN",
            bank=bank,
            stream=stream,
            riser_name=riser_name,
            period_start=period_start,
            period_end=period_end or period_start + timedelta(hours=1),
            hour_of_day=hour_of_day,
            production=production,
            averages=averages,
            source_file=self.file_path.name,
            source_page=1
        )
        
        records.append(record)
        
        return records
    
    def _parse_daily(self, pdf) -> List[MPFMDailyRecord]:
        """Parse relatório MPFM Daily."""
        records = []
        
        full_text = ""
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            full_text += page_text + "\n"
        
        # Extrair metadados
        period_start, period_end = self._extract_period(full_text)
        
        # Um PDF Daily pode ter múltiplos pontos (risers)
        # Procurar todas as seções de ponto
        point_sections = re.split(r'(Riser\s+[A-Z]\d+\s*-\s*\d{2}[A-Z]{2}\d{4})', full_text)
        
        if len(point_sections) <= 1:
            # Apenas um ponto ou formato diferente
            asset_tag = self._extract_asset_tag(full_text)
            bank, stream = self._extract_bank_stream(self.file_path.name + " " + full_text)
            
            production = self._extract_production_table(full_text)
            averages = self._extract_averages(full_text)
            
            report_date = period_start.date() if period_start else date.today()
            
            record = MPFMDailyRecord(
                asset_tag=asset_tag or "UNKNOWN",
                bank=bank,
                stream=stream,
                riser_name=None,
                report_date=report_date,
                period_start=period_start or datetime.combine(report_date, datetime.min.time()),
                period_end=period_end or datetime.combine(report_date + timedelta(days=1), datetime.min.time()),
                production=production,
                averages=averages,
                source_file=self.file_path.name,
                source_page=1
            )
            
            records.append(record)
        else:
            # Múltiplos pontos
            for i in range(1, len(point_sections), 2):
                if i + 1 < len(point_sections):
                    section_header = point_sections[i]
                    section_content = point_sections[i + 1]
                    
                    asset_tag = self._extract_asset_tag(section_header)
                    riser_match = re.search(r'(Riser\s+[A-Z]\d+)', section_header, re.IGNORECASE)
                    riser_name = riser_match.group(1) if riser_match else None
                    
                    bank, stream = self._extract_bank_stream(self.file_path.name)
                    
                    production = self._extract_production_table(section_content)
                    averages = self._extract_averages(section_content)
                    
                    report_date = period_start.date() if period_start else date.today()
                    
                    record = MPFMDailyRecord(
                        asset_tag=asset_tag or "UNKNOWN",
                        bank=bank,
                        stream=stream,
                        riser_name=riser_name,
                        report_date=report_date,
                        period_start=period_start or datetime.combine(report_date, datetime.min.time()),
                        period_end=period_end or datetime.combine(report_date + timedelta(days=1), datetime.min.time()),
                        production=production,
                        averages=averages,
                        source_file=self.file_path.name,
                        source_page=1
                    )
                    
                    records.append(record)
        
        return records
    
    def _parse_pvt_calibration(self, pdf) -> List[PVTCalibrationRecord]:
        """Parse relatório PVTCalibration."""
        records = []
        
        full_text = ""
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            full_text += page_text + "\n"
        
        # Extrair Calibration No
        cal_no_match = re.search(r'calibration\s+no\.?\s*[:\s]*(\d+)', full_text, re.IGNORECASE)
        calibration_no = int(cal_no_match.group(1)) if cal_no_match else 0
        
        # Extrair Selected MPFM
        mpfm_match = re.search(r'selected\s+mpfm\s*[:\s]*([^\n]+)', full_text, re.IGNORECASE)
        selected_mpfm = mpfm_match.group(1).strip() if mpfm_match else ""
        asset_tag = self._extract_asset_tag(selected_mpfm)
        
        # Extrair Status
        status_match = re.search(r'status\s*[:\s]*(completed[^\n]*|in\s+progress[^\n]*)', full_text, re.IGNORECASE)
        status = status_match.group(1).strip() if status_match else "Unknown"
        
        # Extrair datas
        start_match = re.search(r'calibration\s+started\s*[:\s]*([\d\.\-/]+\s+[\d:]+)', full_text, re.IGNORECASE)
        end_match = re.search(r'calibration\s+ended\s*[:\s]*([\d\.\-/]+\s+[\d:]+)', full_text, re.IGNORECASE)
        
        cal_started = self._parse_datetime(start_match.group(1)) if start_match else None
        cal_ended = self._parse_datetime(end_match.group(1)) if end_match else None
        
        record = PVTCalibrationRecord(
            calibration_no=calibration_no,
            selected_mpfm=selected_mpfm,
            asset_tag=asset_tag,
            calibration_started=cal_started,
            calibration_ended=cal_ended,
            status=status,
            source_file=self.file_path.name
        )
        
        # Extrair Average Values - procurar na tabela
        self._extract_avg_values(full_text, record)
        
        # Extrair Accumulated mass
        self._extract_accum_mass(full_text, record)
        
        # Extrair Mass Correction Factors
        self._extract_k_factors(full_text, record)
        
        # Aplicar regra: não propor K novo para água
        if record.k_factor_water_new is not None:
            if record.k_factor_water_new > 2.0 or record.k_factor_water_new < 0.5:
                record.water_new_factor_flag = "ignore_for_k_update"
        
        # Verificar outliers de K-Factor
        for phase, k_val in [('oil', record.k_factor_oil_new), 
                            ('gas', record.k_factor_gas_new),
                            ('hc', record.k_factor_hc_new)]:
            if k_val is not None and (k_val < 0.5 or k_val > 1.5):
                record.k_factor_outlier_flag = f"cal_factor_outlier_{phase}"
                record.quality_flags.append(f"k_{phase}_outlier")
        
        records.append(record)
        
        return records
    
    def _extract_avg_values(self, text: str, record: PVTCalibrationRecord) -> None:
        """Extrai Average Values do texto."""
        lines = text.split('\n')
        
        in_avg_section = False
        for line in lines:
            line_lower = line.lower()
            
            if 'average values' in line_lower:
                in_avg_section = True
                continue
            
            if in_avg_section:
                if 'pressure' in line_lower:
                    numbers = re.findall(r'(\d+\.?\d*)', line)
                    if len(numbers) >= 2:
                        record.avg_pressure_mpfm_kpa = self._parse_float(numbers[0])
                        record.avg_pressure_sep_kpa = self._parse_float(numbers[1])
                
                elif 'temperature' in line_lower:
                    numbers = re.findall(r'(\d+\.?\d*)', line)
                    if len(numbers) >= 2:
                        record.avg_temperature_mpfm_c = self._parse_float(numbers[0])
                        record.avg_temperature_sep_c = self._parse_float(numbers[1])
                
                elif 'density' in line_lower and 'oil' in line_lower:
                    numbers = re.findall(r'(\d+\.?\d*)', line)
                    if len(numbers) >= 2:
                        record.avg_density_oil_mpfm = self._parse_float(numbers[0])
                        record.avg_density_oil_sep = self._parse_float(numbers[1])
                
                elif 'density' in line_lower and 'gas' in line_lower:
                    numbers = re.findall(r'(\d+\.?\d*)', line)
                    if len(numbers) >= 2:
                        record.avg_density_gas_mpfm = self._parse_float(numbers[0])
                        record.avg_density_gas_sep = self._parse_float(numbers[1])
                
                # Fim da seção
                if 'accumulated' in line_lower or 'mass correction' in line_lower:
                    in_avg_section = False
    
    def _extract_accum_mass(self, text: str, record: PVTCalibrationRecord) -> None:
        """Extrai Accumulated mass during calibration."""
        lines = text.split('\n')
        
        in_accum_section = False
        for line in lines:
            line_lower = line.lower()
            
            if 'accumulated mass' in line_lower:
                in_accum_section = True
                continue
            
            if in_accum_section:
                numbers = re.findall(r'(\d+\.?\d*)', line)
                
                if 'oil' in line_lower and len(numbers) >= 2:
                    record.accum_mass_oil_mpfm = self._parse_float(numbers[0])
                    record.accum_mass_oil_sep = self._parse_float(numbers[1])
                
                elif 'gas' in line_lower and len(numbers) >= 2:
                    record.accum_mass_gas_mpfm = self._parse_float(numbers[0])
                    record.accum_mass_gas_sep = self._parse_float(numbers[1])
                
                elif 'water' in line_lower and len(numbers) >= 2:
                    record.accum_mass_water_mpfm = self._parse_float(numbers[0])
                    record.accum_mass_water_sep = self._parse_float(numbers[1])
                
                elif 'hc' in line_lower and len(numbers) >= 2:
                    record.accum_mass_hc_mpfm = self._parse_float(numbers[0])
                    record.accum_mass_hc_sep = self._parse_float(numbers[1])
                
                if 'mass correction' in line_lower or 'pvt' in line_lower:
                    in_accum_section = False
    
    def _extract_k_factors(self, text: str, record: PVTCalibrationRecord) -> None:
        """Extrai Mass Correction Factors."""
        lines = text.split('\n')
        
        in_kfactor_section = False
        for line in lines:
            line_lower = line.lower()
            
            if 'mass correction factor' in line_lower:
                in_kfactor_section = True
                continue
            
            if in_kfactor_section:
                numbers = re.findall(r'(\d+\.?\d*)', line)
                
                if 'oil' in line_lower and len(numbers) >= 2:
                    record.k_factor_oil_used = self._parse_float(numbers[0])
                    record.k_factor_oil_new = self._parse_float(numbers[1])
                
                elif 'gas' in line_lower and len(numbers) >= 2:
                    record.k_factor_gas_used = self._parse_float(numbers[0])
                    record.k_factor_gas_new = self._parse_float(numbers[1])
                
                elif 'water' in line_lower and len(numbers) >= 2:
                    record.k_factor_water_used = self._parse_float(numbers[0])
                    record.k_factor_water_new = self._parse_float(numbers[1])
                
                elif 'hc' in line_lower and len(numbers) >= 2:
                    record.k_factor_hc_used = self._parse_float(numbers[0])
                    record.k_factor_hc_new = self._parse_float(numbers[1])
                
                if 'pvt calculated' in line_lower or 'reference' in line_lower:
                    in_kfactor_section = False
    
    def extract(self) -> MPFMExtractionResult:
        """
        Extrai dados do PDF MPFM.
        
        Returns:
            MPFMExtractionResult com registros extraídos
        """
        result = MPFMExtractionResult(
            success=False,
            report_type=MPFMReportType.UNKNOWN,
            file_name=self.file_path.name,
            file_hash=self.file_hash
        )
        
        try:
            with pdfplumber.open(self.file_path) as pdf:
                # Extrair texto da primeira página para detectar tipo
                first_page_text = pdf.pages[0].extract_text() or ""
                
                result.report_type = self._detect_report_type(first_page_text)
                
                if result.report_type == MPFMReportType.HOURLY:
                    result.hourly_records = self._parse_hourly(pdf)
                    
                elif result.report_type == MPFMReportType.DAILY:
                    result.daily_records = self._parse_daily(pdf)
                    
                elif result.report_type == MPFMReportType.PVT_CALIBRATION:
                    result.calibration_records = self._parse_pvt_calibration(pdf)
                    
                else:
                    result.errors.append(f"Tipo de relatório não reconhecido: {self.file_path.name}")
                    return result
                
                result.success = True
                
        except Exception as e:
            result.errors.append(f"Erro ao processar PDF: {str(e)}")
            logger.exception(f"Erro no parser MPFM: {self.file_path.name}")
        
        return result


# ============================================================================
# FUNÇÕES DE CONVENIÊNCIA
# ============================================================================

def parse_mpfm_pdf(file_path: str) -> MPFMExtractionResult:
    """Parse um arquivo PDF MPFM."""
    parser = MPFMPDFParser(file_path)
    return parser.extract()


def parse_mpfm_directory(dir_path: str) -> List[MPFMExtractionResult]:
    """Parse todos os PDFs MPFM em um diretório."""
    results = []
    
    for file_path in Path(dir_path).glob("*.pdf"):
        try:
            result = parse_mpfm_pdf(str(file_path))
            results.append(result)
        except Exception as e:
            logger.error(f"Erro ao processar {file_path.name}: {e}")
    
    return results


# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python mpfm_pdf_parser.py <arquivo.pdf ou diretório>")
        sys.exit(1)
    
    path = sys.argv[1]
    
    if Path(path).is_dir():
        results = parse_mpfm_directory(path)
        
        print(f"\n📊 Processados {len(results)} arquivos PDF")
        
        for r in results:
            status = "✅" if r.success else "❌"
            record_count = len(r.hourly_records) + len(r.daily_records) + len(r.calibration_records)
            print(f"  {status} {r.file_name} ({r.report_type.value}) - {record_count} registros")
    else:
        result = parse_mpfm_pdf(path)
        
        print(f"\n📊 Resultado: {result.file_name}")
        print(f"   Tipo: {result.report_type.value}")
        print(f"   Sucesso: {result.success}")
        
        if result.hourly_records:
            print(f"   Registros Hourly: {len(result.hourly_records)}")
            for hr in result.hourly_records:
                print(f"      {hr.asset_tag} - {hr.period_start} - {hr.period_end}")
                print(f"         Corr HC: {hr.production.corr_mass_hc} t")
        
        if result.daily_records:
            print(f"   Registros Daily: {len(result.daily_records)}")
            for dr in result.daily_records:
                print(f"      {dr.asset_tag} - {dr.report_date}")
                print(f"         Corr HC: {dr.production.corr_mass_hc} t")
        
        if result.calibration_records:
            print(f"   Registros Calibration: {len(result.calibration_records)}")
            for cr in result.calibration_records:
                print(f"      Cal #{cr.calibration_no} - {cr.selected_mpfm}")
                print(f"         K Oil New: {cr.k_factor_oil_new}")
