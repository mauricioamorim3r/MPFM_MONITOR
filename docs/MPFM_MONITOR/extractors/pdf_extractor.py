"""
MPFM Monitor - PDF Extractor
Extrator para relatórios PDF (calibração, PVT, avaliação de desempenho).
Usa pdfplumber para extração de texto e tabelas.
"""
import os
import re
import hashlib
import sqlite3
import logging
from datetime import datetime, date
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

try:
    import pdfplumber
except ImportError:
    pdfplumber = None
    
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============================================================================
# CONSTANTES
# ============================================================================

class PDFType(Enum):
    CALIBRATION = "CALIBRATION"
    PVT_REPORT = "PVT_REPORT"
    EVALUATION = "EVALUATION"
    NONCONFORMANCE = "NONCONFORMANCE"
    DAILY_REPORT = "DAILY_REPORT"
    CONFIGURATION = "CONFIGURATION"
    UNKNOWN = "UNKNOWN"


# Padrões para identificação de tipo de PDF
PDF_TYPE_PATTERNS = {
    PDFType.CALIBRATION: [
        r'calibra[çc][aã]o', r'calibration', r'certificado.*calibra',
        r'meter\s*factor', r'k[\-\s]*factor', r'prover'
    ],
    PDFType.PVT_REPORT: [
        r'pvt', r'fluid\s*characterization', r'eos\s*model',
        r'flash\s*calculation', r'composition', r'gas\s*chromatography'
    ],
    PDFType.EVALUATION: [
        r'avalia[çc][aã]o.*desempenho', r'performance\s*evaluation',
        r'mpfm\s*test', r'test\s*separator', r'deviation\s*report'
    ],
    PDFType.NONCONFORMANCE: [
        r'n[aã]o[\-\s]*conformidade', r'nonconformance', r'desenquadramento',
        r'contingência', r'contingency', r'deviation\s*report'
    ],
    PDFType.DAILY_REPORT: [
        r'daily\s*report', r'relat[oó]rio\s*di[aá]rio', r'produ[çc][aã]o\s*di[aá]ria'
    ],
    PDFType.CONFIGURATION: [
        r'configura[çc][aã]o', r'configuration', r'setup', r'parametriza[çc][aã]o'
    ]
}

# Padrões para extração de dados comuns
PATTERNS = {
    'date': r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
    'datetime': r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)',
    'tag': r'(\d{2}[A-Z]{2}\d{4}[A-B]?)',
    'serial': r'(?:S/?N|Serial)[\s:]*([A-Za-z0-9\-]+)',
    'meter_factor': r'(?:Meter\s*Factor|MF|K[\-\s]*Factor)[\s:]*(\d+[,\.]\d+)',
    'temperature': r'(?:Temp|Temperature)[\s:]*(\d+[,\.]\d+)\s*[°]?[CcFf]?',
    'pressure': r'(?:Press|Pressure)[\s:]*(\d+[,\.]\d+)\s*(?:kPa|bar|psi)?',
    'volume': r'(?:Volume|Vol)[\s:]*(\d+[,\.]\d+)\s*(?:m³|Sm³|bbl)?',
    'density': r'(?:Density|Dens)[\s:]*(\d+[,\.]\d+)\s*(?:kg/m³)?',
    'bsw': r'(?:BS&?W|BSW)[\s:]*(\d+[,\.]\d+)\s*%?',
}


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class PDFMetadata:
    """Metadados do arquivo PDF."""
    file_name: str
    file_hash: str
    pdf_type: PDFType
    num_pages: int
    title: Optional[str]
    author: Optional[str]
    creation_date: Optional[datetime]


@dataclass
class ExtractedTable:
    """Tabela extraída do PDF."""
    page_num: int
    headers: List[str]
    rows: List[List[str]]
    context: str  # Texto próximo à tabela para identificação


@dataclass
class ExtractedData:
    """Dados estruturados extraídos."""
    data_type: str  # 'meter_factor', 'calibration', 'pvt', etc.
    values: Dict[str, Any]
    source_page: int
    confidence: float  # 0-1, quão confiante estamos na extração


@dataclass
class PDFExtractionResult:
    """Resultado da extração de PDF."""
    success: bool
    metadata: Optional[PDFMetadata]
    raw_text: str = ""
    tables: List[ExtractedTable] = field(default_factory=list)
    extracted_data: List[ExtractedData] = field(default_factory=list)
    tags_found: List[str] = field(default_factory=list)
    dates_found: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


# ============================================================================
# CLASSE PRINCIPAL: PDFExtractor
# ============================================================================

