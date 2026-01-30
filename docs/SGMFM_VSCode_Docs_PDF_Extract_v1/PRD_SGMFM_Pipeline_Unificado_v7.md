# PRD — Pipeline Unificado de Ingestão e Verificação Diária (SGM‑FM Bacalhau)
**Versão:** v7  
**Escopo:** PDFs MPFM (Hourly/Daily) + PDF PVTCalibration + Excels diários IHM (Oil/Gas/Water + GasBalance) + XML ANP (001–004)  
**Objetivo:** manter uma **base única** (auditável) de dados diários/horários por medidor/ponto, habilitando validações, reconciliações, alertas e geração/validação de XML ANP.

---

## 1. Visão geral e objetivo do produto
A aplicação deve permitir que o usuário faça upload diário (preferencialmente em lote via ZIP) dos arquivos operacionais do SGM‑FM e obtenha:
1) **Extração completa** de campos (sem depender do TAG ser Topside/Subsea/Separador).  
2) **Normalização** para uma base única (schema padronizado e versionável).  
3) **Validações automáticas** (completude, soma 24h→Daily, consistência de massas/volumes, coerência entre fontes).  
4) **Registro de calibração** (PVTCalibration) com referência do separador e fatores Used/New.  
5) **Preparação e verificação de XML ANP 001–004** (quando aplicável no lote), com relatórios de conformidade.

---

## 2. Entradas suportadas (fontes de dados)
### 2.1 PDFs MPFM
- **Hourly**: contém “MPFM_Hourly” no nome.
- **Daily**: contém “MPFM_Daily” no nome.
- PDFs podem conter **múltiplos pontos** (múltiplas seções por TAG).

### 2.2 PDF PVTCalibration (Separador de Teste)
- Contém “PVTCalibration” no nome.
- Fonte auditável para comparação **MPFM vs Separator** e cálculo/registro de fatores.

### 2.3 Excels diários (IHM)
- `Daily_Oil_YYYY-MM-DD.xlsx`
- `Daily_Gas_YYYY-MM-DD.xlsx`
- `Daily_Water_YYYY-MM-DD.xlsx`
- `GasBalance_YYYY-MM-DD.xlsx`
> Observação: a ingestão Excel é **complementar**: serve para reconciliar totais e indicadores, e para preencher dashboards/registros.

### 2.4 XML ANP (001, 002, 003, 004)
- Arquivos ANP reais no formato `00X_<CNPJ8>_<AAAAMMDDHHmmSS>_<COD_INSTALACAO>.xml` (observado).
- Devem ser validados e/ou gerados respeitando **encoding, estrutura, campos obrigatórios e regras de natureza de dados** por tipo.

---

## 3. Regras operacionais (obrigatórias)
### 3.1 Conjunto esperado por ponto e por dia (MPFM)
Para cada **ponto/medidor** em um dia D:
- Esperar **1 arquivo Daily** do dia (janela D00:00 → D+1 00:00).
- Esperar **24 arquivos Hourly** cobrindo as 24 janelas horárias do dia.

### 3.2 Regra de fechamento (reconciliação)
A soma dos 24 horários deve fechar o diário correspondente:
- Por fase: **Gas / Oil / HC / Water / Total**
- Por métrica:  
  - MPFM uncorrected mass  
  - MPFM corrected mass  
  - PVT reference mass / volume  
  - PVT reference mass/volume @20°C

> O sistema deve aplicar tolerâncias configuráveis e registrar PASS/WARN/FAIL com evidência (diff_abs/diff_pct).

### 3.3 Separador de teste via PVTCalibration
As informações do separador devem ser obtidas de arquivos **PVTCalibration** e vinculadas ao `asset_tag` selecionado no relatório, gerando um registro completo do evento de calibração.

---

## 4. Workflow do usuário (alto nível)
1) Usuário faz upload de:
   - ZIP do dia (recomendado), ou múltiplos arquivos.
2) Sistema:
   - Identifica tipo (Hourly/Daily/PVTCalibration/Excel/XML).
   - Extrai metadados (período “from/to”, ponto/TAG, bank/stream).
   - Faz parsing e normalização.
   - Executa validações e calcula indicadores.
3) Sistema retorna:
   - Banco atualizado (base única).
   - Relatório de conformidade do lote (o que entrou, o que faltou, o que falhou).
   - Alertas acionáveis (ex.: missing_daily, missing_hourly, reconciliation_fail, registry_mismatch).

---

## 5. Requisitos funcionais — Parser de PDF (MPFM Hourly/Daily)
> O detalhamento completo de rótulos/linhas/colunas obrigatórias está no pacote:  
`SGMFM_VSCode_Docs_PDF_Extract_v1.zip` (docs/02_field_map_mpfm_daily_hourly.md)

### 5.1 Detecção de janela de tempo
Extrair do cabeçalho do PDF:
- `period_start` e `period_end` (fonte de verdade para o período).
- `report_type` = DAILY ou HOURLY.

### 5.2 Detecção de seções por ponto (TAG)
Dentro de um mesmo PDF, pode haver N seções do tipo:
- `Riser P5 - 13FT0367` (Topside)
- `PE_4 - 18FT1506` (Subsea)

Para cada seção gerar 1 registro por (arquivo, seção/ponto).

### 5.3 Bloco “Production Previous Day/Hour” — obrigatório
Extrair **todas** as linhas e colunas (mesmo se zero / “-”):
- Linhas: MPFM uncorrected mass; MPFM corrected mass; PVT reference mass; PVT reference volume; variações @20°C.
- Colunas: Gas, Oil, HC, Water, Total.
- Tratamento: “-” → NULL (não converter para zero).

