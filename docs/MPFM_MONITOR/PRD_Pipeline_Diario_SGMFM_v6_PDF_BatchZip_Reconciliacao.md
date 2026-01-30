# PRD — Pipeline Diário SGM‑FM (PDF MPFM Hourly/Daily + PVTCalibration + Registro de Monitoramento/Calibração) → Base Única (v5)

**Status:** Draft v5 (incremento com regras de PDF Hourly/Daily, reconciliação 24h↔Diário e calibração via PVTCalibration)  
**Objetivo:** Definir, em passos executáveis, como a aplicação deve **descobrir, ler, validar, extrair, normalizar e consolidar** os **PDFs** operacionais (MPFM Hourly/Daily e PVTCalibration) em uma **base única**; e como essa base alimenta (i) o **Registro Diário de Monitoramento** e (ii) o **Registro de Calibração (K‑Factors)**.

---

## 1) Escopo

### 1.1 No escopo (MVP PDF)
1. **Ingestão de PDFs por ponto/medidor (MPFM):**
   - `*MPFM_Daily*` (1 arquivo/dia por medidor/ponto).
   - `*MPFM_Hourly*` (24 arquivos/dia por medidor/ponto).
2. **Ingestão de PDFs de calibração / referência (Separador de Teste):**
   - `*PVTCalibration*` (eventos de calibração; contém “Separator” como referência).
3. **Validações de consistência:**
   - Completude (1 Daily + 24 Hourly/dia/ponto).
   - Reconciliação: **Σ(24 Hourly) ≈ Daily** por variável/fase.
4. **Extração e normalização dos campos mostrados nos relatórios:**
   - Massas (uncorrected/corrected/reference), volumes de referência, P/T/densidades médias, etc.
5. **Cargas na Base Única + trilha de auditoria.**
6. **Camadas derivadas:**
   - Tabela canônica “Registro de Monitoramento Diário” (Topside vs Subsea vs Separador).
   - Estrutura canônica “Registro de Calibração” (01→07) para K‑Factors.

### 1.2 Fora do escopo (por enquanto)
- Geração/validação de XML ANP 001–004 (documentado em PRDs separados).
- OCR em imagem (usar apenas se PDF não tiver texto extraível).
- Interface visual completa (fica para PRD de UI).

---

## 2) Convenções de arquivos (Naming + metadados)

### 2.1 MPFM Hourly
**Padrão:** `B??_MPFM_Hourly-YYYYMMDD-HH0000+0000.pdf` (ex.: `B03_MPFM_Hourly-20260125-010000+0000.pdf`)  
O próprio PDF traz:
- “Hourly Report from … to …” e o timestamp de fechamento (ex.: “2026.01.25 01:00”).  
- Identificação do ponto: `Riser P5 - 13FT0367` (TAG).  

### 2.2 MPFM Daily
**Padrão:** `B??_MPFM_Daily-YYYYMMDD-000000+0000.pdf`  
O PDF traz:
- “Daily Report from … to …” cobrindo 24h (00:00 → 00:00 do dia seguinte).
- Pode conter **mais de um ponto** no mesmo arquivo (ex.: vários risers em sequência).

### 2.3 PVTCalibration (calibração + referência do separador)
**Padrão:** `PVTCalibration_BankXX_StreamYY_<CalibrationNo>-YYYYMMDD-HHmmSS+0000.pdf`  
O PDF traz:
- `Calibration No.` (ex.: 211)
- `Selected MPFM` (ex.: `N1 - 13FT0367`)
- janelas de início/fim, status
- blocos “Average Values”, “Accumulated mass during calibration”, “Mass Correction Factors”, “PVT calculated …”.

---

## 3) Pipeline (passo a passo)

### Passo 0 — Carga do Asset Registry (pré‑requisito)
A aplicação deve carregar um cadastro mestre (`dim_asset_registry`) contendo, no mínimo:
- `asset_tag` (ex.: 13FT0367, 18FT1506)
- `asset_type` (MPFM Topside/Subsea, Gas Lift, Injeção…)
- `bank`, `stream` (quando aplicável)
- `installation`, `cabinet` (ex.: 13JC100), `flow_computer` (FPM207)
- `effective_from/effective_to`, `registry_version`

