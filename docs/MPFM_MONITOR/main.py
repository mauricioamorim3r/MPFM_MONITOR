#!/usr/bin/env python3
"""
SGM-FM (Sistema de Gestão de Medição Fiscal Multifásica)
CLI Principal - Estado da Arte

Comandos disponíveis:
    init          Inicializar banco de dados
    import        Importar arquivos (Excel, XML, PDF, ZIP)
    status        Status do sistema
    report        Gerar relatório diário
    validate      Executar validação cruzada
    reconcile     Reconciliação Hourly vs Daily
    tags          Listar TAGs/medidores
    query         Executar query SQL
    alerts        Gerenciar alertas
    nc            Gerenciar não-conformidades
"""
import os
import sys
import argparse
import sqlite3
import json
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
from collections import defaultdict

# Adicionar ao path
sys.path.insert(0, str(Path(__file__).parent))

# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

DEFAULT_DB_PATH = Path(__file__).parent / "database" / "mpfm_monitor.db"
SCHEMA_PATH = Path(__file__).parent / "database" / "schema.sql"


# ============================================================================
# FUNÇÕES UTILITÁRIAS
# ============================================================================

def get_db_path(args=None) -> str:
    """Retorna caminho do banco."""
    if args and hasattr(args, 'database') and args.database:
        return args.database
    return str(DEFAULT_DB_PATH)


def init_database(db_path: str = None, force: bool = False) -> bool:
    """Inicializa banco de dados."""
    if db_path is None:
        db_path = str(DEFAULT_DB_PATH)
    
    db_file = Path(db_path)
    
    if db_file.exists() and not force:
        print(f"⚠️  Banco já existe: {db_path}")
        print("   Use --force para reinicializar")
        return False
    
    db_file.parent.mkdir(parents=True, exist_ok=True)
    
    if not SCHEMA_PATH.exists():
        print(f"❌ Schema não encontrado: {SCHEMA_PATH}")
        return False
    
    with open(SCHEMA_PATH, 'r') as f:
        schema_sql = f.read()
    
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(schema_sql)
        conn.commit()
        print(f"✅ Banco inicializado: {db_path}")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False
    finally:
        conn.close()


