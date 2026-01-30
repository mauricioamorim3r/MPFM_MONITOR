# PRD — Validação Cruzada Diária Multi‑Fonte (Excel, XML, PDF, TXT)

## 1. Objetivo
Definir, de forma independente e complementar ao PRD de Ingestão, as **regras, critérios e fluxos**
para validação cruzada diária dos dados de medição provenientes de **múltiplas representações**
(Excel, XML, PDF e TXT), garantindo consistência, rastreabilidade e suporte à conformidade regulatória.

Este PRD trata **exclusivamente da validação**, não da extração.

---

## 2. Princípio Fundamental (Regra‑Mãe)

> Para um mesmo **dia**, **equipamento**, **janela temporal** e **variável de medição**,  
> os valores registrados em diferentes formatos (Excel, XML, PDF, TXT)  
> representam o **mesmo fato físico de medição** e **devem ser equivalentes**
> dentro de tolerâncias técnicas definidas.

Essa regra é obrigatória e estruturante.

---

## 3. Fontes de Dados Envolvidas

### 3.1 Excel (IHM)
- Daily_Oil_YYYY‑MM‑DD.xlsx  
- Daily_Gas_YYYY‑MM‑DD.xlsx  
- Daily_Water_YYYY‑MM‑DD.xlsx  
- GasBalance_YYYY‑MM‑DD.xlsx  

### 3.2 XML
- Tipo 001 — Produção (óleo/água)
- Tipo 002 — Gás Linear
- Tipo 003 — Gás Diferencial

### 3.3 PDF
- MPFM Daily Report
- MPFM Hourly Report

### 3.4 TXT / Logs
- Alarmes
- Eventos
- Testes de poço
- Logs operacionais do computador de vazão

---

## 4. Chave Canônica de Comparação

Toda validação cruzada deve ocorrer após normalização para a **chave lógica única**:

```
(instalação)
+ (equipamento / MPFM / CV)
+ (fluido: óleo | gás | água)
+ (variável canônica)
+ (data de referência)
+ (janela temporal)
```

### Exemplos de janela temporal
- DAILY
- HOURLY
- CUMULATIVE

---

## 5. Modelo Canônico de Medição (entrada do validador)

Cada fonte gera registros normalizados no seguinte formato:

```
measurement_fact {
  source_type        (excel | xml | pdf | txt)
  source_file
  asset_id
  variable_id
  date_ref
  time_window
  value_num
  unit
  confidence_flags
}
```

A validação **nunca** ocorre sobre dados brutos.

---

## 6. Regras de Equivalência

### 6.1 Regras Gerais
- Unidades devem ser compatíveis (conversão permitida).
- Base de referência deve ser equivalente (std vs operação).
- Valores ausentes devem ser explicitamente tratados.

### 6.2 Tolerâncias Técnicas (configuráveis)

| Variável | Tolerância |
|-------|-----------|
| Massa HC | ±0,5 % |
| Massa Total | ±0,5 % |
| Volume Std | ±0,1 % |
| Energia | ±1,0 % |
| Horas de operação | Exatamente igual |
| Contagem de eventos | Exatamente igual |

---

## 7. Classificação do Resultado da Validação

| Situação | Classificação |
|-------|---------------|
| Valores idênticos | CONSISTENTE |
| Diferença dentro da tolerância | ACEITÁVEL |
| Diferença fora da tolerância | INCONSISTENTE |
| Fonte ausente | INCOMPLETO |
| Unidade incompatível | ERRO DE ORIGEM |

Cada classificação deve gerar um **registro histórico**.

---

## 8. Fluxo Operacional da Validação

### Passo 1 — Agrupamento
Agrupar todos os registros por:
```
(asset_id, variable_id, date_ref, time_window)
```

### Passo 2 — Comparação
- Comparar todas as fontes disponíveis no grupo.
- Aplicar conversões e tolerâncias.

### Passo 3 — Classificação
- Atribuir status por grupo.
- Registrar detalhes da divergência.

### Passo 4 — Persistência
Salvar resultado em:
```
fact_cross_validation_daily
```

---

## 9. Integração com Conformidade e Desenquadramento

### 9.1 Regra de Persistência
Uma inconsistência passa a ser considerada **desenquadramento** quando:

- O status = INCONSISTENTE
- Persistir por **N dias consecutivos** (ex.: 10 dias)

### 9.2 Efeito
- Abertura automática de **Evento de Desenquadramento**
- Vinculação ao Plano de Verificação de Desempenho
- Início do Plano de Ação (Etapa 1)

---

## 10. Uso Regulatório e Auditoria

Este módulo suporta:
- Evidência objetiva de coerência entre sistemas
- Rastreabilidade completa por fonte
- Demonstração de controle metrológico contínuo
- Atendimento aos princípios da RANP 44 e RTM

---

## 11. Requisitos Não Funcionais

- Validação determinística (mesma entrada → mesmo resultado)
- Reprocessamento histórico (ex.: últimos 30 dias)
- Audit log imutável
- Parametrização por ativo/variável

---

## 12. Critérios de Aceitação

1. Comparação automática entre Excel, XML e PDF do mesmo dia.
2. Registro explícito de divergências.
3. Aplicação correta de tolerâncias.
4. Gatilho de desenquadramento por persistência.
5. Evidência auditável por data e equipamento.

---

## 13. Observação Final

Este PRD é **complementar** ao PRD de Ingestão e Base Única.  
Ele define a **inteligência de consistência diária** do sistema de medição.

