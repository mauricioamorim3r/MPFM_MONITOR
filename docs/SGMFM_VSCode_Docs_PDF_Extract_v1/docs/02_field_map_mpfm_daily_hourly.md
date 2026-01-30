# 02 — Mapa de campos (MPFM Daily / MPFM Hourly)

Este documento descreve **TODOS os campos obrigatórios** a serem extraídos dos PDFs:

- `*_MPFM_Daily*.pdf`  → seção “Production Previous Day” + “Flow Weighted Averages Previous Day”
- `*_MPFM_Hourly*.pdf` → seção “Production Previous Hour” + “Flow Weighted Averages Previous Hour”

> Observação: o layout é equivalente para **Topside** e **Subsea**. O que muda é o cabeçalho geral e os pontos listados.

---

## A) Metadados do relatório (nível arquivo)
Extrair 1 vez por arquivo:

- `report_type`: `"DAILY"` ou `"HOURLY"`
- `location_scope`: `"Topside MPFM"` ou `"Subsea MPFM"` (do cabeçalho do PDF)
- `period_start`: datetime (do texto `... from YYYY.MM.DD HH:MM to ...`)
- `period_end`: datetime
- `report_generated_at`: datetime (timestamp isolado no topo, geralmente igual ao fim)

Derivações:
- `business_date = date(period_start)`
- `bank = int(filename[1:3])` (B03→3)
- `source_file_name`, `source_file_hash` (SHA-256 recomendado)

---

## B) Seções por ponto (nível “asset” dentro do PDF)

### B.1 Como detectar o início de uma seção
O início é identificado por uma linha no padrão:

- **Topside**: `Riser P5 - 13FT0367`
- **Subsea**: `PE_EO4 - 18FT1806`

Extrair:
- `asset_label_raw` (ex.: `Riser P5`, `PE_EO4`)
- `asset_tag` (ex.: `13FT0367`, `18FT1806`)

Recomendação:
- resolver `asset_id`, `asset_type`, `bank_expected`, `stream_expected` via Asset Registry.

---

## C) Bloco “Production Previous Day/Hour” (OBRIGATÓRIO)

### C.1 Estrutura (colunas)
Colunas fixas (sempre extrair, mesmo que zero / "-"):
- `Gas`, `Oil`, `HC`, `Water`, `Total`

### C.2 Linhas (métricas) — nomes exatos
Linhas obrigatórias a extrair:

- `MPFM uncorrected mass`
- `MPFM corrected mass`
- `PVT reference mass`
- `PVT reference volume`
- `PVT reference mass @20 degC`
- `PVT reference volume @20 degC`

> Notas:
- `PVT reference mass` e `PVT reference volume` normalmente trazem **Gas/Oil/Water** e deixam `HC`/`Total` como `-` (tratar como NULL).
- `@20 degC` é uma **variação explícita** no PDF; extrair separadamente (não sobrescrever o campo “base”).

### C.3 Campos canônicos (recomendação de nomes no banco)
Para cada linha acima, gerar os campos por fase:

Exemplo para `MPFM corrected mass` (unidade t):
- `mpfm_corrected_mass_gas_t`
- `mpfm_corrected_mass_oil_t`
- `mpfm_corrected_mass_hc_t`
- `mpfm_corrected_mass_water_t`
- `mpfm_corrected_mass_total_t`

Para `PVT reference volume` (unidade Sm³):
- `pvt_ref_volume_gas_sm3`
- `pvt_ref_volume_oil_sm3`
- `pvt_ref_volume_water_sm3`
- (HC/Total geralmente NULL)

E equivalentes para:
- `uncorrected_mass_*`
- `pvt_ref_mass_*`
- `pvt_ref_mass_20c_*`
- `pvt_ref_volume_20c_*`

### C.4 Tratamento de valores especiais
- `-` → NULL (não é zero)
- `0` ou `0.000` → zero válido
- números com `.` (ponto) → decimal padrão
- se aparecer `,` (vírgula), normalizar para `.` antes de converter (suporte a ambos)

---

## D) Bloco “Flow Weighted Averages Previous Day/Hour” (OBRIGATÓRIO)

### D.1 Estrutura (colunas)
Colunas no PDF:
- `Gas`, `Oil`, `Meter`, `Water`

### D.2 Linhas
Linhas obrigatórias a extrair:
- `Pressure`   unidade `[barg]` (valor normalmente na coluna `Meter`)
- `Temperature` unidade `[°C]` (valor normalmente na coluna `Meter`)
- `Density`    unidade `[kg/m³]` (valores normalmente nas colunas Gas/Oil/Water)

### D.3 Campos canônicos (recomendação)
- `meter_pressure_barg`
- `meter_temperature_c`
- `gas_density_kg_m3`
- `oil_density_kg_m3`
- `water_density_kg_m3`

> Observação: `Density` na coluna `Meter` costuma vir como `-` (não usar).

---

## E) Saída do parser (contrato mínimo por registro)
Para cada (arquivo, seção/ponto) gerar um registro com:

- Metadados: `report_type, period_start, period_end, report_generated_at, bank, source_file_*`
- Identificação do ponto: `asset_tag, asset_label_raw, asset_id (se resolvido)`
- Produção: todas as métricas do bloco C
- Médias ponderadas: bloco D completo
- Qualidade: `quality_flags[]`, `parse_warnings[]`

---

## F) Casos de teste obrigatórios
1. Arquivo com **dois pontos** no mesmo PDF (ex.: Riser P5 e P6)
2. Ponto com todos os valores **zero**
3. Ponto com `-` em HC/Total no PVT reference
4. Arquivo com layout Topside e arquivo com layout Subsea