def get_system_status(db_path: str) -> Dict:
    """Retorna status do sistema."""
    if not Path(db_path).exists():
        return {'initialized': False}
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    status = {'initialized': True, 'db_path': db_path}
    
    try:
        # Instalações
        cursor.execute("SELECT COUNT(*) FROM installation")
        status['installations'] = cursor.fetchone()[0]
        
        # Meters (assets)
        cursor.execute("SELECT COUNT(*) FROM meter")
        status['assets'] = cursor.fetchone()[0]
        
        # Arquivos importados
        cursor.execute("SELECT COUNT(*) FROM import_log")
        status['total_files'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM import_log WHERE success = TRUE")
        status['successful_files'] = cursor.fetchone()[0]
        
        # Por tipo
        cursor.execute("""
            SELECT file_type, COUNT(*) FROM import_log
            GROUP BY file_type ORDER BY COUNT(*) DESC
        """)
        status['files_by_type'] = dict(cursor.fetchall())
        
        # Snapshots (relatórios)
        cursor.execute("SELECT COUNT(*) FROM daily_snapshot")
        status['reports'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT MIN(report_date), MAX(report_date) FROM daily_snapshot")
        row = cursor.fetchone()
        if row and row[0]:
            status['date_range'] = {'from': row[0], 'to': row[1]}
        
        # Medições
        cursor.execute("SELECT COUNT(*) FROM daily_measurement")
        status['measurements'] = cursor.fetchone()[0]
        
        # Validações cruzadas
        try:
            cursor.execute("SELECT COUNT(*) FROM cross_validation_result")
            status['validations'] = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT classification, COUNT(*) FROM cross_validation_result
                GROUP BY classification
            """)
            status['validations_by_class'] = dict(cursor.fetchall())
        except:
            status['validations'] = 0
            status['validations_by_class'] = {}
        
        # Inconsistências ativas
        try:
            cursor.execute("SELECT COUNT(*) FROM inconsistency_history WHERE status = 'ACTIVE'")
            status['active_inconsistencies'] = cursor.fetchone()[0]
        except:
            status['active_inconsistencies'] = 0
        
        # Não-conformidades
        try:
            cursor.execute("SELECT COUNT(*) FROM nonconformance WHERE status != 'CLOSED'")
            status['open_ncs'] = cursor.fetchone()[0]
        except:
            status['open_ncs'] = 0
        
        # Alertas ativos
        try:
            cursor.execute("SELECT COUNT(*) FROM alert WHERE acknowledged = FALSE")
            status['active_alerts'] = cursor.fetchone()[0]
        except:
            status['active_alerts'] = 0
        
        # Última importação
        cursor.execute("""
            SELECT file_name, file_type, imported_at FROM import_log
            ORDER BY imported_at DESC LIMIT 1
        """)
        row = cursor.fetchone()
        if row:
            status['last_import'] = {'file': row[0], 'type': row[1], 'datetime': row[2]}
        
    except Exception as e:
        status['error'] = str(e)
    finally:
        conn.close()
    
    return status


def process_files(source: str, db_path: str, installation_id: int = 1) -> Dict:
    """Processa arquivos usando os extratores legados."""
    return process_files_legacy(source, db_path, installation_id)


def process_files_legacy(source: str, db_path: str, installation_id: int = 1) -> Dict:
    """Processamento legado sem pipeline."""
    from extractors.excel_extractor import process_excel_file, process_directory as process_excel_dir
    from extractors.xml_extractor import process_xml_file, process_xml_directory
    
    source_path = Path(source)
    results = []
    
    if source_path.is_dir():
        # Excel
        for pattern in ['*.xlsx', '*.xls']:
            for f in source_path.glob(pattern):
                if not f.name.startswith('~'):
                    r = process_excel_file(str(f), db_path, installation_id)
                    results.append(r)
        # XML
        for f in source_path.glob('*.xml'):
            r = process_xml_file(str(f), db_path, installation_id)
            results.append(r)
    else:
        ext = source_path.suffix.lower()
        if ext in ['.xlsx', '.xls']:
            results.append(process_excel_file(str(source_path), db_path, installation_id))
        elif ext == '.xml':
            results.append(process_xml_file(str(source_path), db_path, installation_id))
    
    success = sum(1 for r in results if r.get('success'))
    
    return {
        'success': True,
        'total_files': len(results),
        'successful': success,
        'failed': len(results) - success
    }


def run_cross_validation(db_path: str, date_str: str = None, days: int = 1) -> Dict:
    """Executa validação cruzada."""
    try:
        from validators.cross_validator import CrossValidator
        
        validator = CrossValidator(db_path)
        
        if date_str:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        else:
            target_date = date.today() - timedelta(days=1)
        
        all_results = []
        for i in range(days):
            d = target_date - timedelta(days=i)
            results = validator.validate_date(d)
            all_results.extend(results)
        
        # Estatísticas
        stats = defaultdict(int)
        for r in all_results:
            stats[r.classification.value] += 1
        
        return {
            'success': True,
            'dates_validated': days,
            'total_validations': len(all_results),
            'by_classification': dict(stats)
        }
        
    except ImportError as e:
        return {'success': False, 'error': f'Módulo não disponível: {e}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def generate_report(db_path: str, report_date: str = None) -> Dict:
    """Gera relatório diário."""
    if report_date is None:
        report_date = (date.today() - timedelta(days=1)).isoformat()
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    report = {
        'date': report_date,
        'generated_at': datetime.now().isoformat(),
        'data': {}
    }
    
    try:
        # Produção por fluido (usando meter e daily_measurement)
        cursor.execute("""
            SELECT 
                m.fluid_type, dm.variable_code,
                SUM(dm.value) as total_value, dm.unit
            FROM daily_measurement dm
            JOIN daily_snapshot ds ON dm.snapshot_id = ds.id
            JOIN meter m ON dm.meter_id = m.id
            WHERE ds.report_date = ? AND dm.block_type = 'DAY'
            GROUP BY m.fluid_type, dm.variable_code, dm.unit
        """, (report_date,))
        
        report['data']['production'] = [dict(row) for row in cursor.fetchall()]
        
        # Validação cruzada
        try:
            cursor.execute("""
                SELECT classification, COUNT(*) as cnt
                FROM cross_validation_result
                WHERE date_ref = ?
                GROUP BY classification
            """, (report_date,))
            report['data']['validation'] = dict(cursor.fetchall())
        except:
            report['data']['validation'] = {}
        
        # Alertas
        try:
            cursor.execute("""
                SELECT severity, COUNT(*) as cnt FROM alert a
                JOIN daily_snapshot ds ON a.snapshot_id = ds.id
                WHERE ds.report_date = ?
                GROUP BY severity
            """, (report_date,))
            report['data']['alerts'] = dict(cursor.fetchall())
        except:
            report['data']['alerts'] = {}
        
        # Balanço de gás
        try:
            cursor.execute("""
                SELECT * FROM v_gas_balance_check WHERE report_date = ?
            """, (report_date,))
            row = cursor.fetchone()
            if row:
                report['data']['gas_balance'] = dict(row)
        except:
            pass
        
    except Exception as e:
        report['error'] = str(e)
    finally:
        conn.close()
    
    return report


# ============================================================================
# COMANDOS CLI
# ============================================================================

def cmd_init(args):
    """Inicializar banco."""
    db_path = get_db_path(args)
    init_database(db_path, force=args.force)
    
    if Path(db_path).exists():
        status = get_system_status(db_path)
        print(f"   Instalações: {status.get('installations', 0)}")


def cmd_import(args):
    """Importar arquivos."""
    db_path = get_db_path(args)
    
    if not Path(db_path).exists():
        print("❌ Banco não inicializado. Execute: python main.py init")
        return
    
    source = args.path
    print(f"📁 Importando: {source}")
    
    result = process_files(source, db_path)
    
    if result.get('success'):
        print(f"\n✅ Importação concluída")
        print(f"   Arquivos: {result.get('total_files', 0)}")
        print(f"   Sucesso: {result.get('successful', 0)}")
        print(f"   Falhas: {result.get('failed', 0)}")
    else:
        print(f"\n❌ Erro: {result.get('error', 'Desconhecido')}")


def cmd_status(args):
    """Status do sistema."""
    db_path = get_db_path(args)
    status = get_system_status(db_path)
    
    if not status.get('initialized'):
        print("❌ Banco não inicializado")
        return
    
    print("\n" + "=" * 60)
    print("📊 SGM-FM - Status do Sistema")
    print("=" * 60)
    
    print(f"\n📁 Banco: {status.get('db_path', 'N/A')}")
    print(f"\n🏭 Instalações: {status.get('installations', 0)}")
    print(f"📏 Medidores: {status.get('assets', 0)}")
    print(f"📄 Arquivos importados: {status.get('total_files', 0)} ({status.get('successful_files', 0)} sucesso)")
    print(f"📅 Snapshots: {status.get('reports', 0)}")
    print(f"📈 Medições: {status.get('measurements', 0)}")
    
    if status.get('date_range'):
        dr = status['date_range']
        print(f"   Período: {dr['from']} a {dr['to']}")
    
    if status.get('files_by_type'):
        print("\n📂 Arquivos por tipo:")
        for ft, count in status['files_by_type'].items():
            print(f"   {ft}: {count}")
    
    if status.get('validations', 0) > 0:
        print(f"\n🔍 Validações cruzadas: {status.get('validations', 0)}")
        if status.get('validations_by_class'):
            for cls, count in status['validations_by_class'].items():
                icon = {'CONSISTENTE': '✅', 'ACEITAVEL': '⚠️', 'INCONSISTENTE': '❌'}.get(cls, '•')
                print(f"   {icon} {cls}: {count}")
    
    print(f"\n⚠️  Inconsistências ativas: {status.get('active_inconsistencies', 0)}")
    print(f"📋 NCs abertas: {status.get('open_ncs', 0)}")
    print(f"🔔 Alertas ativos: {status.get('active_alerts', 0)}")
    
    if status.get('last_import'):
        li = status['last_import']
        print(f"\n🕐 Última importação: {li['file']} ({li['type']})")


def cmd_report(args):
    """Gerar relatório."""
    db_path = get_db_path(args)
    
    report_date = args.date if args.date else (date.today() - timedelta(days=1)).isoformat()
    
    print(f"📋 Gerando relatório: {report_date}")
    
    report = generate_report(db_path, report_date)
    
    if report.get('error'):
        print(f"❌ Erro: {report['error']}")
        return
    
    print("\n" + "=" * 60)
    print(f"📊 Relatório Diário - {report_date}")
    print("=" * 60)
    
    data = report.get('data', {})
    
    # Produção
    if data.get('production'):
        print("\n📈 Produção:")
        by_fluid = defaultdict(list)
        for p in data['production']:
            by_fluid[p['fluid_type']].append(p)
        
        for fluid, items in by_fluid.items():
            print(f"\n   {fluid or 'N/A'}:")
            for item in items[:5]:
                print(f"      {item['variable_code']}: {item['total_value']:.2f} {item['unit'] or ''}")
    
    # Validação
    if data.get('validation'):
        print("\n🔍 Validação Cruzada:")
        for cls, count in data['validation'].items():
            icon = {'CONSISTENTE': '✅', 'ACEITAVEL': '⚠️', 'INCONSISTENTE': '❌'}.get(cls, '•')
            print(f"   {icon} {cls}: {count}")
    
    # Balanço de gás
    if data.get('gas_balance'):
        gb = data['gas_balance']
        print("\n⚖️  Balanço de Gás:")
        print(f"   Entradas: {gb.get('total_entrada', 0):,.0f} Sm³")
        print(f"   Saídas: {gb.get('total_saida', 0):,.0f} Sm³")
        print(f"   Calculado: {gb.get('total_calculado', 0):,.0f} Sm³")
    
    # Exportar
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        print(f"\n💾 Relatório salvo: {args.output}")


def cmd_validate(args):
    """Executar validação cruzada."""
    db_path = get_db_path(args)
    
    print(f"🔍 Executando validação cruzada...")
    
    result = run_cross_validation(db_path, args.date, args.days)
    
    if result.get('success'):
        print(f"\n✅ Validação concluída")
        print(f"   Datas validadas: {result.get('dates_validated', 0)}")
        print(f"   Total de validações: {result.get('total_validations', 0)}")
        
        if result.get('by_classification'):
            print("\n   Por classificação:")
            for cls, count in result['by_classification'].items():
                icon = {'CONSISTENTE': '✅', 'ACEITAVEL': '⚠️', 'INCONSISTENTE': '❌'}.get(cls, '•')
                print(f"      {icon} {cls}: {count}")
    else:
        print(f"❌ Erro: {result.get('error', 'Desconhecido')}")


def cmd_tags(args):
    """Listar TAGs."""
    db_path = get_db_path(args)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT m.tag, m.fluid_type, m.description,
               COUNT(DISTINCT dm.id) as measurements
        FROM meter m
        LEFT JOIN daily_measurement dm ON m.id = dm.meter_id
        GROUP BY m.id
        ORDER BY m.fluid_type, m.tag
    """)
    
    print("\n📏 Medidores Cadastrados:")
    
    current_fluid = None
    for row in cursor.fetchall():
        if row[1] != current_fluid:
            current_fluid = row[1]
            print(f"\n{current_fluid or 'N/A'}:")
        
        print(f"   {row[0]:12} | {row[2] or '-':20} | {row[3]:6} medições")
    
    conn.close()


def cmd_query(args):
    """Executar query SQL."""
    db_path = get_db_path(args)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute(args.sql)
        
        if args.sql.strip().upper().startswith('SELECT'):
            rows = cursor.fetchall()
            
            if rows:
                headers = list(rows[0].keys())
                print(" | ".join(f"{h:15}" for h in headers))
                print("-" * (17 * len(headers)))
                
                for row in rows[:args.limit]:
                    values = [str(v)[:15] if v is not None else 'NULL' for v in row]
                    print(" | ".join(f"{v:15}" for v in values))
                
                if len(rows) > args.limit:
                    print(f"\n... ({len(rows) - args.limit} linhas omitidas)")
            else:
                print("Nenhum resultado")
        else:
            conn.commit()
            print(f"✅ Executado. Linhas afetadas: {cursor.rowcount}")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()


def cmd_alerts(args):
    """Gerenciar alertas."""
    db_path = get_db_path(args)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if args.ack:
        # Reconhecer alerta
        cursor.execute("""
            UPDATE alert SET acknowledged = TRUE, acknowledged_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (args.ack,))
        conn.commit()
        print(f"✅ Alerta {args.ack} reconhecido")
    else:
        # Listar alertas
        cursor.execute("""
            SELECT a.id, a.severity, a.alert_type, a.message, a.created_at,
                   ar.asset_tag
            FROM alert a
            LEFT JOIN asset_registry ar ON a.asset_id = ar.id
            WHERE a.acknowledged = FALSE
            ORDER BY 
                CASE a.severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
                a.created_at DESC
            LIMIT 20
        """)
        
        print("\n🔔 Alertas Ativos:")
        for row in cursor.fetchall():
            icon = {'CRITICAL': '🔴', 'WARNING': '🟡', 'INFO': '🔵'}.get(row['severity'], '⚪')
            print(f"   [{row['id']}] {icon} {row['alert_type']} - {row['asset_tag'] or 'N/A'}")
            print(f"       {row['message']}")
    
    conn.close()


def cmd_nc(args):
    """Gerenciar não-conformidades."""
    db_path = get_db_path(args)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT nc.*, ar.asset_tag
        FROM nonconformance nc
        LEFT JOIN asset_registry ar ON nc.asset_id = ar.id
        WHERE nc.status != 'CLOSED'
        ORDER BY nc.occurrence_datetime DESC
    """)
    
    print("\n📋 Não-Conformidades Abertas:")
    
    for row in cursor.fetchall():
        status_icon = {
            'IN_INVESTIGATION': '🔍',
            'ACTION_PLAN': '📝',
            'IN_CONTINGENCY': '⚠️'
        }.get(row['status'], '•')
        
        print(f"\n   {status_icon} {row['unique_event_id']}")
        print(f"      Asset: {row['asset_tag'] or 'N/A'}")
        print(f"      Status: {row['status']}")
        print(f"      Variável: {row['variable_affected']}")
        print(f"      Ocorrência: {row['occurrence_datetime']}")
        
        if row['deadline_partial']:
            print(f"      Prazo parcial: {row['deadline_partial']}")
        if row['deadline_final']:
            print(f"      Prazo final: {row['deadline_final']}")
    
    conn.close()


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='SGM-FM - Sistema de Gestão de Medição Fiscal Multifásica',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python main.py init                              # Inicializar banco
  python main.py import ./dados/                   # Importar diretório
  python main.py import pacote.zip                 # Importar ZIP
  python main.py status                            # Ver status
  python main.py report 2026-01-27                 # Relatório do dia
  python main.py validate --days 7                 # Validar últimos 7 dias
  python main.py tags                              # Listar medidores
  python main.py query "SELECT * FROM asset_registry"
  python main.py alerts                            # Ver alertas
  python main.py nc                                # Ver não-conformidades
        """
    )
    
    parser.add_argument('--database', '-d', help='Caminho do banco SQLite')
    
    subparsers = parser.add_subparsers(dest='command', help='Comandos')
    
    # init
    p_init = subparsers.add_parser('init', help='Inicializar banco de dados')
    p_init.add_argument('--force', '-f', action='store_true', help='Forçar reinicialização')
    
    # import
    p_import = subparsers.add_parser('import', help='Importar arquivos')
    p_import.add_argument('path', help='Arquivo ou diretório')
    
    # status
    p_status = subparsers.add_parser('status', help='Status do sistema')
    
    # report
    p_report = subparsers.add_parser('report', help='Gerar relatório')
    p_report.add_argument('date', nargs='?', help='Data (YYYY-MM-DD)')
    p_report.add_argument('--output', '-o', help='Arquivo de saída JSON')
    
    # validate
    p_validate = subparsers.add_parser('validate', help='Validação cruzada')
    p_validate.add_argument('--date', help='Data inicial (YYYY-MM-DD)')
    p_validate.add_argument('--days', type=int, default=1, help='Número de dias')
    
    # tags
    p_tags = subparsers.add_parser('tags', help='Listar TAGs/medidores')
    
    # query
    p_query = subparsers.add_parser('query', help='Executar query SQL')
    p_query.add_argument('sql', help='Query SQL')
    p_query.add_argument('--limit', type=int, default=50, help='Limite de linhas')
    
    # alerts
    p_alerts = subparsers.add_parser('alerts', help='Gerenciar alertas')
    p_alerts.add_argument('--ack', type=int, help='Reconhecer alerta por ID')
    
    # nc
    p_nc = subparsers.add_parser('nc', help='Gerenciar não-conformidades')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    commands = {
        'init': cmd_init,
        'import': cmd_import,
        'status': cmd_status,
        'report': cmd_report,
        'validate': cmd_validate,
        'tags': cmd_tags,
        'query': cmd_query,
        'alerts': cmd_alerts,
        'nc': cmd_nc
    }
    
    cmd_func = commands.get(args.command)
    if cmd_func:
        cmd_func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
