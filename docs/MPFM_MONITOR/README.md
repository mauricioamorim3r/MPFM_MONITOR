# MPFM Monitor

Sistema de Monitoramento de Medição Fiscal Multifásica (MPFM) para a indústria de óleo e gás.

## 📋 Visão Geral

O MPFM Monitor é um sistema local para **ingestão, organização e análise de dados de medição fiscal** de sistemas multifásicos. Ele extrai informações de arquivos Excel (Daily Reports), XML ANP (tipos 001-004) e PDF, armazenando tudo em um banco SQLite para consultas e monitoramento.

### Principais Funcionalidades

- **Ingestão de Dados**
  - Excel: Daily Oil, Daily Gas, Daily Water, Gas Balance
  - XML ANP: Tipos 001 (Óleo), 002 (Gás Linear), 003 (Gás Diferencial), 004 (Alarmes)
  - PDF: Relatórios de calibração, PVT, avaliações (opcional)

- **Organização no Banco de Dados**
  - Medidores/TAGs cadastrados automaticamente
  - Histórico diário de produção
  - Balanço de gás
  - Alarmes e eventos dos computadores de vazão
  - Rastreabilidade completa (hash, origem, data)

- **Análise e Monitoramento**
  - Alertas automáticos (BSW, balanço de gás, variação de produção)
  - Relatórios diários
  - Consultas SQL diretas

## 🚀 Instalação

### Requisitos
- Python 3.10+
- pip

### Instalação

```bash
# Clonar ou copiar o projeto
cd mpfm_monitor

# Instalar dependências
pip install -r requirements.txt

# Para suporte a PDF (opcional)
pip install pdfplumber
```

## 📖 Uso

### 1. Inicializar o Banco de Dados

```bash
python main.py init
```

Isso cria o banco SQLite em `database/mpfm_monitor.db` com:
- Instalação padrão (FPSO Bacalhau)
- Limites operacionais (BSW, TOC, etc.)

### 2. Importar Arquivos

```bash
# Importar um arquivo
python main.py import Daily_Oil_2026-01-27.xlsx

# Importar pasta inteira
python main.py import ./dados/

# Tipos suportados: .xlsx, .xls, .xml, .pdf
```

### 3. Ver Status do Sistema

```bash
python main.py status
```

Saída:
```
==================================================
📊 MPFM Monitor - Status do Sistema
==================================================

📁 Banco: database/mpfm_monitor.db

🏭 Instalações: 1
📏 Medidores: 5
📅 Snapshots diários: 1
   Período: 2026-01-27 a 2026-01-27

📥 Importações: 8 total (8 sucesso)
   Por tipo:
      DAILY_OIL: 1
      DAILY_GAS: 1
      DAILY_WATER: 1
      ...
```

### 4. Gerar Relatório Diário

```bash
# Relatório de ontem
python main.py report

# Relatório de data específica
python main.py report 2026-01-27

# Exportar para JSON
python main.py report 2026-01-27 --output relatorio.json
```

### 5. Listar Medidores

```bash
python main.py tags
```

### 6. Consultas SQL

```bash
python main.py query "SELECT * FROM meter"
python main.py query "SELECT report_date, COUNT(*) FROM daily_measurement GROUP BY report_date"
```

## 📁 Estrutura de Arquivos

```
mpfm_monitor/
├── main.py                    # CLI principal
├── requirements.txt           # Dependências
├── database/
│   ├── schema.sql            # Schema do banco
│   └── mpfm_monitor.db       # Banco SQLite (gerado)
├── extractors/
│   ├── excel_extractor.py    # Extrator de Excel
│   ├── xml_extractor.py      # Extrator de XML ANP
│   └── pdf_extractor.py      # Extrator de PDF
├── analysis/
│   └── daily_analyzer.py     # Análise e alertas
└── data/
    └── uploads/              # Arquivos para importar
```

## 🗄️ Modelo de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `installation` | Instalações (FPSO, plataformas) |
| `meter` | Medidores/TAGs |
| `section` | Seções (Fiscal Skid, Test Separator) |
| `daily_snapshot` | Snapshot diário (cabeçalho) |
| `daily_measurement` | Medições diárias (formato long) |
| `gas_balance` | Balanço de gás |
| `import_log` | Log de importações |
| `alert` | Alertas gerados |
| `flow_computer_config` | Configuração CV (XML 001-003) |
| `production_record` | Registros de produção (XML) |
| `alarm` | Alarmes (XML 004) |
| `event` | Eventos (XML 004) |

