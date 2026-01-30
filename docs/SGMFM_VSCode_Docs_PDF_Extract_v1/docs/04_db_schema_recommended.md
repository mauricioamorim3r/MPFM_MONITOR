# 04 — Schema recomendado (base única)

A ideia é manter dados **normalizados e auditáveis**:
- 1 linha por (asset, janela de tempo, granularidade)
- metadados de origem (arquivo, hash, página, seção) para rastreabilidade

## 1) Dimensões
### dim_asset_registry (seed + versionado)
Campos mínimos:
- asset_id (PK)
- asset_tag (ex.: 13FT0367)
- asset_label (ex.: Riser P5, PE_4)
- asset_type (MPFM_TOPSIDE, MPFM_SUBSEA, SUPPORT_METER, etc.)
- bank_expected, stream_expected (quando aplicável)
- cabinet = 13JC100, computer_type = FPM207, supervisory = FCS320
- effective_from, effective_to, registry_version

### dim_file
- file_id (PK)
- file_name
- file_hash_sha256
- ingested_at
- source_path (opcional)
- parser_version

## 2) Fatos
### fact_mpfm_production (Daily/Hourly)
Chave:
- fact_id (PK)
- asset_id (FK)
- file_id (FK)
- report_type (DAILY|HOURLY)
- period_start, period_end
- business_date
- bank

Campos (todos obrigatórios, aceitar NULL quando PDF traz '-'):
- uncorrected_mass_* (gas/oil/hc/water/total) [t]
- corrected_mass_* (gas/oil/hc/water/total) [t]
- pvt_ref_mass_* (gas/oil/water) [t]
- pvt_ref_volume_* (gas/oil/water) [Sm3]
- pvt_ref_mass_20c_* (gas/oil/water) [t]
- pvt_ref_volume_20c_* (gas/oil/water) [Sm3]
- meter_pressure_barg
- meter_temperature_c
- gas_density_kg_m3
- oil_density_kg_m3
- water_density_kg_m3

Qualidade/auditoria:
- quality_flags (json array)
- parse_warnings (json array)
- extracted_at

### fact_pvt_calibration
Chave:
- cal_id (PK)
- asset_id (FK)
- file_id (FK)
- calibration_no
- calibration_started_at, calibration_ended_at
- status
- bank, stream

Campos:
- average values (MPFM vs Separator)
- composição (Used vs Calculated)
- accumulated mass (MPFM vs Separator)
- mass correction factors (Used/New)
- densidades PVT em condição do medidor (MPFM vs Separator)
- volumes/densidades em condição de referência

Qualidade/auditoria:
- quality_flags, parse_warnings, extracted_at

## 3) Derivadas (validação)
### fact_reconciliation_daily
- asset_id
- business_date
- metric_name (ex.: corrected_mass_oil_t)
- daily_value
- sum_hourly_value
- diff_abs, diff_pct
- tolerance_abs, tolerance_pct
- status (PASS|WARN|FAIL)