> Este cadastro é a “cola” para identificar corretamente o ponto e evitar ingestão errada (arquivo roteado no bank errado, stream trocado, etc.).

### Passo 1 — Descoberta e agrupamento diário
Para cada “dia operacional” D e para cada `asset_tag`:
1. Encontrar **1 PDF Daily** com `MPFM_Daily`.
2. Encontrar **24 PDFs Hourly** com `MPFM_Hourly`.
3. Persistir um “manifest” do lote:
   - `batch_id`, `asset_tag`, `day=D`, `expected_hourly=24`, `found_hourly=n`, `found_daily=0/1`
   - hashes/CRC dos arquivos, timestamps, tamanho, origem (upload/manual).

**Falhas:**
- `found_hourly != 24` → `quality_flag=batch_incomplete`.
- `found_daily != 1` → `quality_flag=daily_missing`.

### Passo 2 — Parsing MPFM Hourly (por arquivo)
O parser deve extrair **por seção de ponto** (ex.: `Riser P5 - 13FT0367`) e gravar 1 registro canônico por (ponto, janela horária).

**Campos mínimos (Production Previous Hour):**
- `period_start`, `period_end` (do cabeçalho “Hourly Report from … to …”)
- Massas por fase (Gas, Oil, HC, Water, Total) para:
  - `MPFM uncorrected mass [t]`
  - `MPFM corrected mass [t]`
  - `PVT reference mass [t]`
  - `PVT reference volume` (quando existir)
- (Opcional) blocos de “Flow Weighted Averages Previous Hour” (P/T/densidades por fase).

### Passo 3 — Parsing MPFM Daily (por arquivo)
O parser deve:
1. Identificar **todas as seções de pontos** no PDF.
2. Para cada ponto, extrair “Production Previous Day” e “Flow Weighted Averages Previous Day”.

**Campos mínimos (Production Previous Day):**
- `period_start`, `period_end` (24h)
- Massas por fase (Gas, Oil, HC, Water, Total):
  - `MPFM uncorrected mass [t]`
  - `MPFM corrected mass [t]`
  - `PVT reference mass [t]`
- Volumes em condição de referência:
  - `PVT reference volume [Sm³]`
  - `PVT reference mass @20 degC [t]`
  - `PVT reference volume @20 degC [Sm³]` (quando presente)

### Passo 4 — Reconciliação (Σ Hourly ↔ Daily)
Para cada `asset_tag` e dia D:
1. Somar, nas 24 janelas horárias, as grandezas acumulativas de interesse:
   - `MPFM uncorrected mass [t]` por fase
   - `MPFM corrected mass [t]` por fase
   - `PVT reference mass [t]` por fase
   - (Se existir) `PVT reference volume` por fase/unidade
2. Comparar com o registro Daily do mesmo dia/ponto.

**Regra de aceitação (sugestão padrão):**
- `abs(sum_hourly - daily) <= max(0.01 t, 0.0005 * daily)` por fase e métrica  
  (ou seja, tolerância mínima de 0,01 t ou 0,05% relativo — parametrizável).
- Se `daily == 0`, aceitar `sum_hourly == 0` (com tolerância mínima).

**Saídas:**
- `reconciliation_status = OK | WARN | FAIL`
- `reconciliation_delta_abs`, `reconciliation_delta_pct`
- `quality_flag=reconciliation_mismatch` quando FAIL.

### Passo 5 — Parsing PVTCalibration (evento de calibração)
Gerar 1 registro de calibração por arquivo/evento, com vínculo ao `asset_tag` do MPFM.

**Campos mínimos:**
- Identificação:
  - `calibration_no`
  - `selected_mpfm` (texto) + `asset_tag` extraído (ex.: 13FT0367)
  - `calibration_started`, `calibration_ended`, `status`
- **Average Values** (MPFM vs Separator):
  - `pressure_kpa`, `temperature_c`
  - `density_oil_kgm3`, `density_gas_kgm3`, `density_water_kgm3`
