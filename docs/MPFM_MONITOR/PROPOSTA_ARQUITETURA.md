# Proposta Arquitetural — SGM-FM (Sistema de Gestão de Medição Fiscal Multifásica)

**Versão:** 1.0  
**Data:** 2026-01-30  
**Baseado em:** PRDs XML ANP, PRD Ingestão Excel, Schema PostgreSQL SGM-FM, Wireframes

---

## 1. Análise dos Requisitos

### 1.1 Sistemas Identificados nos Documentos

| Componente | Fonte | Descrição |
|------------|-------|-----------|
| **Monitoramento Diário** | PRD Excel, Wireframes | Ingestão de Daily Oil/Gas/Water/GasBalance |
| **Avaliação de Desempenho** | Schema SQL, Wireframes | Campanhas de avaliação MPFM |
| **Não-conformidades** | Schema SQL, Wireframes | Gestão de desvios ANP com prazos D+10/D+30 |
| **Geração XML ANP** | PRDs XML 001-004 | Transmissão i-Engine/SFP |

### 1.2 Diferenças vs Sistema Bacalhau Existente

| Aspecto | Bacalhau (existente) | SGM-FM (proposto) |
|---------|---------------------|-------------------|
| Banco | SQLite | PostgreSQL |
| Foco | Produção fiscal (óleo/gás) | MPFM multifásico |
| XMLs | A001-A004 básicos | A001-A004 completos + validação |
| Workflow | Batch | API-first + eventos |
| Compliance | Dashboard simples | Prazos regulatórios, CAPA |

### 1.3 Decisão Arquitetural

**Recomendação:** Criar sistema **SGM-FM** como nova aplicação, mantendo compatibilidade com dados Bacalhau para migração futura. Justificativa:
- Schema PostgreSQL é mais robusto (triggers, constraints, enums)
- Modelo de dados é fundamentalmente diferente (MPFM vs flow computers)
- APIs REST permitem integração com outros sistemas

---

## 2. Arquitetura Proposta

### 2.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERFACE LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  FastAPI REST API       │  CLI Tools       │  Scheduled Jobs        │
│  (CRUD + Business)      │  (Import/Export) │  (Daily Processing)    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  Excel Ingestor    │  ANP XML Generator  │  Validators  │ Alerts   │
│  - Daily Oil       │  - Type 001 (Óleo)  │  - Schema    │ - Limits │
│  - Daily Gas       │  - Type 002 (Gás L) │  - Business  │ - Prazos │
│  - Daily Water     │  - Type 003 (Gás D) │  - ANP Rules │ - NC     │
│  - Gas Balance     │  - Type 004 (Alarm) │              │          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (sgmfm schema)                                          │
│  - Master Data: installation, meter, measurement_source             │
│  - Daily: daily_snapshot, daily_measurement, balance_comparison     │
│  - Evaluation: evaluation_event, pvt_report, kfactor_*              │
│  - NC: nonconformance_event, breach, diagnosis, capa_action         │
│  - Support: evidence, deadline, pendencia                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Estrutura de Diretórios