### 5.4 Bloco “Flow Weighted Averages Previous Day/Hour” — obrigatório
Extrair:
- Pressure [barg] (coluna Meter)
- Temperature [°C] (coluna Meter)
- Density [kg/m³] (colunas Gas/Oil/Water)

---

## 6. Requisitos funcionais — Parser de PDF (PVTCalibration)
> O detalhamento completo está no pacote:  
`SGMFM_VSCode_Docs_PDF_Extract_v1.zip` (docs/03_field_map_pvt_calibration.md)

Extrair obrigatoriamente:
- Metadados: calibration_no; selected_mpfm; start/end; status; bank/stream.
- Average Values (MPFM vs Separator): Pressure, Temperature, densidades (oil/gas/water).
- Well Composition (Used vs Calculated): componentes (mol%), pesos/densidades C7–C10+, Peneloux.
- Página 2:
  - Accumulated mass during calibration (MPFM vs Separator): Oil/Gas/Water/HC.
  - Mass Correction Factors (Used/New): Oil/Gas/Water/HC.
  - PVT densities at meter conditions (MPFM vs Separator): Oil/Gas/Water.
  - PVT-calculated values at reference conditions: volumes (Sm³) e densidades (kg/Sm³).

Regra interna (importante):
- Persistir sempre `cf_new_water`, porém **não aplicar automaticamente** sem regra/procedimento.

---

## 7. Requisitos funcionais — Ingestão de Excel (IHM)
### 7.1 Objetivo
Os Excels IHM são usados para:
- reconciliar totais diários (IHM x MPFM/CV),
- identificar anomalias de unidade/label (ex.: massa do gás em magnitude de kg),
- calcular balanço (GasBalance) e encontrar contribuições dominantes do desbalanço.

### 7.2 Regras mínimas
- Ler planilhas preservando cabeçalhos e unidades.
- Armazenar cada valor com:
  - `source_workbook`, `sheet_name`, `cell_range` (quando aplicável)
  - `business_date` derivado do nome do arquivo e/ou conteúdo.

---

## 8. Requisitos funcionais — XML ANP 001–004 (validação/geração)
### 8.1 Objetivo
- Validar XMLs recebidos (estrutura, encoding, obrigatoriedades, formatos e regras de natureza).
- (Opcional) Gerar XMLs quando a aplicação se tornar geradora oficial (por tipo).

### 8.2 Regras mínimas para validação
- Encoding e declaração XML conforme padrão real da instalação.
- Raízes `<a001>`, `<a002>`, `<a003>`, `<a004>`.
- Campos obrigatórios presentes; quando sem valor, aplicar regras “0” vs vazio conforme tipo.
- Datas/horas no formato esperado por tipo (19 chars quando DATA_HORA).
- Relatório de conformidade por arquivo: PASS/WARN/FAIL + lista de achados.

---

## 9. Modelo de dados (base única) — recomendado
O objetivo é manter dados **normalizados e auditáveis**:
- 1 linha por (asset, janela de tempo, granularidade)
- metadados de origem (arquivo, hash, período, seção) para rastreabilidade

Mínimo recomendado:
- `dim_asset_registry`
- `dim_file`
- `fact_mpfm_production`
- `fact_pvt_calibration`
- `fact_reconciliation_daily`
- (Opcional) `fact_ihm_daily`, `fact_gas_balance`

---

## 10. Validações e qualidade (aceitação)
Mínimo obrigatório:
- Completude por dia: 24 hourly + 1 daily por asset.
- Reconciliação: Σ hourly vs daily por métrica/fase.
- Sanity checks: Total≈HC+Water; HC≈Oil+Gas (quando aplicável).
- Asset registry: bank/stream e TAG coerentes (flag `registry_mismatch`).
- PVTCalibration: coerência temporal; fatores e limites; registro auditável.

---

## 11. Saídas / artefatos gerados
- Base única atualizada (SQLite/Postgres — decisão do projeto).
- Relatório do lote (JSON + render HTML/PDF opcional):
  - arquivos processados, faltantes, duplicados, falhas
  - reconciliações e diffs
  - eventos de calibração encontrados
  - XMLs validados e status
- Logs técnicos:
  - erros de parsing por arquivo/página/seção
  - warnings (layout inesperado, campos ausentes, valores fora de faixa)

---

## 12. Critérios de aceite (MVP)
1) Dado um lote com Hourly/Daily de um dia e um ponto:
   - sistema extrai todos os campos do mapa (produção + FWAs),
   - gera 24 registros hourly + 1 daily,
   - calcula reconciliação e status PASS/WARN/FAIL.
2) Dado um PVTCalibration:
   - sistema extrai 100% dos campos (metadados, avg values, composição, massas, fatores, densidades, referência).
3) Dados XMLs 001–004:
   - sistema valida estrutura/encoding e gera relatório de conformidade por arquivo.
4) Rastreabilidade:
   - qualquer valor no banco deve ser rastreável até arquivo+hash+período+asset_tag.

---

## 13. Anexos (documentos complementares no repositório)
- `SGMFM_VSCode_Docs_PDF_Extract_v1.zip` (docs/01–05 + parser_config_example.yaml)
- `LOGICA_DADOS_APLICACAO_v2.md` (visão consolidada de pipeline e modelagem)
