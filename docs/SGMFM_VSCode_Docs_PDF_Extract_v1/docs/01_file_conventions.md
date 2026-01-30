# 01 — Convenções de arquivo (PDF)

## 1) Identificação por nome
### MPFM Daily
Padrão: `B{bank:02d}_MPFM_Daily-{YYYYMMDD}-{HHMMSS}+0000.pdf`

- `bank` vem do prefixo `B03`, `B05`, etc.
- A janela de dados está escrita no cabeçalho do PDF:
  - `Daily Report from 2026.01.26 00:00 to 2026.01.27 00:00`
- O timestamp `HHMMSS` no filename costuma ser o horário de geração/export do relatório.

### MPFM Hourly
Padrão: `B{bank:02d}_MPFM_Hourly-{YYYYMMDD}-{HHMMSS}+0000.pdf`

- A janela no cabeçalho:
  - `Hourly Report from 2026.01.01 00:00 to 2026.01.01 01:00`

### PVTCalibration (Separador de teste)
Padrão: `PVTCalibration_Bank{bank:02d}_Stream{stream:02d}_{calibration_no}-{YYYYMMDD}-{HHMMSS}+0000.pdf`

- Importante:
  - `calibration_no` (ex.: 211) é o identificador do evento de calibração.
  - O arquivo contém campos de **MPFM** e **Separator** (separador de teste).

## 2) Regras de completude (por ponto e por dia)
- Para cada `asset_tag` (ex.: 13FT0367):
  - 1 arquivo Daily no dia D (janela D00:00→D+1 00:00)
  - 24 arquivos Hourly cobrindo as 24 horas de D00:00→D+1 00:00

### Estratégia de apuração de completude
- Derivar `period_start` e `period_end` pelo texto do PDF (não apenas pelo filename).
- Normalizar o dia como `business_date = date(period_start)`.
- Contar `distinct hour(period_start)` para Hourly.
- Validar:
  - `count_hourly == 24` (caso contrário: `quality_flag = missing_hourly`)
  - `exists_daily == true` (caso contrário: `quality_flag = missing_daily`)

## 3) Múltiplos pontos no mesmo PDF
Um mesmo PDF Daily/Hourly pode trazer **mais de um ponto** (seções repetidas):
- Ex.: `Riser P5 - 13FT0367` e `Riser P6 - 13FT0417` no mesmo arquivo.
- Portanto, o parser deve:
  1) detectar o cabeçalho de cada seção (ponto)
  2) extrair as tabelas dentro da seção
  3) gerar 1 registro por (arquivo, seção/ponto)

## 4) Integração com Asset Registry (cadastro mestre)
- Usar `asset_tag` + (bank/stream quando disponível) para resolver `asset_id`, tipo e metadados.
- Se o arquivo “B03” trouxer TAG que no cadastro não pertence ao Bank 03, sinalizar:
  - `quality_flag = registry_mismatch`
