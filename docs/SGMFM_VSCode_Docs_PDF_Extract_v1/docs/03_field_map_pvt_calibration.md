# 03 — Mapa de campos (PVTCalibration — referência do separador)

O PDF `PVTCalibration_...pdf` é a fonte auditável para:
- condições médias (P/T/densidades) **MPFM vs Separator**
- composição do poço (Used vs Calculated)
- massas acumuladas durante a calibração (MPFM vs Separator)
- fatores de correção (Used/New)
- densidades PVT em condição do medidor e em condição de referência (Sm³ / kg/Sm³)

---

## A) Metadados do relatório (nível arquivo)
Extrair:
- `calibration_no` (ex.: 211)
- `selected_mpfm` (ex.: `N1 - 13FT0367`)
- `selected_asset_tag` (ex.: `13FT0367`)
- `calibration_started_at` (datetime)
- `calibration_ended_at` (datetime)
- `status` (ex.: `Completed - Passive`)
- `bank`, `stream` (do filename)
- `source_file_name`, `source_file_hash`

---

## B) Seção “Average Values” (MPFM vs Separator) — OBRIGATÓRIO
Campos e unidades (sempre extrair as duas colunas):
- `Pressure [kPa]`
- `Temperature [°C]`
- `Density - oil [kg/m³]`
- `Density - gas [kg/m³]`
- `Density - water [kg/m³]`

Campos canônicos (exemplos):
- `avg_pressure_kpa_mpfm`, `avg_pressure_kpa_separator`
- `avg_temperature_c_mpfm`, `avg_temperature_c_separator`
- `avg_density_oil_kg_m3_mpfm`, `avg_density_oil_kg_m3_separator`
- `avg_density_gas_kg_m3_mpfm`, `avg_density_gas_kg_m3_separator`
- `avg_density_water_kg_m3_mpfm`, `avg_density_water_kg_m3_separator`

---

## C) Seção “Well Composition” (Used vs Calculated) — OBRIGATÓRIO
Extrair todos os componentes apresentados, com unidades:

### C.1 Frações molares (mol%)
- `Nitrogen N2`
- `Carbon dioxide CO2`
- `Methane C1`
- `Ethane C2`
- `Propane C3`
- `I-butane iC4`
- `N-butane nC4`
- `I-pentane iC5`
- `N-pentane nC5`
- `N-hexane nC6`
- `Heptane C7`
- `Octane C8`
- `Nonane C9`
- `Decane plus C10+`

### C.2 Propriedades “pseudo-componentes”
- `C7 weight [g/mol]`
- `C8 weight [g/mol]`
- `C9 weight [g/mol]`
- `C10+ weight [g/mol]`
- `C7 density [kg/Sm³]`
- `C8 density [kg/Sm³]`
- `C9 density [kg/Sm³]`
- `C10+ density [kg/Sm³]`
- `Peneloux gas [-]`
- `Peneloux oil [-]`

Campos canônicos (recomendação):
- `comp_used_mol_pct_c1`, `comp_calc_mol_pct_c1` (e assim por diante)
- `c7_weight_g_mol_used`, `c7_weight_g_mol_calc`
- idem para densidades e peneloux.

---

## D) Página 2 — “Accumulated mass during calibration” — OBRIGATÓRIO
Extrair MPFM vs Separator (unidade t):
- `Oil`, `Gas`, `Water`, `HC`

Campos canônicos:
- `acc_mass_oil_t_mpfm`, `acc_mass_oil_t_separator`
- `acc_mass_gas_t_mpfm`, `acc_mass_gas_t_separator`
- `acc_mass_water_t_mpfm`, `acc_mass_water_t_separator`
- `acc_mass_hc_t_mpfm`, `acc_mass_hc_t_separator`

---

## E) Página 2 — “Mass Correction Factors” — OBRIGATÓRIO
Extrair `Used` e `New` (adimensionais):
- `Oil`, `Gas`, `Water`, `HC`

Campos canônicos:
- `cf_used_oil`, `cf_new_oil`
- `cf_used_gas`, `cf_new_gas`
- `cf_used_water`, `cf_new_water`
- `cf_used_hc`, `cf_new_hc`

Regra de qualidade (importante):
- Persistir sempre `cf_new_water`, mas bloquear uso automático (depende do procedimento interno).

---

## F) Página 2 — “PVT Calculated Densities at Meter Conditions” — OBRIGATÓRIO
Extrair MPFM vs Separator (kg/m³):
- `Oil`, `Gas`, `Water`

Campos canônicos:
- `pvt_rho_meter_oil_kg_m3_mpfm`, `..._separator`
- `pvt_rho_meter_gas_kg_m3_mpfm`, `..._separator`
- `pvt_rho_meter_water_kg_m3_mpfm`, `..._separator`

---

## G) Página 2 — “PVT-calculated values at reference conditions” — OBRIGATÓRIO
Extrair (Sm³ e kg/Sm³):
- `Volume - Oil [Sm³]`
- `Volume - Gas [Sm³]`
- `Volume - Water [Sm³]`
- `Density - Oil [kg/Sm³]`
- `Density - Gas [kg/Sm³]`
- `Density - Water [kg/Sm³]`

Campos canônicos:
- `pvt_ref_vol_oil_sm3`, `pvt_ref_vol_gas_sm3`, `pvt_ref_vol_water_sm3`
- `pvt_ref_rho_oil_kg_sm3`, `pvt_ref_rho_gas_kg_sm3`, `pvt_ref_rho_water_kg_sm3`

---

## H) Saída do parser (contrato mínimo)
Um registro por arquivo de calibração contendo:
- metadados (A)
- average values (B)
- composição (C)
- massas acumuladas (D)
- fatores used/new (E)
- densidades meter (F)
- volumes/densidades em referência (G)
- flags de qualidade e warnings

