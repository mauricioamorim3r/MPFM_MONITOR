# PRD — Ingestão dos Relatórios Diários (Excel) para Base Única (FPSO Bacalhau)

**Objetivo:** definir, de forma executável (passo a passo), como **ler, validar, extrair e normalizar** os dados dos relatórios diários em Excel recebidos da planta, consolidando tudo em **uma base única** que será atualizada diariamente.

**Arquivos modelo analisados (amostras):**
- `Daily_Oil_2026-01-27.xlsx` (aba: `Oil_0001`)
- `Daily_Gas_2026-01-27.xlsx` (aba: `Gas_0001`)
- `Daily_Water_2026-01-27.xlsx` (aba: `Water_0001`)
- `GasBalance_2026-01-27.xlsx` (aba: `0001`)

---

## 1) Escopo

### 1.1 Entradas (input)
1. **Daily Oil** — totais e médias ponderadas por vazão (fiscal e referências internas).
2. **Daily Gas** — totais e médias ponderadas (inclusive energia e PCS/PCI).
3. **Daily Water** — totais e médias ponderadas (pressão/temperatura/M/K, etc.).
4. **Gas Balance** — balanço de gás (linhas de entrada/saída, bases “Flow rate basis” e “PD basis”).

> Observação: estes relatórios são **planilhas em formato de relatório**, com “blocos” (matrizes) ancorados por textos (“Day totals”, “Cumulative totals…”, “Flow weighted averages”), e **não** tabelas simples já normalizadas.

### 1.2 Saídas (output)
- Base única com:
  - **Metadados do relatório** (campo, período, data/hora de geração, etc.)
  - **Totais diários e acumulados** por ponto de medição (TAG) e variável.
  - **Médias ponderadas** (pressão, temperatura, densidades, fatores, etc.).
  - **Gas Balance** por linha (+/–), com unidades e valores.
- Rotina de **atualização diária**: inserir (ou *upsert*) o dia novo sem duplicar histórico.

### 1.3 Não-escopo (por agora)
- Correções metrológicas “a posteriori” (ex.: recalcular massa/volumes por retificação de K-factor).
- Conciliação completa com PDFs/Logs/Configuração do CV (isso entra em outro módulo).

---

## 2) Regras de identificação e metadados

### 2.1 Detecção do tipo de arquivo
Ordem recomendada (mais robusto → menos robusto):

1. **Nome do arquivo**:
   - `Daily_Oil_YYYY-MM-DD.xlsx` → tipo = `DAILY_OIL`
   - `Daily_Gas_YYYY-MM-DD.xlsx` → tipo = `DAILY_GAS`
   - `Daily_Water_YYYY-MM-DD.xlsx` → tipo = `DAILY_WATER`
   - `GasBalance_YYYY-MM-DD.xlsx` → tipo = `GAS_BALANCE`
2. **Nome da aba principal** (fallback):
   - começa com `Oil_` / `Gas_` / `Water_` / `0001`
3. **Texto do relatório (célula A1)**:
   - “Daily report - …” ou “GAS BALANCE REPORT”

### 2.2 Extração de metadados (comum aos 4 arquivos)
Buscar no topo da planilha as chaves:
- `Date and time:` → `report_generated_at`
- `Field:` → `field_name`
- `Period:` → `period_text` (parsear `period_start` e `period_end`)

Exemplo observado:
- `Date and time:` = **2026-01-27 00:01:30**
- `Field:` = **Bacalhau Field, Santos Basin, Brazil**
- `Period:` = **26-Jan-2026 00:00 till 27-01-2026 00:00** (ou variações pequenas no formato)

**Regra de consistência:** os quatro arquivos do mesmo dia devem ter **o mesmo período** (início/fim). Divergência → gerar alerta.

---

## 3) Como extrair dados: “blocos” ancorados por texto

### 3.1 Blocos-alvo (âncoras)
Os dados relevantes estão organizados em blocos que começam com estes textos:
- **`Cumulative totals @ day close`** (acumulado)
- **`Day totals`** (totais do dia)
- **`Flow weighted averages`** (médias ponderadas por vazão)

Cada bloco representa uma **matriz**:
- Colunas = pontos de medição (TAGs como `20FT2303`, `20FT0244`, `44FT0203` etc.)
- Linhas = variáveis (ex.: `Gross volume`, `Standard volume`, `Pressure`, `Temperature`, etc.)
- Há sempre uma coluna de **unidade** (ex.: `m³`, `Sm³`, `kPa g`, `°C`, …).