- **Accumulated mass during calibration** (MPFM vs Separator):
  - `oil_t`, `gas_t`, `water_t`, `hc_t`
- **Mass Correction Factors**:
  - `oil_used`, `oil_new`
  - `gas_used`, `gas_new`
  - `water_used`, `water_new`
  - `hc_used`, `hc_new`
- **PVT calculated**:
  - densidades em condição de medidor (MPFM/Separator)
  - valores em condição de referência (@std): volumes (Sm³) e densidades (kg/Sm³)

> Observação: esses campos abastecem diretamente (i) o **Registro de Calibração (K‑Factors)** e (ii) a camada de referência do **Separador de Teste** para verificações.

---

## 4) Modelo de dados (Base Única)

### 4.1 Tabelas principais (mínimo)
1. `dim_asset_registry` (cadastro mestre)
2. `fact_mpfm_hourly`
3. `fact_mpfm_daily`
4. `fact_pvt_calibration`
5. `fact_batch_manifest` (controle de lote)
6. `audit_log` (rastreabilidade)

### 4.2 Tabelas derivadas (para verificações/rotinas)
1. `fact_monitoring_daily`  
   **Forma canônica do “MODELO REGISTRO MONITORAMENTO DI”**: compara Topside vs Subsea vs Separador e calcula balanços/limites/gatilhos.
2. `fact_calibration_register`  
   **Forma canônica do “MODELO REGISTRO CAL”**: passos 01→07 + evidências (PVT, totalizadores 24h, K‑Factors, pós‑monitoramento, alarmes).

---

## 5) Mapeamento direto para os modelos de registros

### 5.1 Registro de Monitoramento Diário (MODELO REGISTRO MONITORIAMENTO DI)
O registro contém, por dia:
- Massas por fase (óleo, gás, água, HC, total) para:
  - `MEDIDOR TOPSIDE`
  - `MEDIDOR SUBSEA`
  - `SEPARADOR DE TESTE`
- Variáveis volumétricas (m³, Sm³) e P/T (barg, °C)
- Cálculos de:
  - Balanço HC (%) e limite
  - Balanço Total (%) e limite
  - Status por comparação (Top vs Sub; Top vs Sep; Sub vs Sep)
  - Gatilho por **dias consecutivos** (>10 dias) e registro de ações/eventos.

**Fonte de dados:**
- Topside/Subsea: `fact_mpfm_daily` (campos “Production Previous Day”).
- Separador de Teste (referência para calibração/checagens): `fact_pvt_calibration` e/ou totalizadores específicos quando existirem na mesma base.

### 5.2 Registro de Calibração (MODELO REGISTRO CAL) — passos 01→07
O modelo define explicitamente o fluxo (resumo):
1) **01_Registro** (rastreabilidade do evento, período, condições de contorno)  
2) **02_PVT** (atualização/validação da caracterização PVT)  
3) **03_24h_Totalizadores** (totalização mínima de 24h; deltas e somatórios)  
4) **04_K_Fatores** (cálculo de K = Referência / MPFM; massas corrigidas e validações)  
5) **05_…** (balanços/envelopes)  
6) **06_…** (monitoramento pós‑aplicação dos fatores)  
7) **07_…** (log de alarmes/eventos)

**Parâmetros de aceitação (ajustáveis no registro):**
- `K mínimo = 0,80`
- `K máximo = 1,20`
- `Limite desvio Massa HC (±) = 10,00%`
- `Limite desvio Massa Total (±) = 7,00%`
- Regra operacional: **“Não calcular novo fator K para a fase água.”**

**Fontes no pipeline:**
- PVTCalibration → alimenta (02) e fornece valores de referência MPFM vs Separator.
- Hourly/Daily PDFs → alimentam (03) e as massas base do período.
- Alarmes/Eventos (quando fornecidos) → alimentam (07).

---

## 6) Regras de qualidade e validações

### 6.1 Estruturais (layout)
- Detectar presença de cabeçalhos:
  - “Hourly Report from …”, “Daily Report from …”
  - “Production Previous Hour/Day”