class PDFExtractor:
    """
    Extrator de dados de arquivos PDF.
    Suporta relatórios de calibração, PVT, avaliação e não-conformidades.
    """
    
    def __init__(self, file_path: str):
        if pdfplumber is None:
            raise ImportError("pdfplumber é necessário. Instale com: pip install pdfplumber")
        
        self.file_path = Path(file_path)
        if not self.file_path.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        
        self._file_hash = None
        self._pdf_type = None
    
    @property
    def file_hash(self) -> str:
        """Calcula hash SHA-256 do arquivo."""
        if self._file_hash is None:
            with open(self.file_path, 'rb') as f:
                self._file_hash = hashlib.sha256(f.read()).hexdigest()
        return self._file_hash
    
    def _detect_pdf_type(self, text: str) -> PDFType:
        """Detecta tipo de PDF pelo conteúdo."""
        text_lower = text.lower()
        
        # Verificar cada tipo
        scores = {pt: 0 for pt in PDFType}
        
        for pdf_type, patterns in PDF_TYPE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    scores[pdf_type] += 1
        
        # Retornar tipo com maior score
        max_type = max(scores, key=scores.get)
        if scores[max_type] > 0:
            return max_type
        
        return PDFType.UNKNOWN
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """Parse várias formatos de data."""
        formats = [
            "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d",
            "%d/%m/%y", "%d-%m-%y",
            "%d %b %Y", "%d %B %Y"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
        
        return None
    
    def _parse_float(self, value_str: str) -> Optional[float]:
        """Parse número decimal."""
        if not value_str:
            return None
        
        try:
            # Limpar e converter
            clean = value_str.strip().replace(',', '.').replace(' ', '')
            return float(clean)
        except ValueError:
            return None
    
    def extract(self) -> PDFExtractionResult:
        """
        Extrai todos os dados do arquivo PDF.
        
        Returns:
            PDFExtractionResult com dados extraídos
        """
        result = PDFExtractionResult(success=False, metadata=None)
        
        try:
            with pdfplumber.open(self.file_path) as pdf:
                # Metadados básicos
                info = pdf.metadata or {}
                
                # Extrair texto de todas as páginas
                full_text = ""
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    full_text += page_text + "\n\n"
                
                result.raw_text = full_text
                
                # Detectar tipo
                pdf_type = self._detect_pdf_type(full_text)
                
                # Criar metadados
                creation_date = None
                if info.get('CreationDate'):
                    try:
                        # Formato Adobe: D:YYYYMMDDHHmmSS
                        cd = info['CreationDate']
                        if cd.startswith('D:'):
                            cd = cd[2:16]
                            creation_date = datetime.strptime(cd, "%Y%m%d%H%M%S")
                    except:
                        pass
                
                result.metadata = PDFMetadata(
                    file_name=self.file_path.name,
                    file_hash=self.file_hash,
                    pdf_type=pdf_type,
                    num_pages=len(pdf.pages),
                    title=info.get('Title'),
                    author=info.get('Author'),
                    creation_date=creation_date
                )
                
                # Extrair tabelas
                for i, page in enumerate(pdf.pages):
                    tables = page.extract_tables()
                    for table in tables:
                        if table and len(table) > 1:
                            # Limpar células vazias
                            clean_table = []
                            for row in table:
                                clean_row = [str(cell).strip() if cell else "" for cell in row]
                                if any(clean_row):
                                    clean_table.append(clean_row)
                            
                            if clean_table:
                                result.tables.append(ExtractedTable(
                                    page_num=i + 1,
                                    headers=clean_table[0] if clean_table else [],
                                    rows=clean_table[1:] if len(clean_table) > 1 else [],
                                    context=self._get_table_context(page, table)
                                ))
                
                # Extrair dados estruturados
                self._extract_structured_data(result)
                
                # Encontrar TAGs
                result.tags_found = list(set(re.findall(PATTERNS['tag'], full_text)))
                
                # Encontrar datas
                result.dates_found = list(set(re.findall(PATTERNS['date'], full_text)))
                
                result.success = True
                
        except Exception as e:
            result.errors.append(f"Erro ao processar PDF: {str(e)}")
            logger.exception("Erro na extração de PDF")
        
        return result
    
    def _get_table_context(self, page, table) -> str:
        """Obtém texto de contexto próximo à tabela."""
        try:
            text = page.extract_text() or ""
            # Pegar primeiras linhas como contexto
            lines = text.split('\n')[:5]
            return ' '.join(lines)
        except:
            return ""
    
    def _extract_structured_data(self, result: PDFExtractionResult) -> None:
        """Extrai dados estruturados do texto e tabelas."""
        text = result.raw_text
        
        # Extrair meter factors
        mf_matches = re.findall(PATTERNS['meter_factor'], text, re.IGNORECASE)
        for i, mf in enumerate(mf_matches):
            result.extracted_data.append(ExtractedData(
                data_type='meter_factor',
                values={'value': self._parse_float(mf)},
                source_page=1,
                confidence=0.7
            ))
        
        # Extrair temperaturas
        temp_matches = re.findall(PATTERNS['temperature'], text, re.IGNORECASE)
        for temp in temp_matches:
            result.extracted_data.append(ExtractedData(
                data_type='temperature',
                values={'value': self._parse_float(temp), 'unit': '°C'},
                source_page=1,
                confidence=0.6
            ))
        
        # Extrair pressões
        press_matches = re.findall(PATTERNS['pressure'], text, re.IGNORECASE)
        for press in press_matches:
            result.extracted_data.append(ExtractedData(
                data_type='pressure',
                values={'value': self._parse_float(press)},
                source_page=1,
                confidence=0.6
            ))
        
        # Extrair BSW
        bsw_matches = re.findall(PATTERNS['bsw'], text, re.IGNORECASE)
        for bsw in bsw_matches:
            result.extracted_data.append(ExtractedData(
                data_type='bsw',
                values={'value': self._parse_float(bsw), 'unit': '%'},
                source_page=1,
                confidence=0.8
            ))
        
        # Extrair números de série
        serial_matches = re.findall(PATTERNS['serial'], text, re.IGNORECASE)
        for serial in serial_matches:
            result.extracted_data.append(ExtractedData(
                data_type='serial_number',
                values={'value': serial.strip()},
                source_page=1,
                confidence=0.7
            ))
        
        # Processar tabelas para dados estruturados
        for table in result.tables:
            self._extract_from_table(table, result)
    
    def _extract_from_table(self, table: ExtractedTable, result: PDFExtractionResult) -> None:
        """Extrai dados estruturados de uma tabela."""
        headers_lower = [h.lower() for h in table.headers]
        
        # Detectar tipo de tabela pelos cabeçalhos
        is_calibration_table = any(
            h in ' '.join(headers_lower) 
            for h in ['meter factor', 'k-factor', 'calibration', 'prover']
        )
        
        is_production_table = any(
            h in ' '.join(headers_lower)
            for h in ['volume', 'mass', 'flow', 'production']
        )
        
        is_composition_table = any(
            h in ' '.join(headers_lower)
            for h in ['component', 'mol%', 'composition', 'c1', 'c2', 'n2', 'co2']
        )
        
        # Extrair dados conforme tipo
        if is_calibration_table:
            for row in table.rows:
                try:
                    # Tentar encontrar colunas de meter factor
                    values = {}
                    for i, header in enumerate(table.headers):
                        if i < len(row):
                            h_lower = header.lower()
                            if 'factor' in h_lower or 'mf' in h_lower:
                                values['meter_factor'] = self._parse_float(row[i])
                            elif 'run' in h_lower or 'prove' in h_lower:
                                values['run'] = row[i]
                            elif 'date' in h_lower:
                                values['date'] = row[i]
                    
                    if values:
                        result.extracted_data.append(ExtractedData(
                            data_type='calibration_record',
                            values=values,
                            source_page=table.page_num,
                            confidence=0.8
                        ))
                except Exception:
                    pass
        
        if is_composition_table:
            for row in table.rows:
                try:
                    if len(row) >= 2:
                        component = row[0].strip()
                        mol_pct = self._parse_float(row[1]) if len(row) > 1 else None
                        
                        if component and mol_pct is not None:
                            result.extracted_data.append(ExtractedData(
                                data_type='gas_composition',
                                values={'component': component, 'mol_pct': mol_pct},
                                source_page=table.page_num,
                                confidence=0.75
                            ))
                except Exception:
                    pass


# ============================================================================
# CLASSE: PDFDatabaseLoader
# ============================================================================

class PDFDatabaseLoader:
    """Carrega dados PDF extraídos no banco de dados."""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def load(self, result: PDFExtractionResult, installation_id: int = 1) -> Dict:
        """
        Carrega dados extraídos no banco.
        
        Returns:
            Dict com estatísticas
        """
        stats = {
            'import_id': None,
            'tables_stored': 0,
            'data_points_stored': 0,
            'tags_found': len(result.tags_found)
        }
        
        if not result.success or not result.metadata:
            return stats
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Determinar report_date
            report_date = None
            if result.dates_found:
                # Usar primeira data encontrada
                for date_str in result.dates_found:
                    parsed = self._parse_date(date_str)
                    if parsed:
                        report_date = parsed.isoformat()
                        break
            
            # Registrar importação
            cursor.execute("""
                INSERT OR IGNORE INTO import_log 
                (file_name, file_hash, file_type, report_date, records_extracted, status)
                VALUES (?, ?, ?, ?, ?, 'SUCCESS')
            """, (
                result.metadata.file_name,
                result.metadata.file_hash,
                f"PDF_{result.metadata.pdf_type.value}",
                report_date,
                len(result.extracted_data)
            ))
            
            cursor.execute("SELECT id FROM import_log WHERE file_hash = ?", 
                          (result.metadata.file_hash,))
            row = cursor.fetchone()
            if row:
                stats['import_id'] = row[0]
            
            # Criar meters para TAGs encontradas
            for tag in result.tags_found:
                cursor.execute("""
                    INSERT OR IGNORE INTO meter (installation_id, tag)
                    VALUES (?, ?)
                """, (installation_id, tag))
            
            # Armazenar texto bruto e dados extraídos em tabela genérica
            # (Para PDFs, criamos uma tabela específica se não existir)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pdf_extracted_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    import_id INTEGER REFERENCES import_log(id),
                    data_type TEXT,
                    data_json TEXT,
                    source_page INTEGER,
                    confidence REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Armazenar dados extraídos
            import json
            for data in result.extracted_data:
                cursor.execute("""
                    INSERT INTO pdf_extracted_data
                    (import_id, data_type, data_json, source_page, confidence)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    stats['import_id'],
                    data.data_type,
                    json.dumps(data.values),
                    data.source_page,
                    data.confidence
                ))
                stats['data_points_stored'] += 1
            
            # Armazenar tabelas extraídas
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pdf_extracted_table (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    import_id INTEGER REFERENCES import_log(id),
                    page_num INTEGER,
                    headers_json TEXT,
                    rows_json TEXT,
                    context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            for table in result.tables:
                cursor.execute("""
                    INSERT INTO pdf_extracted_table
                    (import_id, page_num, headers_json, rows_json, context)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    stats['import_id'],
                    table.page_num,
                    json.dumps(table.headers),
                    json.dumps(table.rows),
                    table.context
                ))
                stats['tables_stored'] += 1
            
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            logger.exception("Erro ao carregar PDF no banco")
            raise
        finally:
            conn.close()
        
        return stats
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """Parse data."""
        formats = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y"]
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
        return None