```
sgm_fm/
├── alembic/                    # Migrações de banco
│   └── versions/
├── api/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app
│   ├── deps.py                 # Dependencies (DB session, auth)
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── installations.py    # CRUD instalações
│   │   ├── meters.py           # CRUD medidores
│   │   ├── daily.py            # Monitoramento diário
│   │   ├── evaluations.py      # Avaliações de desempenho
│   │   ├── nonconformances.py  # Não-conformidades
│   │   ├── anp_xml.py          # Geração/validação XML
│   │   └── health.py           # Health checks
│   └── schemas/
│       ├── __init__.py
│       ├── installation.py
│       ├── meter.py
│       ├── daily.py
│       ├── evaluation.py
│       ├── nonconformance.py
│       └── anp.py
├── core/
│   ├── __init__.py
│   ├── config.py               # Settings (env vars)
│   ├── database.py             # SQLAlchemy engine/session
│   └── constants.py            # ANP codes, limits, etc.
├── models/
│   ├── __init__.py
│   ├── base.py                 # Base model
│   ├── installation.py
│   ├── meter.py
│   ├── daily.py
│   ├── evaluation.py
│   └── nonconformance.py
├── services/
│   ├── __init__.py
│   ├── excel_ingestor/
│   │   ├── __init__.py
│   │   ├── base.py             # Parser base (anchor-based)
│   │   ├── daily_oil.py
│   │   ├── daily_gas.py
│   │   ├── daily_water.py
│   │   └── gas_balance.py
│   ├── anp_xml/
│   │   ├── __init__.py
│   │   ├── base.py             # XML generator base
│   │   ├── generator_001.py    # Óleo
│   │   ├── generator_002.py    # Gás Linear
│   │   ├── generator_003.py    # Gás Diferencial
│   │   ├── generator_004.py    # Alarmes
│   │   ├── validator.py        # Validador pré-envio
│   │   └── packager.py         # ZIP + naming
│   └── validators/
│       ├── __init__.py
│       ├── daily_validator.py
│       ├── balance_validator.py
│       └── deadline_calculator.py
├── cli/
│   ├── __init__.py
│   ├── import_excel.py         # CLI: importar relatórios
│   ├── generate_xml.py         # CLI: gerar XMLs ANP
│   └── check_deadlines.py      # CLI: verificar prazos
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_api/
│   ├── test_services/
│   └── golden_samples/         # XMLs de referência
├── scripts/
│   ├── schema.sql              # DDL completo
│   ├── seed.sql                # Dados iniciais
│   └── setup_db.sh
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
├── requirements.txt
└── README.md
```

---

## 3. Módulos Detalhados

### 3.1 Excel Ingestor (Monitoramento Diário)

**Responsabilidade:** Ler relatórios Excel da planta e normalizar para `daily_snapshot` + `daily_measurement`.

**Estratégia de Parsing (anchor-based):**
```python
ANCHORS = {
    'CUMULATIVE': 'Cumulative totals @ day close',
    'DAY': 'Day totals',
    'AVG': 'Flow weighted averages'
}
```

**Fluxo:**
1. Detectar tipo de arquivo (nome/aba/conteúdo)
2. Extrair metadados (Field, Period, Date and time)
3. Localizar âncoras e parsear blocos
4. Normalizar para formato long/tidy
5. Upsert em `daily_snapshot` + `daily_measurement`
6. Validar consistência (4 arquivos do mesmo dia)

**Tabela de Mapeamento (variáveis):**

| variable_raw | variable_code | unit_expected |
|-------------|---------------|---------------|
| Gross volume | gross_volume_m3 | m³ |
| Standard volume | standard_volume_sm3 | Sm³ |
| Mass | mass_t | t |
| Pressure | pressure_kpag | kPa g |
| Temperature | temperature_c | °C |
| K-Factor | k_factor_pls_m3 | pls/m³ |
| BS&W analyzer | bsw_pctvol | %vol |

### 3.2 ANP XML Generator

**Responsabilidade:** Gerar XMLs tipos 001-004 validados e prontos para i-Engine.

**Configuração:**
```python
ANP_CONFIG = {
    'cnpj8': '04028583',
    'cod_instalacao': 38480,
    'encoding': 'iso-8859-1',
    'naming_variant': 'B',  # com _COD_INSTALACAO
    'timezone': 'America/Sao_Paulo'
}
```

**Estrutura do Gerador:**
```python
class ANPXMLGenerator:
    def __init__(self, tipo: str, config: dict)
    def set_dados_basicos(self, **attrs) -> self
    def add_configuracao_cv(self, data: dict) -> self
    def add_elemento_primario(self, data: dict) -> self
    def add_producao(self, data: dict) -> self
    def validate(self) -> ValidationResult
    def to_xml(self) -> str
    def to_zip(self, output_path: str) -> str
```

**Validações Implementadas:**
- [x] XML bem-formado
- [x] Encoding iso-8859-1
- [x] Raiz correta (a001..a004)
- [x] Atributos obrigatórios
- [x] Formatos DATA_HORA (19 chars)
- [x] RACIONAL com vírgula decimal
- [x] Tamanho máximo TEXTO
- [x] ZIP com 1 XML na raiz

### 3.3 Non-conformance Workflow

**Trigger:** Criação de `nonconformance_event` (via trigger SQL já existente)

**Prazos Automáticos:**
- D+10: Relatório parcial
- D+30: Relatório final
- D+60: Reparo Topside
- D+120: Reparo Subsea
- D+60: Solicitação de prorrogação
- D+90: Prorrogação máxima

