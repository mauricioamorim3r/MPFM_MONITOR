# LOGICA_DADOS_APLICACAO — v2 (alinhada com o PRD v6 e com os exemplos reais)

> Objetivo: tornar a lógica (pipeline + modelo de dados + validações) **coerente** com a aplicação desejada:
> - Ingestão **em lote (ZIP)** ou arquivo a arquivo;
> - Para cada **ponto/medidor (MPFM)**: **1 `MPFM_Daily` + 24 `MPFM_Hourly` por dia**;
> - `PVTCalibration` como fonte dos dados do **Separador de Teste** (referência);
> - Consolidação em uma **base única** (staging → normalizada) para suportar **verificações** e **alertas**;
> - Geração/validação de **XML ANP a001/a002/a003/a004** conforme exemplares reais.

---

## 1) Escopo de dados e arquivos

### 1.1 Tipos de arquivo (entrada)
| Tipo | Exemplo (padrão) | Finalidade | Saídas (dados) |
|---|---|---|---|
| MPFM_HOURLY_PDF | `B03_MPFM_Hourly-20260125-010000+0000.pdf` | produção horária por medidor | métricas de massa/volume + médias P/T/densidades + metadados (janela) |
| MPFM_DAILY_PDF | `B03_MPFM_Daily-20260104-000000+0000.pdf` | fechamento diário por medidor | mesmas métricas do hourly (agregadas) + “Production Previous Day” |
| PVT_CALIB_PDF | `PVTCalibration_Bank03_Stream01_211-20260118-082110+0000.pdf` | calibração; referência do separador | Average Values (MPFM vs Separator) + Accumulated mass + Mass Correction Factors (Used/New) + densidades PVT + valores @ref |
| IHM_DAILY_XLSX | `Daily_Oil_YYYY-MM-DD.xlsx`, `Daily_Gas_...`, `Daily_Water_...`, `GasBalance_...` | consolidação operacional diária | blocos/tabelas por ponto (âncoras) |
| ANP_XML | `001_...xml`, `002_...xml`, `003_...xml`, `004_...xml` | envio ANP / auditoria | validação + armazenamento + (quando aplicável) reprocessamento |

### 1.2 Regra de completude diária (MPFM)
Para **cada medidor/ponto** e **para cada dia D**:
- Esperado: **1 arquivo Daily** (contém `MPFM_Daily`)
- Esperado: **24 arquivos Hourly** (contém `MPFM_Hourly`), cobrindo `00:00–01:00`, …, `23:00–00:00` (ou conforme janela do relatório)
- Validação obrigatória:  
  **Σ(24 horários) ≈ Daily** (por variável e por base), com tolerância configurável.

### 1.3 Ingestão em lote (ZIP)
- Entrada: um `.zip` contendo subpastas/arquivos.
- A pipeline deve:
  1) extrair para staging (sem perder path original),
  2) classificar cada arquivo,
  3) processar,
  4) gerar “matriz de completude” por (dia, medidor).

---

## 2) Classificação de arquivo e metadados

### 2.1 FileClassifier (por nome + assinatura de conteúdo)
Enum `file_type`:
- `MPFM_HOURLY_PDF`, `MPFM_DAILY_PDF`, `PVT_CALIB_PDF`
- `IHM_DAILY_XLSX_OIL`, `IHM_DAILY_XLSX_GAS`, `IHM_DAILY_XLSX_WATER`, `IHM_DAILY_XLSX_GASBAL`
- `ANP_XML_001`, `ANP_XML_002`, `ANP_XML_003`, `ANP_XML_004`
- `UNKNOWN`

Metadados mínimos extraídos do **nome**:
- `bank` (ex.: `B03`)
- `report_kind` (`Hourly|Daily|PVTCalibration`)
- `date_ref` (YYYYMMDD do nome, quando aplicável)
- `hour_ref` (HH quando aplicável)
- `tz_offset` (ex.: `+0000` do nome, quando aplicável)
- `calibration_no` (quando PVT)