# ============================================================================
# FUNÇÕES DE PROCESSAMENTO
# ============================================================================

def process_pdf_file(file_path: str, db_path: str, installation_id: int = 1) -> Dict:
    """
    Processa um arquivo PDF e carrega no banco.
    
    Args:
        file_path: Caminho do arquivo PDF
        db_path: Caminho do banco SQLite
        installation_id: ID da instalação
        
    Returns:
        Dict com resultado
    """
    logger.info(f"Processando PDF: {file_path}")
    
    extractor = PDFExtractor(file_path)
    result = extractor.extract()
    
    logger.info(f"Tipo: {result.metadata.pdf_type.value if result.metadata else 'N/A'}")
    logger.info(f"Páginas: {result.metadata.num_pages if result.metadata else 0}")
    logger.info(f"Tabelas: {len(result.tables)}")
    logger.info(f"Dados extraídos: {len(result.extracted_data)}")
    logger.info(f"TAGs encontradas: {result.tags_found}")
    
    if result.warnings:
        for w in result.warnings:
            logger.warning(w)
    
    if result.errors:
        for e in result.errors:
            logger.error(e)
        return {'success': False, 'errors': result.errors}
    
    # Carregar no banco
    loader = PDFDatabaseLoader(db_path)
    stats = loader.load(result, installation_id)
    
    logger.info(f"Carregamento: {stats}")
    
    return {
        'success': True,
        'pdf_type': result.metadata.pdf_type.value if result.metadata else None,
        'pages': result.metadata.num_pages if result.metadata else 0,
        'tables': len(result.tables),
        'data_points': len(result.extracted_data),
        'tags_found': result.tags_found,
        'stats': stats
    }


def process_pdf_directory(dir_path: str, db_path: str, installation_id: int = 1) -> List[Dict]:
    """Processa todos os arquivos PDF em um diretório."""
    results = []
    dir_path = Path(dir_path)
    
    for file_path in dir_path.glob("*.pdf"):
        try:
            result = process_pdf_file(str(file_path), db_path, installation_id)
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
        print("Uso: python pdf_extractor.py <arquivo.pdf ou diretório> [banco.db]")
        sys.exit(1)
    
    path = sys.argv[1]
    db_path = sys.argv[2] if len(sys.argv) > 2 else "mpfm_monitor.db"
    
    if os.path.isdir(path):
        results = process_pdf_directory(path, db_path)
        print(f"\nProcessados {len(results)} arquivos PDF")
        for r in results:
            status = "✅" if r.get('success') else "❌"
            print(f"  {status} {r['file']} ({r.get('pdf_type', 'N/A')})")
    else:
        result = process_pdf_file(path, db_path)
        print(f"\nResultado: {'✅ Sucesso' if result.get('success') else '❌ Falha'}")