### 3.2 Regras gerais de parsing de blocos (aplicável a Oil/Gas/Water)
**Para cada ocorrência** de uma âncora (texto do bloco), executar:

1. **Localizar a linha do bloco** (linha onde aparece a âncora).
2. **Localizar a linha de TAGs**: normalmente é a primeira linha após a âncora que contém múltiplos valores no padrão `NNFTNNNN` (com sufixo possível `A/B`).
3. **Localizar as colunas (TAG columns)**:
   - Para cada coluna onde existe TAG na linha de TAGs → esta coluna é uma “coluna de dados”.
4. **Ler as linhas de variáveis**:
   - A variável aparece (neste template) em geral na coluna **D** (ex.: “Gross volume”).
   - A unidade aparece em geral na coluna **E** (ex.: “m³”).
   - O valor para cada TAG está na coluna do TAG na mesma linha.
5. **Fim do bloco**:
   - Ao encontrar uma linha “vazia” (sem variável) ou a próxima âncora, encerrar.

### 3.3 Normalização do bloco (saída em formato “long/tidy”)
Cada célula numérica vira uma linha na tabela normalizada:

| report_date | file_type | block_type | section_name | tag | variable_raw | variable_code | unit | value | source_cell |
|---|---|---|---|---|---|---|---|---:|---|

- `block_type`: `CUMULATIVE`, `DAY`, `AVG`
- `section_name`: nome do grupo (ex.: “Sales Oil Fiscal Metering Skid”, “Test Separator - Gas Outlet”, etc.) — ver regra abaixo.
- `source_cell`: para rastreabilidade (ex.: “Oil_0001!F22”).

**Tratamento de valores especiais**
- `'-'` (hífen) → armazenar como `NULL` (sem valor).
- `None`/vazio → `NULL`.
- `0` → manter como **zero** (valor válido).

### 3.4 Como capturar “section_name” (contexto do bloco)
Nos arquivos Daily (Oil/Gas/Water) existe uma linha “título” acima dos blocos, contendo nomes de streams/linhas/skids (muitas vezes com quebra de linha).

Regra prática:
- Para cada coluna TAG, olhar **1 a 3 linhas acima** da âncora e capturar o texto na **mesma coluna**.
- Se existir, salvar como `section_name`.
- Se não existir, usar `UNKNOWN_SECTION` e registrar para ajuste posterior.

---

## 4) Especificação por arquivo

## 4.1 Daily Oil (`Daily_Oil_*.xlsx`)
### 4.1.1 Blocos observados
No modelo analisado, existem **2 conjuntos** completos de blocos (cada um com Cumulative/Day/Averages):

**Conjunto A — Fiscal metering skids**
- “Sales Oil Fiscal Metering Skid” (com “Run 1/Run 2/Run 3/Total”)
- “Flowline Circulation Fiscal Metering Skid” (coluna isolada)
- TAGs observadas (exemplos): `20FT2303`, `20FT2353`, `20FT2403`, `13FT1703`

**Conjunto B — Referências internas**
- “Test Separator - Oil Outlet”
- “Free Water Knockout Drum - Oil Outlet”
- TAGs observadas: `20FT0247`, `20FT0345A`, `20FT0345B`

### 4.1.2 Variáveis (observadas)
- `Gross volume` (m³)
- `Gross standard volume` (Sm³)
- `Net Standard volume` (Sm³)
- `Mass` (t)
- `Flow time` (min)
- `Pressure` (kPa g)
- `Temperature` (°C)
- `Line density` (kg/m³)
- `Standard density` (kg/Sm³)
- `K-Factor` (pls/m³)
- `Meter Factor` (—)
- `CTL` (—)
- `CPL` (—)
- `BS&W analyzer` (%vol)

### 4.1.3 Regras adicionais (Oil)
- Se existir “Run” no cabeçalho: salvar `run_id` = Run 1/2/3/Total quando aplicável (dimensão opcional).
- Quando o “Total” do bloco estiver `'-'`, não inventar valor; deixar `NULL` e, opcionalmente, calcular em camada analítica (derivado).

---

