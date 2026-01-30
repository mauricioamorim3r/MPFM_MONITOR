"""
SGM-FM - Pipeline de Ingestão Diário
Pipeline completo para ingestão de dados de medição multifásica.
Suporta: Excel, XML ANP, PDF MPFM, ZIP batches
"""
import os
import sys
import zipfile
import hashlib
import sqlite3
import json
import logging
import shutil
from datetime import datetime, date, timedelta
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
from collections import defaultdict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============================================================================
# CONSTANTES E ENUMS
# ============================================================================

class FileType(Enum):
    DAILY_OIL = "DAILY_OIL"
    DAILY_GAS = "DAILY_GAS"
    DAILY_WATER = "DAILY_WATER"
    GAS_BALANCE = "GAS_BALANCE"
    MPFM_HOURLY = "MPFM_HOURLY"
    MPFM_DAILY = "MPFM_DAILY"
    PVT_CALIBRATION = "PVT_CALIBRATION"
    XML_001 = "XML_001"
    XML_002 = "XML_002"
    XML_003 = "XML_003"
    XML_004 = "XML_004"
    UNKNOWN = "UNKNOWN"


class ParseStatus(Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


# Padrões de nome de arquivo
FILE_PATTERNS = {
    FileType.DAILY_OIL: ['daily_oil', 'dailyoil'],
    FileType.DAILY_GAS: ['daily_gas', 'dailygas'],
    FileType.DAILY_WATER: ['daily_water', 'dailywater'],
    FileType.GAS_BALANCE: ['gasbalance', 'gas_balance'],
    FileType.MPFM_HOURLY: ['mpfm_hourly', 'mpfm-hourly'],
    FileType.MPFM_DAILY: ['mpfm_daily', 'mpfm-daily'],
    FileType.PVT_CALIBRATION: ['pvtcalibration', 'pvt_calibration'],
    FileType.XML_001: ['001_'],
    FileType.XML_002: ['002_'],
    FileType.XML_003: ['003_'],
    FileType.XML_004: ['004_'],
}


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class FileInfo:
    """Informações de um arquivo para processamento."""
    path: Path
    name: str
    hash: str
    size: int
    file_type: FileType
    report_date: Optional[date] = None
    asset_tag: Optional[str] = None
    hour_of_day: Optional[int] = None


@dataclass
class BatchInfo:
    """Informações de um lote de arquivos."""
    batch_id: Optional[int] = None
    package_name: str = ""
    package_hash: str = ""
    files: List[FileInfo] = field(default_factory=list)
    total_files: int = 0
    by_date: Dict[date, List[FileInfo]] = field(default_factory=dict)
    by_asset: Dict[str, List[FileInfo]] = field(default_factory=dict)


@dataclass
class ProcessingResult:
    """Resultado do processamento de um arquivo."""
    file_info: FileInfo
    staged_file_id: Optional[int] = None
    status: ParseStatus = ParseStatus.PENDING
    records_extracted: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    quality_flags: List[str] = field(default_factory=list)


@dataclass
class PipelineResult:
    """Resultado completo do pipeline."""
    batch_info: BatchInfo
    results: List[ProcessingResult] = field(default_factory=list)
    manifests: List[Dict] = field(default_factory=list)
    reconciliations: List[Dict] = field(default_factory=list)
    validations: List[Dict] = field(default_factory=list)


# ============================================================================
# CLASSE: IngestionPipeline
# ============================================================================

class IngestionPipeline:
    """
    Pipeline de ingestão diário.
    
    Executa:
    1. Descoberta e indexação de arquivos
    2. Validação de completude (24 Hourly + 1 Daily)
    3. Parsing de cada arquivo
    4. Reconciliação Hourly vs Daily
    5. Validação cruzada
    6. Carga na base única
    """
    
    def __init__(self, db_path: str, work_dir: str = None, installation_id: int = 1):
        self.db_path = db_path
        self.work_dir = Path(work_dir) if work_dir else Path.cwd() / "data" / "processing"
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self.installation_id = installation_id
        
        # Importar extratores
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from extractors.excel_extractor import ExcelExtractor, DatabaseLoader as ExcelLoader
        from extractors.xml_extractor import XMLExtractor, XMLDatabaseLoader
        
        self.ExcelExtractor = ExcelExtractor
        self.ExcelLoader = ExcelLoader
        self.XMLExtractor = XMLExtractor
        self.XMLDatabaseLoader = XMLDatabaseLoader
    
    def calculate_hash(self, file_path: Path) -> str:
        """Calcula SHA-256 de um arquivo."""
        with open(file_path, 'rb') as f:
            return hashlib.sha256(f.read()).hexdigest()
    
    def detect_file_type(self, file_path: Path) -> FileType:
        """Detecta tipo de arquivo pelo nome."""
        name = file_path.name.lower()
        ext = file_path.suffix.lower()
        
        # Por nome
        for file_type, patterns in FILE_PATTERNS.items():
            for pattern in patterns:
                if pattern in name:
                    return file_type
        
        # Por extensão (fallback)
        if ext in ['.xlsx', '.xls']:
            return FileType.UNKNOWN
        elif ext == '.xml':
            return FileType.UNKNOWN
        elif ext == '.pdf':
            if 'hourly' in name:
                return FileType.MPFM_HOURLY
            elif 'daily' in name:
                return FileType.MPFM_DAILY
            elif 'calibration' in name:
                return FileType.PVT_CALIBRATION
        
        return FileType.UNKNOWN
    
    def extract_date_from_name(self, name: str) -> Optional[date]:
        """Extrai data do nome do arquivo."""
        import re
        
        # Padrões: YYYY-MM-DD, YYYYMMDD, DD-MM-YYYY
        patterns = [
            (r'(\d{4})-(\d{2})-(\d{2})', lambda m: date(int(m[0]), int(m[1]), int(m[2]))),
            (r'(\d{4})(\d{2})(\d{2})', lambda m: date(int(m[0]), int(m[1]), int(m[2]))),
            (r'(\d{2})-(\d{2})-(\d{4})', lambda m: date(int(m[2]), int(m[1]), int(m[0]))),
        ]
        
        for pattern, parser in patterns:
            match = re.search(pattern, name)
            if match:
                try:
                    groups = match.groups()
                    if len(groups) >= 3:
                        return parser(groups)
                except (ValueError, IndexError):
                    continue
        
        return None
    
    def extract_hour_from_name(self, name: str) -> Optional[int]:
        """Extrai hora do nome do arquivo (para MPFM Hourly)."""
        import re
        
        # Padrão: -HH0000 ou _HH:00
        match = re.search(r'-(\d{2})0000', name)
        if match:
            return int(match.group(1))
        
        match = re.search(r'_(\d{2}):00', name)
        if match:
            return int(match.group(1))
        
        return None
    
    def extract_asset_tag(self, name: str) -> Optional[str]:
        """Extrai TAG do medidor do nome do arquivo."""
        import re
        
        # Padrão: B03, Bank03, etc.
        match = re.search(r'B(\d{2})', name, re.IGNORECASE)
        if match:
            return f"Bank{match.group(1)}"
        
        # Padrão TAG: 13FT0367
        match = re.search(r'(\d{2}[A-Z]{2}\d{4})', name)
        if match:
            return match.group(1)
        
        return None
    
    def index_file(self, file_path: Path) -> FileInfo:
        """Indexa um arquivo e extrai metadados."""
        return FileInfo(
            path=file_path,
            name=file_path.name,
            hash=self.calculate_hash(file_path),
            size=file_path.stat().st_size,
            file_type=self.detect_file_type(file_path),
            report_date=self.extract_date_from_name(file_path.name),
            asset_tag=self.extract_asset_tag(file_path.name),
            hour_of_day=self.extract_hour_from_name(file_path.name)
        )
    
    def process_zip(self, zip_path: Path) -> BatchInfo:
        """
        Processa um arquivo ZIP.
        
        Args:
            zip_path: Caminho do arquivo ZIP
            
        Returns:
            BatchInfo com arquivos indexados
        """
        logger.info(f"Processando ZIP: {zip_path.name}")
        
        # Criar diretório de extração
        extract_dir = self.work_dir / f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        extract_dir.mkdir(parents=True, exist_ok=True)
        
        batch = BatchInfo(
            package_name=zip_path.name,
            package_hash=self.calculate_hash(zip_path)
        )
        
        # Extrair ZIP
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(extract_dir)
        
        # Indexar arquivos extraídos
        for file_path in extract_dir.rglob('*'):
            if file_path.is_file() and not file_path.name.startswith('.'):
                file_info = self.index_file(file_path)
                batch.files.append(file_info)
                
                # Agrupar por data
                if file_info.report_date:
                    if file_info.report_date not in batch.by_date:
                        batch.by_date[file_info.report_date] = []
                    batch.by_date[file_info.report_date].append(file_info)
                
                # Agrupar por asset
                if file_info.asset_tag:
                    if file_info.asset_tag not in batch.by_asset:
                        batch.by_asset[file_info.asset_tag] = []
                    batch.by_asset[file_info.asset_tag].append(file_info)
        
        batch.total_files = len(batch.files)
        logger.info(f"Indexados {batch.total_files} arquivos")
        
        return batch
    
    def process_directory(self, dir_path: Path) -> BatchInfo:
        """Processa um diretório de arquivos."""
        logger.info(f"Processando diretório: {dir_path}")
        
        batch = BatchInfo(
            package_name=dir_path.name,
            package_hash=hashlib.sha256(str(dir_path).encode()).hexdigest()
        )
        
        for file_path in dir_path.iterdir():
            if file_path.is_file() and not file_path.name.startswith('~'):
                file_info = self.index_file(file_path)
                batch.files.append(file_info)
                
                if file_info.report_date:
                    if file_info.report_date not in batch.by_date:
                        batch.by_date[file_info.report_date] = []
                    batch.by_date[file_info.report_date].append(file_info)
                
                if file_info.asset_tag:
                    if file_info.asset_tag not in batch.by_asset:
                        batch.by_asset[file_info.asset_tag] = []
                    batch.by_asset[file_info.asset_tag].append(file_info)
        
        batch.total_files = len(batch.files)
        return batch
    
    def register_batch(self, batch: BatchInfo) -> int:
        """Registra lote no banco e retorna batch_id."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO batch_package
                (package_name, package_hash, file_count, upload_source, status)
                VALUES (?, ?, ?, 'pipeline', 'PROCESSING')
            """, (batch.package_name, batch.package_hash, batch.total_files))
            
            cursor.execute("""
                SELECT id FROM batch_package WHERE package_hash = ?
            """, (batch.package_hash,))
            
            row = cursor.fetchone()
            batch_id = row[0] if row else None
            
            conn.commit()
            return batch_id
        finally:
            conn.close()
    
    def register_file(self, file_info: FileInfo, batch_id: int) -> int:
        """Registra arquivo no staged_file."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO staged_file
                (batch_id, file_name, file_path, file_hash, file_size, file_type,
                 report_date, asset_tag, parse_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
            """, (
                batch_id,
                file_info.name,
                str(file_info.path),
                file_info.hash,
                file_info.size,
                file_info.file_type.value,
                file_info.report_date.isoformat() if file_info.report_date else None,
                file_info.asset_tag
            ))
            
            cursor.execute("""
                SELECT id FROM staged_file WHERE file_hash = ?
            """, (file_info.hash,))
            
            row = cursor.fetchone()
            staged_id = row[0] if row else None
            
            conn.commit()
            return staged_id
        finally:
            conn.close()
    
    def create_manifests(self, batch: BatchInfo, batch_id: int) -> List[Dict]:
        """Cria manifestos de lote por asset/data."""
        manifests = []
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Agrupar por asset e data
            for asset_tag, files in batch.by_asset.items():
                by_date = defaultdict(list)
                for f in files:
                    if f.report_date:
                        by_date[f.report_date].append(f)
                
                for report_date, date_files in by_date.items():
                    # Contar tipos
                    hourly_count = sum(1 for f in date_files if f.file_type == FileType.MPFM_HOURLY)
                    daily_count = sum(1 for f in date_files if f.file_type == FileType.MPFM_DAILY)
                    cal_count = sum(1 for f in date_files if f.file_type == FileType.PVT_CALIBRATION)
                    
                    # Determinar quality_flag
                    quality_flag = None
                    if hourly_count < 24 and hourly_count > 0:
                        quality_flag = 'batch_incomplete'
                    if daily_count == 0 and hourly_count > 0:
                        quality_flag = (quality_flag + ',missing_daily') if quality_flag else 'missing_daily'
                    
                    manifest = {
                        'batch_id': batch_id,
                        'asset_tag': asset_tag,
                        'report_date': report_date,
                        'expected_hourly': 24,
                        'found_hourly': hourly_count,
                        'found_daily': daily_count,
                        'found_calibration': cal_count,
                        'quality_flag': quality_flag
                    }
                    
                    cursor.execute("""
                        INSERT OR REPLACE INTO batch_manifest
                        (batch_id, asset_tag, report_date, expected_hourly,
                         found_hourly, found_daily, found_calibration, quality_flag)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        batch_id, asset_tag, report_date.isoformat(), 24,
                        hourly_count, daily_count, cal_count, quality_flag
                    ))
                    
                    manifests.append(manifest)
            
            conn.commit()
        finally:
            conn.close()
        
        return manifests
    
    def process_file(self, file_info: FileInfo, staged_id: int) -> ProcessingResult:
        """Processa um arquivo individual."""
        result = ProcessingResult(file_info=file_info, staged_file_id=staged_id)
        
        try:
            file_type = file_info.file_type
            
            if file_type in [FileType.DAILY_OIL, FileType.DAILY_GAS, 
                            FileType.DAILY_WATER, FileType.GAS_BALANCE]:
                # Processar Excel
                result = self._process_excel(file_info, staged_id)
                
            elif file_type in [FileType.XML_001, FileType.XML_002, 
                              FileType.XML_003, FileType.XML_004]:
                # Processar XML
                result = self._process_xml(file_info, staged_id)
                
            elif file_type in [FileType.MPFM_HOURLY, FileType.MPFM_DAILY, FileType.PVT_CALIBRATION]:
                # Processar PDF
                result = self._process_pdf(file_info, staged_id)
                
            else:
                result.status = ParseStatus.FAILED
                result.errors.append(f"Tipo de arquivo não suportado: {file_type}")
            
        except Exception as e:
            result.status = ParseStatus.FAILED
            result.errors.append(str(e))
            logger.exception(f"Erro ao processar {file_info.name}")
        
        # Atualizar staged_file
        self._update_staged_file(staged_id, result)
        
        return result
    
    def _process_excel(self, file_info: FileInfo, staged_id: int) -> ProcessingResult:
        """Processa arquivo Excel."""
        result = ProcessingResult(file_info=file_info, staged_file_id=staged_id)
        
        try:
            extractor = self.ExcelExtractor(str(file_info.path))
            extraction = extractor.extract()
            
            if extraction.success:
                loader = self.ExcelLoader(self.db_path)
                stats = loader.load(extraction, self.installation_id)
                
                result.status = ParseStatus.SUCCESS
                result.records_extracted = stats.get('values_inserted', 0) + stats.get('balance_lines_inserted', 0)
                result.warnings = extraction.warnings
            else:
                result.status = ParseStatus.FAILED
                result.errors = extraction.errors
                
        except Exception as e:
            result.status = ParseStatus.FAILED
            result.errors.append(str(e))
        
        return result
    
    def _process_xml(self, file_info: FileInfo, staged_id: int) -> ProcessingResult:
        """Processa arquivo XML ANP."""
        result = ProcessingResult(file_info=file_info, staged_file_id=staged_id)
        
        try:
            extractor = self.XMLExtractor(str(file_info.path))
            extraction = extractor.extract()
            
            if extraction.success:
                loader = self.XMLDatabaseLoader(self.db_path)
                stats = loader.load(extraction, self.installation_id)
                
                result.status = ParseStatus.SUCCESS
                result.records_extracted = (
                    stats.get('configs_inserted', 0) + 
                    stats.get('production_records', 0) +
                    stats.get('alarms_inserted', 0) +
                    stats.get('events_inserted', 0)
                )
                result.warnings = extraction.warnings
            else:
                result.status = ParseStatus.FAILED
                result.errors = extraction.errors
                
        except Exception as e:
            result.status = ParseStatus.FAILED
            result.errors.append(str(e))
        
        return result
    
    def _process_pdf(self, file_info: FileInfo, staged_id: int) -> ProcessingResult:
        """Processa arquivo PDF MPFM."""
        result = ProcessingResult(file_info=file_info, staged_file_id=staged_id)
        
        # TODO: Implementar parser PDF específico para MPFM Hourly/Daily
        # Por enquanto, usa o extrator genérico
        try:
            from extractors.pdf_extractor import PDFExtractor, PDFDatabaseLoader
            
            extractor = PDFExtractor(str(file_info.path))
            extraction = extractor.extract()
            
            if extraction.success:
                loader = PDFDatabaseLoader(self.db_path)
                stats = loader.load(extraction, self.installation_id)
                
                result.status = ParseStatus.SUCCESS
                result.records_extracted = stats.get('data_points_stored', 0)
                result.warnings = extraction.warnings
            else:
                result.status = ParseStatus.FAILED
                result.errors = extraction.errors
                
        except ImportError:
            result.status = ParseStatus.FAILED
            result.errors.append("pdfplumber não instalado")
        except Exception as e:
            result.status = ParseStatus.FAILED
            result.errors.append(str(e))
        
        return result
    
    def _update_staged_file(self, staged_id: int, result: ProcessingResult) -> None:
        """Atualiza status do arquivo no banco."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                UPDATE staged_file
                SET parse_status = ?, records_extracted = ?,
                    parse_errors = ?, quality_flags = ?
                WHERE id = ?
            """, (
                result.status.value,
                result.records_extracted,
                json.dumps(result.errors) if result.errors else None,
                json.dumps(result.quality_flags) if result.quality_flags else None,
                staged_id
            ))
            conn.commit()
        finally:
            conn.close()
    
    def run(self, source: str) -> PipelineResult:
        """
        Executa pipeline completo.
        
        Args:
            source: Caminho de arquivo ZIP ou diretório
            
        Returns:
            PipelineResult com resultados completos
        """
        source_path = Path(source)
        
        if not source_path.exists():
            raise FileNotFoundError(f"Fonte não encontrada: {source}")
        
        # 1. Indexar arquivos
        logger.info("Passo 1: Indexando arquivos...")
        if source_path.suffix.lower() == '.zip':
            batch = self.process_zip(source_path)
        elif source_path.is_dir():
            batch = self.process_directory(source_path)
        else:
            # Arquivo único
            batch = BatchInfo(
                package_name=source_path.name,
                package_hash=self.calculate_hash(source_path),
                files=[self.index_file(source_path)],
                total_files=1
            )
        
        # 2. Registrar lote
        logger.info("Passo 2: Registrando lote...")
        batch_id = self.register_batch(batch)
        batch.batch_id = batch_id
        
        # 3. Criar manifestos
        logger.info("Passo 3: Criando manifestos...")
        manifests = self.create_manifests(batch, batch_id)
        
        # 4. Processar arquivos
        logger.info("Passo 4: Processando arquivos...")
        results = []
        for file_info in batch.files:
            staged_id = self.register_file(file_info, batch_id)
            result = self.process_file(file_info, staged_id)
            results.append(result)
            
            status_icon = '✅' if result.status == ParseStatus.SUCCESS else '❌'
            logger.info(f"  {status_icon} {file_info.name}")
        
        # 5. Reconciliação (se houver Hourly e Daily)
        logger.info("Passo 5: Reconciliação Hourly vs Daily...")
        reconciliations = self._run_reconciliation(batch)
        
        # 6. Validação cruzada
        logger.info("Passo 6: Validação cruzada...")
        validations = self._run_cross_validation(batch)
        
        # 7. Finalizar lote
        self._finalize_batch(batch_id)
        
        logger.info("Pipeline concluído!")
        
        return PipelineResult(
            batch_info=batch,
            results=results,
            manifests=manifests,
            reconciliations=reconciliations,
            validations=validations
        )
    
    def _run_reconciliation(self, batch: BatchInfo) -> List[Dict]:
        """Executa reconciliação Hourly vs Daily."""
        # TODO: Implementar reconciliação completa
        return []
    
    def _run_cross_validation(self, batch: BatchInfo) -> List[Dict]:
        """Executa validação cruzada."""
        results = []
        
        try:
            from validators.cross_validator import CrossValidator
            
            validator = CrossValidator(self.db_path, self.installation_id)
            
            for report_date in batch.by_date.keys():
                validation_results = validator.validate_date(report_date)
                
                # Resumir
                stats = defaultdict(int)
                for r in validation_results:
                    stats[r.classification.value] += 1
                
                results.append({
                    'date': report_date.isoformat(),
                    'total': len(validation_results),
                    'by_classification': dict(stats)
                })
                
        except ImportError:
            logger.warning("Validador cruzado não disponível")
        except Exception as e:
            logger.warning(f"Erro na validação cruzada: {e}")
        
        return results
    
    def _finalize_batch(self, batch_id: int) -> None:
        """Finaliza processamento do lote."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                UPDATE batch_package
                SET status = 'COMPLETED'
                WHERE id = ?
            """, (batch_id,))
            conn.commit()
        finally:
            conn.close()


# ============================================================================
# CLI
# ============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='SGM-FM Pipeline de Ingestão')
    parser.add_argument('source', help='Arquivo ZIP ou diretório para processar')
    parser.add_argument('--database', '-d', default='database/mpfm_monitor.db',
                       help='Caminho do banco de dados')
    parser.add_argument('--installation', '-i', type=int, default=1,
                       help='ID da instalação')
    
    args = parser.parse_args()
    
    pipeline = IngestionPipeline(args.database, installation_id=args.installation)
    result = pipeline.run(args.source)
    
    # Resumo
    print("\n" + "=" * 60)
    print("📊 RESUMO DO PIPELINE")
    print("=" * 60)
    
    success = sum(1 for r in result.results if r.status == ParseStatus.SUCCESS)
    failed = sum(1 for r in result.results if r.status == ParseStatus.FAILED)
    
    print(f"\n📁 Lote: {result.batch_info.package_name}")
    print(f"📄 Arquivos: {result.batch_info.total_files}")
    print(f"✅ Sucesso: {success}")
    print(f"❌ Falhas: {failed}")
    
    if result.manifests:
        print(f"\n📋 Manifestos: {len(result.manifests)}")
        for m in result.manifests[:5]:
            flag = f" ⚠️ {m['quality_flag']}" if m.get('quality_flag') else ""
            print(f"   {m['asset_tag']} @ {m['report_date']}: "
                  f"{m['found_hourly']}/24 Hourly, {m['found_daily']} Daily{flag}")
    
    if result.validations:
        print(f"\n🔍 Validações cruzadas:")
        for v in result.validations:
            print(f"   {v['date']}: {v['total']} validações - {v['by_classification']}")


if __name__ == "__main__":
    main()
