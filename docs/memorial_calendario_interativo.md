# Memorial Descritivo / PRD — Calendário Interativo (edição por dia)

## 1) Contexto (estado atual do repositório)

Hoje a UI do produto é um painel Streamlit (ver [src/sgmfm/ui/app_streamlit.py](../src/sgmfm/ui/app_streamlit.py)) com ações principais:

- Importação de evidências (PDF/Excel) → grava `DailyMeasurement`, `CalibrationEvent` e `EvidenceFile`.
- Reprocessamento de KPIs (Topside vs Subsea) → grava/atualiza `ComparisonResult` e abre `Case` quando necessário.
- Encerramento de cases → atualiza `Case` e registra `AuditLog`.
- Geração de relatório diário (PDF) → exporta um resumo dos últimos resultados.

**Importante (transparência):** nesta versão do código, **não existe ainda** uma tela de “calendário interativo” para navegar/editar medições por dia. Este documento descreve **a funcionalidade proposta** (V2) e **como ela deve ser implementada** de forma consistente com os modelos/serviços existentes.

## 2) Visão do recurso

Adicionar um **calendário mensal interativo** para:

1) Visualizar rapidamente quais dias possuem medições importadas.
2) Indicar status do dia (ex.: OK/ALERT baseado no KPI disponível).
3) Ao clicar em um dia, abrir um painel de **edição de dados do dia** (correções, observações e justificativa), com rastreabilidade via `AuditLog`.

### Objetivo

Reduzir o retrabalho de localizar registros em tabelas e permitir ajustes operacionais/auditáveis (ex.: correções manuais ou “observações de operação”) por dia.

### Fora de escopo (primeira entrega do calendário)

- Integrações online (PI/OPC).
- Cálculo termodinâmico avançado PVT (além do que já é importado).
- Workflows completos de etapa 1/2 no próprio calendário (pode virar V3).

## 3) Personas e necessidades

- **Eng. de medição/automação (usuário único/offline):**
  - Precisa navegar por data rapidamente.
  - Precisa justificar correções e manter trilha de auditoria.
  - Precisa recalcular KPIs após ajustes e gerar relatório.

## 4) User Stories (com critérios de aceite)

### US-01 — Visualizar calendário mensal

**Como** operador,
**quero** escolher um mês e ver um calendário com os dias,
**para** saber rapidamente quais dias têm medições e se há alerta.

Aceite:

- Seleciono mês/ano.
- Cada dia mostra:
  - “sem dados” quando não existe `DailyMeasurement`.
  - “com dados” quando existe.
  - “ALERT/OK” quando existir `ComparisonResult` do dia (para o par comparativo escolhido).

### US-02 — Abrir detalhe do dia ao clicar

**Como** operador,
**quero** clicar em um dia,
**para** abrir um painel com as medições daquele dia (por ativo) e seus metadados.

Aceite:

- Ao clicar, lista:
  - ativo (`Asset`), período (`period_start`/`period_end`), principais massas (corr/uncorr), e evidência (`EvidenceFile.original_filename`).

### US-03 — Editar dados do dia com auditoria

**Como** operador,
**quero** editar campos (ex.: massas corrigidas, densidades, observações)
**para** corrigir inconsistências operacionais, mantendo rastreabilidade.

Aceite:

- Edição exige **motivo/justificativa**.
- Cada salvar gera `AuditLog` com:
  - `action = 'edit_daily_measurement'` (ou equivalente)
  - `entity_type = 'DailyMeasurement'`
  - `payload_json` contendo antes/depois e justificativa.

### US-04 — Recalcular KPIs após edições

**Como** operador,
**quero** recalcular KPIs após uma alteração,
**para** ver impacto nos alertas e nos dias consecutivos.

Aceite:

- Botão “Recalcular KPIs” no painel do dia ou global.
- KPI exibido no painel do dia atualiza após o recálculo.

## 5) UX / Fluxo de interação (Streamlit)

### 5.1 Navegação

- Sidebar:
  - seletor de comparativo (ex.: `top_vs_sub`)
  - seletor de ativo (ou “todos”)
  - seletor de mês/ano

### 5.2 Componente de calendário

Como Streamlit não tem um “calendar grid” nativo, a implementação recomendada para manter **offline + simples** é:

- Renderizar uma grade (7 colunas) com `st.columns(7)`.
- Cada célula (dia) vira um `st.button`:
  - rótulo: número do dia
  - estilo/ícone textual: `OK`, `ALERT`, `—` (sem dados)
- O clique grava em `st.session_state['selected_date']`.

Alternativa (opcional) se aceitarmos dependência extra:

- usar um componente de calendário/AgGrid. Neste caso, manter a lógica de seleção e edição igual.

### 5.3 Painel “Detalhe do dia”

Ao selecionar uma data:

- Mostrar KPIs do dia (se existirem) e o status.
- Mostrar lista de medições (`DailyMeasurement`) por `asset_id`.
- Formulário de edição (por ativo) com campos numéricos e observação.

## 6) Modelo de dados (proposta)

### 6.1 Opção A (mais rápida): editar direto em `DailyMeasurement`

- Atualizar os campos no próprio registro.
- Registrar antes/depois em `AuditLog`.