Metadados mínimos extraídos do **conteúdo PDF**:
- janela do relatório (`period_start`, `period_end`)
- identificação do ponto: ex. `Riser P5 - 13FT0367`, `PE_4 - 18FT1506`
- (PVT) “Selected MPFM”, “Calibration Started/Ended”, “Separator” etc.

---

## 3) Modelo de dados (base única)

### 3.1 Princípio
- **Staging** guarda o “raw” e a extração por arquivo (reprocessável).
- **Normalized/Facts** guarda medidas por tempo/ponto/fonte, com unidades e granularidade corretas.
- **Derived** guarda reconciliações, alertas, contadores e estados.

### 3.2 Dimensões
**dim_asset_mpfm**
- `asset_id` (uuid)
- `meter_tag` (ex.: `13FT0367`)
- `meter_name` (ex.: `Riser P5`)
- `location` (`TOPSIDE|SUBSEA`)
- `bank`, `stream` (quando aplicável / inferido)
- `serial_number`
- `technology` (MPFM Topside/Subsea)
- `status`
- `valid_from`, `valid_to`

**dim_pairing**
- `pair_id`
- `subsea_meter_tag`
- `topside_meter_tag`
- `rule_basis` (ex.: “alocação/poço/riser”)
- `valid_from`, `valid_to`

**dim_source**
- `source_id`
- `source_type` (`MPFM_HOURLY|MPFM_DAILY|PVT_CAL|IHM|ANP_XML`)
- `source_system` (FCS320/FPM207/IHM/etc)

### 3.3 Staging
**stg_file**
- `file_id`
- `ingestion_batch_id` (opcional; para ZIP)
- `original_path`, `file_name`, `sha256`
- `file_type`, `detected_at`
- `parse_status` (`PENDING|OK|WARN|ERROR`)
- `errors[]`, `warnings[]`

**stg_extract_mpfm**
- `file_id`
- `meter_tag`
- `period_start`, `period_end`
- `granularity` (`HOURLY|DAILY`)
- medidas extraídas (ver 3.4) + `raw_sections_json`

**stg_extract_pvt_cal**
- `file_id`
- `calibration_no`
- `selected_mpfm`
- `calibration_started`, `calibration_ended`, `status`
- blocos: average_values, accumulated_mass, correction_factors(used/new), pvt_densities_meter, pvt_densities_sep, pvt_ref_values

### 3.4 Fatos (normalizados)
**fact_mpfm_hourly**
- chave: (`meter_tag`, `period_end`)
- métricas (por “base” quando existir):  
  - Mass: `uncorrected_mass_{phase}`, `corrected_mass_{phase}`, `pvt_reference_mass_{phase}`, `pvt_reference_mass_20c_{phase}`  
  - Volume: `pvt_reference_vol_{phase}`, `pvt_reference_vol_20c_{phase}`  
  - Phase: `oil|gas|water|hc|total`
- médias ponderadas: `avg_pressure_barg`, `avg_temperature_c`, `avg_density_oil_kgm3`, `avg_density_gas_kgm3`, `avg_density_water_kgm3` (e/ou conforme layout real)
- `units_version` (para rastrear “t vs kg”, Sm3 etc)

**fact_mpfm_daily**
- chave: (`meter_tag`, `date_ref`)
- mesmas métricas do hourly (agregadas) + `period_start/end`

**fact_pvt_calibration**
- chave: (`calibration_no`, `meter_tag`)
- campos dos blocos do relatório de calibração:
  - `avg_pressure_kpa_mpfm`, `avg_pressure_kpa_sep`, `avg_temp_c_mpfm`, ...
  - `acc_mass_oil_t_mpfm`, `acc_mass_oil_t_sep`, ...
  - `k_oil_used`, `k_oil_new`, `k_gas_used`, `k_gas_new`, `k_water_used`, `k_water_new`, `k_hc_used`, `k_hc_new`
  - `pvt_calc_density_oil_kgm3_mpfm`, `..._sep`
  - `pvt_ref_volume_oil_sm3`, `pvt_ref_density_oil_kgsm3`, etc