## 4.2 Daily Gas (`Daily_Gas_*.xlsx`)
### 4.2.1 Blocos observados
Existem **4 conjuntos** de blocos (Cumulative/Day/Averages), agrupando diferentes famílias de medição, por exemplo:
- Test Separator / HP Separator / FWKO / ET 1st Stage (TAGs: `20FT0244`, `20FT0116`, `20FT0347`, `20FT0517`)
- ET 2nd Stage / Injeção / Gas Lift (TAGs: `20FT0660`, `26FT1306`, `26FT1501`, `26FT1502`)
- Low Pressure Fuel Gas (TAGs: `45FT0627`, `45FT0555`, `45FT0640`, `45FT0360`)
- Flare / VRU / etc (TAGs: `43FT0102`, `43FT0227`, `43FT0134`, `43FT0256`)

### 4.2.2 Variáveis (observadas)
- `Gross volume` (m³)
- `Standard volume` (Sm³)
- `Mass` (t)  **(atenção: conferir coerência de unidade na origem)**
- `Energy` (GJ)
- `Heating value` (MJ/Sm³)
- `Flow time` (min)
- `Differential pressure` (kPa)
- `Pressure` (pode aparecer em `kPa g` e/ou `kPa a`, dependendo do bloco)
- `Temperature` (°C)
- `Standard density` (kg/Sm³)
- `Line density` (kg/m³)

### 4.2.3 Regras adicionais (Gas)
- `Pressure` pode vir duplicado com unidades diferentes (gauge/absolute). **Não sobrescrever**: armazenar separado por unidade (ou padronizar em `pressure_kpag` e `pressure_kpaa`).
- Regra de qualidade recomendada: se `Mass` estiver muito maior do que plausível para `t` (ex.: magnitude típica de kg), levantar *flag* “suspeita de unidade”.

---

## 4.3 Daily Water (`Daily_Water_*.xlsx`)
### 4.3.1 Blocos observados
Um conjunto principal com:
- “Produced Water - Test Separator”
- “Produced Water - Free Water Knockout Drum” (A/B)
- “Water to Overboard”, “Sea Water - Injection”, etc.

TAGs observadas: `20FT0251`, `20FT0346A`, `20FT0346B`, `20FT0613`, `20FT0763`, `44FT0203`, `29FT0102`

### 4.3.2 Variáveis (observadas)
- `Gross volume` (m³)
- `Gross standard volume` (Sm³)
- `Flow time` (min) *(aparece no acumulado)*
- `Pressure` (kPa g)
- `Temperature` (°C)
- `M Factor` (—)
- `K Factor` (pls/m³)

### 4.3.3 Regras adicionais (Water)
- Existem médias ponderadas (`Flow weighted averages`) relevantes para diagnóstico: armazenar como `AVG`.
- `Flow time` pode não aparecer no bloco “Day totals” dependendo do template; não forçar.

---

## 4.4 Gas Balance (`GasBalance_*.xlsx`)
### 4.4.1 Estrutura do balanço
O relatório possui uma tabela chamada **“Gas balance”** com colunas (observadas):
- Sinal: `+` (entrada) / `-` (saída)
- Descrição (ex.: “HP Separator - Gas Outlet”, “HP Flare Gas”…)
- Unidade de vazão: `Sm³/h`
- **Flow rate basis** (valor numérico)
- **PD basis** (valor numérico)
- Unidade PD (ex.: `Sm³`)

Há uma linha final “Total” (sem sinal), com a soma algébrica.

### 4.4.2 Normalização (tabela própria)
Tabela sugerida: `fact_gas_balance_line`:

| report_date | period_start | period_end | line_sign | line_desc | flowrate_unit | flowrate_value | pd_unit | pd_value |
|---|---|---|---|---|---|---:|---|---:|

**Regras:**
- `line_sign` ∈ {'+','-','TOTAL'}.
- Validar se `TOTAL.pd_value` ≈ soma(`+`) – soma(`-`) (tolerância configurável).
- Se existir linha com `flowrate_value = 0` mas `pd_value > 0`, levantar *flag* (possível problema de fonte/refresco/tag).

---

## 5) Base única: modelo de dados (mínimo viável)

### 5.1 Tabelas (MVP)
1. `dim_report`
   - `report_id` (PK)
   - `report_date` (data de referência do “dia”)
   - `period_start`, `period_end`
   - `report_generated_at`
   - `field_name`
   - `source_file_name`, `source_file_hash` (hash para rastreabilidade)

2. `dim_tag`
   - `tag_id` (PK interno)
   - `tag_name` (ex.: `20FT0244`)
   - `fluid` (OIL/GAS/WATER) *(derivado do arquivo/bloco)*
   - `description` *(opcional, preencher depois)*