- Detectar a seção do ponto (ex.: `Riser … - TAG`)
- Detectar linhas de métricas (uncorrected/corrected/reference)

### 6.2 Conteúdo (tipos/unidades)
- Massas em **t** (toneladas) devem ser numéricas.
- Pressão em kPa (calibração) e barg (monitoramento diário) devem ser coerentes (converter apenas quando explicitamente requerido).
- Campos “-” (ausente) devem virar `NULL` e gerar `quality_flag=missing_value`.

### 6.3 Reconciliação 24h↔Daily
- Σ(24 Hourly) ≈ Daily para cada métrica e fase.
- Se FAIL: bloquear “OK” do lote e obrigar registro de justificativa (audit).

### 6.4 Coerência de calibração (PVTCalibration)
- `status` deve ser “Completed …” para aceitar como referência.
- Fatores `new` muito fora do envelope (ex.: <0,5 ou >1,5) → `quality_flag=cal_factor_outlier` (parametrizável).
- Se `water_new` for extremo, aplicar regra: **não propor K novo para água** (apenas registrar).

---

## 7) Saídas e contratos (para as verificações)
Ao final de cada dia D, por `asset_tag`:
1. `fact_mpfm_hourly` com 24 registros.
2. `fact_mpfm_daily` com 1 registro.
3. `reconciliation_status` calculado e persistido.
4. Se houver calibração no período: `fact_pvt_calibration` com evento(s).
5. `fact_monitoring_daily` populado para Topside/Subsea/Sep + gatilhos (dias consecutivos, ações).
6. Auditoria completa (`audit_log` + `batch_manifest`).

---

## 8) Critérios de aceite (MVP)
1. Importar um lote com:
   - 1 Daily + 24 Hourly para um mesmo `asset_tag` e dia, com reconciliação **OK**.
2. Importar um PVTCalibration e preencher automaticamente os campos correspondentes do registro de calibração (02 e referência).
3. Gerar a visão diária consolidada (monitoramento) com balanços e status.
4. Persistir rastreabilidade (arquivo → extração → campo → cálculo → decisão).



---

# Apêndice — Ingestão em lote via ZIP + validações (evidência com pacote real)

## A. Upload em lote (recomendado)
Para operação diária, o sistema deve aceitar **1 arquivo ZIP** contendo todos os PDFs do(s) ponto(s) do dia (Hourly/Daily/PVTCalibration).
- O pipeline deve **descompactar**, **indexar** e registrar `package_id`, `sha256`, `file_count`, `ingestion_ts`.
- Cada arquivo vira um registro em `stg_files` (metadados + status do parse).

## B. Validação de completude (Hourly vs Daily)
Regra operacional (por ponto/medidor):
- Esperado **24 Hourly** cobrindo o dia **00:00 → 00:00** (construído pela **data do `period_start`** do relatório).
- Esperado **1 Daily** correspondente ao mesmo dia.
- Se faltarem horas, marcar: `quality_flag = missing_hourly` e listar horas faltantes.
- Se faltar o Daily: `quality_flag = missing_daily`.
- Se Daily existir: executar reconciliação `Σ Hourly` vs `Daily` (por fase e por métrica) com tolerância configurável.

### B.1 Evidência do pacote recebido: `OneDrive_3_1-30-2026.zip`
- Conteúdo: **50 PDFs** `B03_MPFM_Hourly` (Bank 03).  
- Janela temporal observada: **2026-01-23 23:00 → 2026-01-26 01:00**.

**Completude por dia (definição: `period_start`):**
| day        |   hourly_files | status            |
|:-----------|---------------:|:------------------|
| 2026-01-23 |              1 | INCOMPLETO (1/24) |
| 2026-01-24 |             24 | OK (24/24)        |
| 2026-01-25 |             24 | OK (24/24)        |
| 2026-01-26 |              1 | INCOMPLETO (1/24) |

> Observação: este pacote **não contém** os PDFs `MPFM_Daily`. Logo, para estes dias o pipeline deve registrar `missing_daily`.

