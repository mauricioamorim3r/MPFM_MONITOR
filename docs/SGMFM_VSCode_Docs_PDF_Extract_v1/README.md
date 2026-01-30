# SGM‑FM Bacalhau — Especificação de Extração de Dados (PDFs MPFM + PVT Calibration)

Este pacote contém **documentos de referência** para orientar o desenvolvimento (VS Code) do módulo de ingestão/parsing
dos relatórios **MPFM Daily**, **MPFM Hourly** e **PVTCalibration** (calibração / separador de teste).

> Objetivo: extrair **todos os campos obrigatórios** (independente do TAG / Topside / Subsea / Separador),
normalizar e gravar em uma **base única** (banco) para viabilizar:
- monitoramento diário (Topside↔Subsea, Subsea↔Separador, Topside↔Separador)
- checagens de completude (1 Daily + 24 Hourly por ponto/dia)
- reconciliação: **Σ(24 Horly) = Daily** (por métrica e por fase)
- calibração: uso de **PVTCalibration** como referência do separador e registro de fatores (Used/New)

## Tipos de arquivos suportados (por nome)
1. `B##_MPFM_Daily-YYYYMMDD-HHMMSS+0000.pdf`
2. `B##_MPFM_Hourly-YYYYMMDD-HHMMSS+0000.pdf`
3. `PVTCalibration_Bank##_Stream##_CALNO-YYYYMMDD-HHMMSS+0000.pdf`

### Regras operacionais (obrigatórias)
- Para cada **ponto/medidor** por dia:
  - Esperar **1 Daily** (nome contém `MPFM_Daily`)
  - Esperar **24 Hourly** (nome contém `MPFM_Hourly`)
- A soma das 24 horas deve “fechar” com o Daily do mesmo dia/ponto:
  - checar por fase: Gas / Oil / HC / Water / Total
  - checar por métrica: uncorrected mass, corrected mass, PVT reference mass/volume (+ @20°C)

## Como usar este pacote no repositório (sugestão)
- Copiar a pasta `docs/` para `./docs/ingestion/pdf/`
- Implementar o parser com base nos contratos e validações descritos aqui.
- Versionar este pacote junto ao código (e atualizar quando o layout do PDF mudar).

Arquivos:
- `docs/01_file_conventions.md` — convenções de nome, identificação, janela de tempo
- `docs/02_field_map_mpfm_daily_hourly.md` — mapa completo de campos (Daily/Hourly)
- `docs/03_field_map_pvt_calibration.md` — mapa completo de campos (PVTCalibration)
- `docs/04_db_schema_recommended.md` — schema recomendado (tabelas fact/dim)
- `docs/05_validation_rules.md` — regras de validação + flags de qualidade
- `parser_config_example.yaml` — exemplo de config (regex + campos) para parser “config-driven”