**Status Flow:**
```
IN_INVESTIGATION → ACTION_PLAN → IN_CONTINGENCY → CLOSED
```

---

## 4. APIs Propostas

### 4.1 Endpoints Core

```yaml
# Instalações
POST   /api/v1/installations
GET    /api/v1/installations
GET    /api/v1/installations/{id}
PATCH  /api/v1/installations/{id}

# Medidores
POST   /api/v1/meters
GET    /api/v1/meters
GET    /api/v1/meters/{id}
PATCH  /api/v1/meters/{id}

# Monitoramento Diário
POST   /api/v1/daily/upload           # Upload Excel (multipart)
POST   /api/v1/daily/snapshots        # Criar snapshot manual
GET    /api/v1/daily/snapshots        # Listar (filtro por data/instalação)
GET    /api/v1/daily/snapshots/{id}   # Detalhe com medições
GET    /api/v1/daily/balance/{date}   # Comparações de balanço

# Avaliações de Desempenho
POST   /api/v1/evaluations
GET    /api/v1/evaluations
GET    /api/v1/evaluations/{id}
PATCH  /api/v1/evaluations/{id}
POST   /api/v1/evaluations/{id}/pvt
POST   /api/v1/evaluations/{id}/totals
POST   /api/v1/evaluations/{id}/kfactors

# Não-conformidades
POST   /api/v1/nonconformances
GET    /api/v1/nonconformances
GET    /api/v1/nonconformances/{id}
PATCH  /api/v1/nonconformances/{id}
POST   /api/v1/nonconformances/{id}/breach
POST   /api/v1/nonconformances/{id}/diagnosis
POST   /api/v1/nonconformances/{id}/capa
GET    /api/v1/nonconformances/{id}/deadlines

# XML ANP
POST   /api/v1/anp/generate/{tipo}    # Gerar XML (001-004)
POST   /api/v1/anp/validate           # Validar XML existente
GET    /api/v1/anp/exports            # Histórico de exportações
GET    /api/v1/anp/exports/{id}/download

# Utilitários
GET    /api/v1/health
GET    /api/v1/config/tags            # TAGs cadastradas
GET    /api/v1/config/limits          # Limites operacionais
```

### 4.2 Schemas de Request/Response

Ver arquivos JSON Schema já fornecidos + extensões para:
- `DailyUploadResponse` (resultado do processamento Excel)
- `ANPGenerateRequest` (parâmetros para geração)
- `ANPValidationResult` (erros/warnings)

---

## 5. Modelo de Dados (Ajustes Propostos)

### 5.1 Tabelas Adicionais Sugeridas

```sql
-- Rastreabilidade de arquivos importados
CREATE TABLE IF NOT EXISTS sgmfm.import_log (
    import_id BIGSERIAL PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    file_type TEXT NOT NULL, -- DAILY_OIL, DAILY_GAS, etc.
    import_datetime TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL, -- OK, WARN, FAIL
    records_inserted INT,
    records_updated INT,
    errors JSONB DEFAULT '[]'::jsonb,
    UNIQUE(file_hash)
);

-- Histórico de XMLs gerados
CREATE TABLE IF NOT EXISTS sgmfm.anp_export_log (
    export_id BIGSERIAL PRIMARY KEY,
    xml_type TEXT NOT NULL, -- 001, 002, 003, 004
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    export_datetime TIMESTAMPTZ NOT NULL DEFAULT now(),
    validation_status TEXT NOT NULL, -- VALID, INVALID
    validation_errors JSONB DEFAULT '[]'::jsonb,
    sent_to_anp BOOLEAN DEFAULT FALSE,
    sent_datetime TIMESTAMPTZ,
    anp_response JSONB
);

-- TAGs conhecidas (dim_tag do PRD Excel)
CREATE TABLE IF NOT EXISTS sgmfm.tag_registry (
    tag_id BIGSERIAL PRIMARY KEY,
    tag_name TEXT NOT NULL UNIQUE,
    fluid_type TEXT, -- OIL, GAS, WATER
    description TEXT,
    installation_id BIGINT REFERENCES sgmfm.installation(installation_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Mapeamento variáveis para padronização
CREATE TABLE IF NOT EXISTS sgmfm.variable_mapping (
    variable_raw TEXT PRIMARY KEY,
    variable_code TEXT NOT NULL,
    unit_expected TEXT,
    fluid_type TEXT
);
```