3. `fact_daily_kpi` (formato longo, unifica Oil/Gas/Water)
   - `report_id` (FK)
   - `file_type` (DAILY_OIL/DAILY_GAS/DAILY_WATER)
   - `block_type` (CUMULATIVE/DAY/AVG)
   - `section_name`
   - `tag_id` (FK)
   - `variable_code` (padronizado)
   - `variable_raw` (texto original)
   - `unit`
   - `value` (numérico)
   - `source_sheet`, `source_cell`

4. `fact_gas_balance_line`
   - conforme item 4.4.2

### 5.2 `variable_code` (padronização)
Mapa mínimo recomendado (exemplos):
- `gross_volume_m3`
- `gross_standard_volume_sm3`
- `standard_volume_sm3`
- `net_standard_volume_sm3`
- `mass_t`
- `energy_gj`
- `heating_value_mj_sm3`
- `flow_time_min`
- `pressure_kpag`
- `pressure_kpaa`
- `temperature_c`
- `dp_kpa`
- `std_density_kg_sm3`
- `line_density_kg_m3`
- `k_factor_pls_m3`
- `m_factor`
- `ctl`
- `cpl`
- `meter_factor`
- `bsw_pctvol`

---

## 6) Passo a passo operacional (pipeline diário)

### 6.1 Ingestão (entrada)
1. Receber os 4 arquivos do mesmo período.
2. Calcular `hash` (SHA-256) de cada arquivo e registrar.
3. Validar:
   - Arquivo abre
   - Aba esperada existe
   - Metadados `Field/Period/Date and time` existem

### 6.2 Extração (parsing)
1. Extrair metadados → inserir/atualizar `dim_report`.
2. Para Daily Oil/Gas/Water:
   - varrer planilha e localizar **todas** as ocorrências das âncoras:
     - `Cumulative totals @ day close`
     - `Day totals`
     - `Flow weighted averages`
   - para cada ocorrência:
     - identificar linha de TAGs
     - identificar colunas das TAGs
     - ler linhas (variável/unidade/valores)
     - gerar linhas normalizadas para `fact_daily_kpi`
3. Para Gas Balance:
   - localizar tabela “Gas balance”
   - ler linhas até “Total”
   - gerar linhas para `fact_gas_balance_line`

### 6.3 Normalização e carga (load)
1. Resolver/registrar `dim_tag` para toda TAG encontrada (upsert por `tag_name`).
2. Upsert em `fact_daily_kpi` e `fact_gas_balance_line` usando chaves naturais:
   - (`report_id`, `file_type`, `block_type`, `section_name`, `tag_id`, `variable_code`)  
   - para GasBalance: (`report_id`, `line_sign`, `line_desc`)

### 6.4 Qualidade (validações automáticas)
- Consistência de período entre os 4 arquivos.
- Unidades esperadas por variável (ex.: volume Sm³ vs m³).
- Soma de Runs vs Total (quando existir).
- GasBalance: total vs soma algébrica.
- Flags:
  - `flowrate=0` e `pd>0` em linhas relevantes.
  - suspeita de unidade em `Mass` (gás).

### 6.5 Saídas de consumo
- **Visões** (views) por dia e por TAG:
  - “Totais do dia” (DAY)
  - “Acumulado” (CUMULATIVE)
  - “Médias ponderadas” (AVG)
- API/Export para:
  - dashboards
  - regras de alarme (10 dias fora de limite)
  - geração/validação de XML ANP (módulo separado)

---

## 7) Critérios de aceite (Definition of Done)
1. O pipeline lê os 4 arquivos (Oil/Gas/Water/GasBalance) sem ajuste manual.
2. Para um dia, a base única contém:
   - metadados do período,
   - todas as TAGs encontradas,
   - todas as variáveis dos blocos (DAY/CUMULATIVE/AVG),
   - todas as linhas do GasBalance.
3. Execução repetida no mesmo conjunto de arquivos não duplica dados (*idempotência*).
4. Validações geram relatório (OK/WARN/FAIL) por arquivo e por regra.

---

## 8) Observações relevantes do modelo analisado (para guiar o desenvolvimento)
- Os relatórios têm **múltiplos conjuntos** de blocos (principalmente em Gás).
- Em alguns blocos, a variável `Pressure` aparece com unidades diferentes (`kPa g` e `kPa a`).
- Em alguns pontos, o “Total” aparece como `'-'` ao invés de número (tratar como `NULL`).
- A extração deve ser **anchor-based**, e não baseada em número fixo de linha.