**fact_ihm_daily**
- por ponto/medidor (conforme mapeamento das âncoras da planilha)
- mantém versão do template e coluna origem

### 3.5 Derivados / Validações
**fact_reconciliation_hourly_to_daily**
- (`meter_tag`, `date_ref`, `metric_code`)
- `sum_hourly`, `daily_value`, `diff_abs`, `diff_pct`, `status`
- `evidence_file_ids[]` (24 + daily)

**fact_completeness_matrix**
- (`meter_tag`, `date_ref`)
- `expected_hourly=24`, `found_hourly`, `has_daily`, `missing_hours[]`, `status`

**fact_cross_validation**
- (`date_ref`, `meter_tag`, `metric_code`, `source_a`, `source_b`)
- `value_a`, `value_b`, `deviation_pct`, `classification`

**alert**
- `timestamp`, `meter_tag`, `category`, `severity`, `title`, `description`, `evidence_refs[]`, `ack/resolved`

---

## 4) Regras de validação (mínimas)

### 4.1 Completude
- Se `found_hourly < 24` ou `has_daily = false` → ALERTA “MISSING_FILES”.

### 4.2 Reconciliação Horário → Diário
- Para cada `metric_code` chave (ex.: `pvt_reference_mass_20c_oil_t`):
  - calcular `sum_hourly(metric_code, date_ref)`
  - comparar com `daily(metric_code, date_ref)`
  - regra: `abs(diff_pct) <= tolerance(metric_code)` → OK; senão ALERTA.

### 4.3 Consistência multi-fonte (MPFM × IHM × PVT)
- `MPFM daily` vs `IHM daily` por ponto equivalente (se mapeado)
- `PVTCalibration Separator` como referência do separador de teste (quando evento existir)
- classificação: CONSISTENTE/ACEITAVEL/INCONSISTENTE com limites configuráveis.

### 4.4 Contagem de dias consecutivos fora do limite
- O contador **não fica no front-end**: deve ser derivado do histórico em `fact_reconciliation_*` e/ou `fact_cross_validation`.
- Regra: janela móvel de 10 dias + “persistência” (ex.: >=10 dias fora) para abrir caso de desenquadramento.

---

## 5) XML ANP (001–004) — alinhamento aos exemplares

### 5.1 Regras estruturais observadas nos exemplos reais
- Declaração XML: `<?xml version="1.0" encoding="iso-8859-1"?>` (001–003; e recomendado também no 004)
- Raiz: `<a001>`, `<a002>`, `<a003>`, `<a004>`
- Nome de arquivo: `00X_<CNPJ8>_<AAAAMMDDHHmmSS>_<COD_INSTALACAO>.xml`

### 5.2 Consequência para o módulo `xmlGenerator`
- Remover/evitar o stub genérico `UTF-8` + `<ANP_MF_Medicao ...>` e **gerar exatamente** a estrutura `a00X`.
- Implementar **linter** por tipo (a001/a002/a003/a004) que valide:
  - encoding, raiz, campos obrigatórios, formatos de data/hora, separador decimal (vírgula quando for numérico), tamanhos máximos.
- Para `a004`: consolidar por dia/CV (quando aplicável) e aceitar listas vazias quando não houver dados.

---

## 6) Backlog de ajustes (para alinhar a implementação)
1. **FileClassifier v2** (inclui Hourly/Daily/PVT, ZIP batch, bank/stream).
2. **pdfParser v2**: extrair todas as linhas dos blocos (uncorrected/corrected/PVT reference/médias) – não só oil/gas/water/hc/total.
3. **Data model v2**: separar `fact_mpfm_hourly`, `fact_mpfm_daily`, `fact_pvt_calibration`, `reconciliation`.
4. **Completeness + Reconciliation engine**: esperado 24+1 por medidor/dia.
5. **xmlGenerator alinhado ao `a00X`** + linter.

---