### B.2 Totais diários derivados (Σ 24 Hourly) — Bank 03 (North Topside MPFM)
Abaixo estão os totais calculados a partir dos 24 Hourly de cada dia completo (para comparação direta com o `MPFM_Daily` correspondente quando ele existir):

| day        |   uncorr_gas_t |   uncorr_oil_t |   uncorr_hc_t |   uncorr_water_t |   corr_gas_t |   corr_oil_t |   corr_hc_t |   corr_water_t |   corr_total_t (hc+water) |   HC-(Gas+Oil) t |   PVTref_gas_Sm3@20 |   PVTref_oil_Sm3@20 |
|:-----------|---------------:|---------------:|--------------:|-----------------:|-------------:|-------------:|------------:|---------------:|--------------------------:|-----------------:|--------------------:|--------------------:|
| 2026-01-24 |        732.234 |       2487.430 |      3219.664 |            0.438 |      704.346 |     2348.944 |    3049.988 |          0.438 |                  3050.426 |           -3.302 |         1070888.000 |            2485.845 |
| 2026-01-25 |        723.676 |       2650.699 |      3374.374 |            0.640 |      696.111 |     2503.125 |    3196.548 |          0.640 |                  3197.188 |           -2.688 |         1085304.000 |            2637.776 |

Notas de validação:
- A coluna **HC-(Gas+Oil)** não zera exatamente (ex.: ~-3 t/dia), então o PRD deve prever **tolerância** (ex.: absoluta em t e relativa em %), além de regra de arredondamento.
- Em `PVT reference mass/volume`, a coluna **HC** aparece como “-” no PDF e deve ser persistida como **NULL**.

## C. PVTCalibration como fonte do Separador de Teste (referência)
O pipeline deve identificar arquivos com `PVTCalibration` no nome e extrair, no mínimo:
- Identificação (Calibration No, MPFM selecionado, período, status)
- **Average Values** (P/T/densidades MPFM vs Separator)
- **Accumulated mass during calibration** (MPFM vs Separator por fase + HC)
- **Mass Correction Factors** (Used + New por fase + HC)
- **PVT calculated densities at meter conditions**
- **PVT-calculated values at reference conditions** (volumes e densidades)

**Exemplo extraído do arquivo** `PVTCalibration_Bank03_Stream01_211-20260118-082110+0000.pdf` (campos-chave):
|   Calibration No | Selected MPFM   | Calibration Started   | Calibration Ended   | Status              |   Avg Pressure MPFM (kPa) |   Avg Pressure Separator (kPa) |   Avg Temp MPFM (°C) |   Avg Temp Separator (°C) |   Avg Density oil MPFM (kg/m³) |   Avg Density oil Separator (kg/m³) |   Accum mass Oil MPFM (t) |   Accum mass Oil Separator (t) |   Mass Corr Factor Oil Used |   Mass Corr Factor Oil New |   Mass Corr Factor Water New |   PVT ref Volume Oil (Sm³) |   PVT ref Volume Gas (Sm³) |
|-----------------:|:----------------|:----------------------|:--------------------|:--------------------|--------------------------:|-------------------------------:|---------------------:|--------------------------:|-------------------------------:|------------------------------------:|--------------------------:|-------------------------------:|----------------------------:|---------------------------:|-----------------------------:|---------------------------:|---------------------------:|
|              211 | N1 - 13FT0367   | 17.01.2026 08:20      | 18.01.2026 08:21    | Completed - Passive |                   11505.7 |                        8343.63 |                75.07 |                     72.18 |                        754.033 |                             831.987 |                   6365.07 |                        6742.65 |                     0.94433 |                     1.0908 |                      17.0939 |                    7176.05 |                2.47929e+06 |

Regras adicionais:
- O modelo de cálculo (MODELO REGISTRO CAL) indica que **não se calcula novo fator K para água**; portanto o pipeline deve:
  - persistir o valor “New Water” quando existir (para rastreabilidade),
  - mas **marcar** `water_new_factor_flag = ignore_for_k_update` e impedir atualização automática de K/CF de água.