### Views Úteis

```sql
-- Resumo de produção
SELECT * FROM v_daily_production_summary;

-- Alertas ativos
SELECT * FROM v_active_alerts;

-- Status de importações
SELECT * FROM v_import_status;

-- Verificar balanço de gás
SELECT * FROM v_gas_balance_check;
```

## ⚠️ Limites Operacionais

O sistema vem com limites padrão configuráveis:

| Parâmetro | Warning | Critical | Unidade |
|-----------|---------|----------|---------|
| BSW | 30 | 50 | % |
| TOC | 20 | 29 | ppm |
| Tank-Meter Deviation | 3 | 5 | % |
| Gas Balance | 1 | 2 | % |
| Production Variation | 15 | 25 | % |
| Flare | 10 | 20 | % |

Para alterar limites:

```sql
UPDATE operational_limit 
SET warning_value = 25, critical_value = 40 
WHERE parameter = 'BSW';
```

## 📊 Exemplos de Consultas

### Produção diária por TAG

```sql
SELECT 
    ds.report_date,
    m.tag,
    m.fluid_type,
    SUM(CASE WHEN dm.variable_code = 'gross_std_volume_sm3' THEN dm.value END) as volume_sm3
FROM daily_measurement dm
JOIN daily_snapshot ds ON dm.snapshot_id = ds.id
JOIN meter m ON dm.meter_id = m.id
WHERE dm.block_type = 'DAY'
GROUP BY ds.report_date, m.tag
ORDER BY ds.report_date DESC, m.fluid_type;
```

### Histórico de importações

```sql
SELECT 
    DATE(imported_at) as dia,
    file_type,
    COUNT(*) as arquivos,
    SUM(records_extracted) as registros
FROM import_log
GROUP BY DATE(imported_at), file_type
ORDER BY dia DESC;
```

### Alertas por severidade

```sql
SELECT 
    ds.report_date,
    a.severity,
    a.alert_type,
    a.message
FROM alert a
JOIN daily_snapshot ds ON a.snapshot_id = ds.id
WHERE a.acknowledged = FALSE
ORDER BY 
    CASE a.severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END;
```

## 🔧 Configuração Avançada

### Banco de dados alternativo

```bash
python main.py --database /caminho/outro_banco.db import arquivo.xlsx
```

### Adicionar nova instalação

```sql
INSERT INTO installation (name, code, cnpj, basin, field, operator)
VALUES ('FPSO Nova', '12345', '12345678', 'Campos', 'Campo X', 'Operadora Y');
```

### Executar análise de alertas

```python
from analysis.daily_analyzer import DailyAnalyzer

analyzer = DailyAnalyzer("database/mpfm_monitor.db")
alerts = analyzer.analyze_date("2026-01-27")

for alert in alerts:
    print(f"{alert.severity.value}: {alert.message}")
```

## 📝 Formatos de Arquivo Suportados

### Excel - Daily Reports

Arquivos com padrão de nome:
- `Daily_Oil_YYYY-MM-DD.xlsx`
- `Daily_Gas_YYYY-MM-DD.xlsx`
- `Daily_Water_YYYY-MM-DD.xlsx`
- `GasBalance_YYYY-MM-DD.xlsx`

O extrator detecta automaticamente âncoras como "Cumulative totals", "Day totals", "Flow weighted averages" ou usa extração simplificada para formatos alternativos.

### XML ANP

Arquivos no padrão:
- `001_CNPJ8_TIMESTAMP_COD.xml` (Óleo)
- `002_CNPJ8_TIMESTAMP_COD.xml` (Gás Linear)
- `003_CNPJ8_TIMESTAMP_COD.xml` (Gás Diferencial)
- `004_CNPJ8_TIMESTAMP_COD.xml` (Alarmes & Eventos)

### PDF (opcional)

Suporte básico para extração de:
- Tabelas
- Meter factors
- Temperaturas e pressões
- Composições de gás
- Números de série

## 🔒 Segurança

- Sistema local, sem autenticação (single user)
- Banco SQLite com integridade referencial
- Hash SHA-256 para evitar reimportação de arquivos

## 📈 Roadmap

- [ ] Interface web (Streamlit/Gradio)
- [ ] Exportação para XML ANP
- [ ] Integração com i-Engine
- [ ] Gestão de não-conformidades
- [ ] Avaliações de desempenho MPFM

## 📄 Licença

Uso interno.

---

Desenvolvido para monitoramento de medição fiscal multifásica em operações de E&P.