Prós: simples, sem migração extra.
Contras: perde a distinção “importado vs ajustado” (a trilha fica apenas no audit).

### 6.2 Opção B (recomendada): manter importado imutável e gravar overrides

Criar tabela nova (exemplo): `daily_measurement_overrides`:

- `id`, `daily_measurement_id`, `field_name`, `old_value`, `new_value`, `reason`, `user`, `created_at`

E uma camada de leitura “effective value”:

- Para UI e KPI, usar `override` quando existir, senão o valor original.

Prós: rastreabilidade forte e reversão fácil.
Contras: exige migração e adaptação em KPI.

## 7) Serviços e responsabilidades (proposta de implementação)

### 7.1 Novo serviço: `DailyMeasurementService`

Arquivo sugerido: `src/sgmfm/services/daily_measurement_service.py`
Responsabilidades:

- `list_days_with_data(month, year, asset_type|asset_id)` → retorna mapa de dias com flags (tem DM / tem KPI / status).
- `get_day_details(date, asset_id|asset_type)` → retorna medições + evidências.
- `update_daily_measurement(dm_id, patch, reason, user)` → valida, salva, registra `AuditLog`.

### 7.2 Integração com KPI

O `recompute_daily_kpis()` (ver [src/sgmfm/services/kpi_service.py](../src/sgmfm/services/kpi_service.py)) hoje:

- Busca medições por ativo.
- “Casa” por `period_start.date()`.
- Calcula percentuais e status.

Para suportar overrides (Opção B), a camada de leitura do valor deve ser ajustada para usar:

- “valor efetivo” (override > original) para os campos usados no KPI.

## 8) Regras de validação (mínimas)

- Campos numéricos não podem ser NaN.
- Para massas: não permitir negativos (salvo casos justificados; se permitido, exigir motivo explícito).
- `period_start/period_end` não editáveis no MVP (para evitar “quebrar” o casamento por dia).
- Toda edição exige `reason`.

## 9) Auditoria e rastreabilidade

- Toda edição deve gerar `AuditLog` com JSON estruturado:
  - data selecionada
  - ativo
  - campos alterados (antes/depois)
  - evidência/arquivo de origem (se aplicável)
  - usuário
  - justificativa

Isso mantém consistência com o padrão já usado por importação e cases.

## 10) Critérios de aceite (teste manual)

- Com DB populado por `sample_data/`:
  - abrir UI e escolher mês
  - ver dias com e sem medição
  - clicar em um dia com medição → ver detalhes
  - editar um campo e salvar com motivo
  - confirmar que:
    - DB reflete alteração (ou override)
    - `AuditLog` recebeu nova entrada
  - recalcular KPI e ver status atualizado

## 11) Riscos e decisões

- **Clique em dia no Streamlit**: não há evento de “click em célula” nativo; usar botões/grade é o caminho mais robusto sem JS.
- **Reprocessamento de dias consecutivos**: alterações em um dia podem mudar sequência; recálculo deve recalcular a série inteira do par/ativo.


---

## Resumo das funções (o que existe hoje)

## UI (Streamlit)

- Painel principal e ações em [src/sgmfm/ui/app_streamlit.py](../src/sgmfm/ui/app_streamlit.py):
  - Importar arquivos (uploader + gravação em `data/incoming`).
  - Chamar `import_path()` para importar para o banco.
  - Botão para `recompute_daily_kpis()`.
  - Listagens (Assets, DailyMeasurement, ComparisonResult, CalibrationEvent, Cases).
  - Encerrar case via `CaseService.close_case()`.
  - Gerar PDF via `generate_daily_report_pdf()`.

## Importação

- `import_path(session, cfg, path)` em [src/sgmfm/services/import_service.py](../src/sgmfm/services/import_service.py)
  - Itera arquivos e delega para `import_file()`.
- `import_file(session, cfg, path)`
  - Detecta parser.
  - Armazena evidência (`EvidenceFile`) no vault.
  - Cria `DailyMeasurement` (Daily PDF) e `CalibrationEvent` (PVT Calibration PDF).
  - Registra `AuditLog` por item importado.

## KPI / Comparação

- `recompute_daily_kpis(...)` em [src/sgmfm/services/kpi_service.py](../src/sgmfm/services/kpi_service.py)
  - Calcula HC/Total mass balance (%).
  - Classifica `OK/ALERT/UNKNOWN`.
  - Mantém contagem de dias consecutivos em alerta.
  - Abre `Case` automaticamente ao atingir gatilho.

## Cases

- `CaseService.get_open_cases()` e `CaseService.close_case()` em [src/sgmfm/services/case_service.py](../src/sgmfm/services/case_service.py)
  - Fecha case e registra auditoria.

## Relatórios

- `generate_daily_report_pdf(out_path, title, rows)` em [src/sgmfm/services/reporting/pdf_reports.py](../src/sgmfm/services/reporting/pdf_reports.py)
  - Gera PDF simples com últimas linhas de KPI.

## Persistência

- SQLAlchemy base/engine/session em [src/sgmfm/db.py](../src/sgmfm/db.py)
- Modelos ORM em [src/sgmfm/models.py](../src/sgmfm/models.py)
  - `DailyMeasurement`, `ComparisonResult`, `CalibrationEvent`, `Case`, `AuditLog`, etc.
