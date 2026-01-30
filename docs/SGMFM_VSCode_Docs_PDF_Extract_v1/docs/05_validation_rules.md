# 05 — Regras de validação (qualidade)

## 1) Completude por dia e ponto
Para cada (asset_id, business_date):
- Esperar 24 registros Hourly
- Esperar 1 registro Daily

Flags:
- `missing_hourly` (faltam horas)
- `missing_daily` (não há diário)
- `duplicate_hour` (duas horas iguais)
- `hour_gap` (janela com buraco)

## 2) Reconciliação Σ(24 hourly) = daily
Para cada métrica numérica comparável:

Comparar:
- Σ hourly `mpfm_uncorrected_mass_*`
- Σ hourly `mpfm_corrected_mass_*`
- Σ hourly `pvt_ref_mass_*` e `pvt_ref_volume_*`
- Σ hourly `pvt_ref_mass_20c_*` e `pvt_ref_volume_20c_*`

Contra o Daily correspondente.

Tolerâncias:
- parametrizar por métrica (ex.: `abs_tol_t`, `pct_tol`)
- recomendação inicial:
  - mass: abs 0.5 t OU 0.05% (o maior)
  - volume: abs 1 Sm³ OU 0.05%

Status:
- PASS (dentro)
- WARN (levemente fora)
- FAIL (fora e exige ação)

## 3) Consistência interna por registro (sanity checks)
- Total ≈ HC + Water (quando Total existir)
- HC ≈ Oil + Gas (quando HC existir)
- valores negativos → FAIL
- `-` no PDF → NULL (não zerar)

## 4) Validações específicas de calibração (PVTCalibration)
- `calibration_ended_at` >= `calibration_started_at`
- fatores `Used` e `New`:
  - não negativos
  - se `New` muito distante de 1.0 (ex.: > 1.2 ou < 0.8) → WARN/FAIL conforme regra
- `cf_new_water` deve ser persistido, mas **não aplicado automaticamente** (regra interna)

## 5) Validação com Asset Registry
- bank do arquivo deve bater com bank_expected do asset_tag (quando disponível)
Flag:
- `registry_mismatch`

## 6) Rastreamento e auditoria
Cada valor extraído deve ser rastreável até:
- arquivo (file_id)
- período (period_start/end)
- asset_tag
- versão do parser