### 5.2 View para Dashboard Diário

```sql
CREATE OR REPLACE VIEW sgmfm.v_daily_dashboard AS
SELECT 
    ds.snapshot_date,
    i.name AS installation_name,
    ms.source_name,
    ms.source_type,
    dm.phase,
    dm.mass_t,
    bc.comparison,
    bc.hc_balance_pct,
    bc.hc_status,
    bc.total_balance_pct,
    bc.total_status,
    bc.action_required
FROM sgmfm.daily_snapshot ds
JOIN sgmfm.installation i ON ds.installation_id = i.installation_id
LEFT JOIN sgmfm.daily_measurement dm ON ds.snapshot_id = dm.snapshot_id
LEFT JOIN sgmfm.measurement_source ms ON dm.source_id = ms.source_id
LEFT JOIN sgmfm.balance_comparison bc ON ds.snapshot_id = bc.snapshot_id
ORDER BY ds.snapshot_date DESC, ms.source_name, dm.phase;
```

---

## 6. Priorização de Implementação

### Fase 1 — Fundação (Semana 1-2)
1. [x] Setup PostgreSQL + schema
2. [ ] FastAPI com rotas básicas (CRUD master data)
3. [ ] Testes unitários iniciais
4. [ ] Docker Compose (API + DB)

### Fase 2 — Ingestão Excel (Semana 3-4)
1. [ ] Parser anchor-based para Daily Oil/Gas/Water
2. [ ] Parser Gas Balance
3. [ ] Endpoint upload + processamento
4. [ ] Validações de consistência
5. [ ] Import log

### Fase 3 — Geração XML ANP (Semana 5-6)
1. [ ] Gerador tipo 001 (Óleo)
2. [ ] Gerador tipo 002 (Gás Linear)
3. [ ] Gerador tipo 003 (Gás Diferencial)
4. [ ] Gerador tipo 004 (Alarmes)
5. [ ] Validador unificado
6. [ ] Empacotador ZIP
7. [ ] Golden tests com samples

### Fase 4 — Workflows NC (Semana 7-8)
1. [ ] APIs de não-conformidade completas
2. [ ] Cálculo automático de prazos
3. [ ] Alertas de vencimento
4. [ ] CAPA tracking

### Fase 5 — Avaliação de Desempenho (Semana 9-10)
1. [ ] APIs de avaliação completas
2. [ ] PVT e composição de gás
3. [ ] K-factors e totalizações
4. [ ] Relatório de avaliação

---

## 7. Decisões Técnicas

| Aspecto | Decisão | Justificativa |
|---------|---------|---------------|
| Framework | FastAPI | Async, tipagem, OpenAPI auto |
| ORM | SQLAlchemy 2.0 | Flexibilidade, raw SQL quando necessário |
| Validação | Pydantic v2 | Performance, integração FastAPI |
| Excel | openpyxl | Leitura completa, sem dependências C |
| XML | lxml | Performance, XPath, validação |
| Testes | pytest + httpx | Async support, fixtures |
| CI/CD | GitHub Actions | Simplicidade |
| Deploy | Docker + Compose | Portabilidade |

---

## 8. Próximos Passos

**Ação imediata:** Validar esta proposta com stakeholders antes de implementar.

**Perguntas pendentes:**
1. Migrar dados do Bacalhau existente ou começar limpo?
2. Prioridade: Excel ingestor ou XML generator primeiro?
3. Integração com i-Engine: apenas geração local ou também envio?
4. Autenticação: necessária para MVP?

---

## Anexo: Comparativo com Sistema Bacalhau

| Feature | Bacalhau | SGM-FM |
|---------|----------|--------|
| XML A001 | ✅ Básico | ✅ Completo + validação |
| XML A002 | ✅ Básico | ✅ Completo + validação |
| XML A003 | ✅ Básico | ✅ Completo + validação |
| XML A004 | ✅ Básico | ✅ Completo + validação |
| Excel Daily | ❌ | ✅ Anchor-based parser |
| MPFM Evaluation | ❌ | ✅ Workflow completo |
| Non-conformance | ❌ | ✅ D+10/D+30, CAPA |
| API REST | ❌ | ✅ FastAPI |
| Banco | SQLite | PostgreSQL |
| Triggers | ❌ | ✅ Prazos automáticos |

