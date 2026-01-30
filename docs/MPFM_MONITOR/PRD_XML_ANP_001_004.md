# PRD — Regras de Geração, Validação e Preparação de XML (ANP / i-ENGINE / SFP) — Tipos 001, 002, 003 e 004

**Versão:** 0.9 (atualizada com material enviado nesta conversa)  
**Data:** 2026-01-29  
**Objetivo:** consolidar, em formato implementável, as regras **de geração**, **validação**, **compactação**, **envio** e **reenvio** de arquivos XML para a ANP via **i-ENGINE (SFP)** para os tipos **001, 002, 003 e 004**.

---

## 1) Fontes e evidências usadas

Material fornecido nesta conversa (ANP / i-ENGINE):
- **PMO – Pontos de medição para óleo** (Procedimento de carga) — seqarquivocarga=27  
- **PMGL – Pontos de medição para gás linear** (Procedimento de carga) — seqarquivocarga=67  
- **PMGD – Pontos de medição para gás diferencial** (Procedimento de carga) — seqarquivocarga=68  
- Templates de **A004**:
  - `AlarmeEmBranco.txt` (listas vazias)
  - `AlarmeEvento.txt` / `AlarmeFull.txt` (exemplo completo)

> **Nota importante (lacuna):** não foi fornecido (nesta conversa) o manual específico do **tipo 004** no i-ENGINE, nem os **XSD oficiais** (schemas) dos tipos 001–004. Este PRD usa o que há de evidência nos manuais (PMO/PMGL/PMGD) e nos templates (A004). O sistema deve permitir “plugar” XSDs oficiais assim que disponíveis.

---

## 2) Escopo do produto

### 2.1. O que o sistema deve fazer
1. Gerar XML **bem-formado** e **aderente ao i-ENGINE/SFP**.
2. Compactar para **ZIP**.
3. Enviar via **Web Service** do serviço de transferência de arquivos.
4. Executar **validação automática** (server-side) e registrar resultados.
5. Realizar **reenvio** dos arquivos não carregados.
6. Manter trilha de auditoria: versão do gerador, hash do arquivo, timestamps, status de validação.

### 2.2. Tipos cobertos
- **001**: Óleo (baseado no manual “PMO – Pontos de medição para óleo”)  
- **002**: Gás linear (baseado no manual “PMGL – Pontos de medição para gás linear”)  
- **003**: Gás diferencial (baseado no manual “PMGD – Pontos de medição para gás diferencial”)  
- **004**: Alarmes & Eventos (baseado nos templates `Alarme*.txt`)

> **Nota sobre “aaa (código interno)”**: os manuais indicam que o nome do arquivo usa um **código interno `aaa`**. Eles não afirmam, no trecho evidenciado, que `aaa` seja “001/002/003/004”. O sistema deve manter `aaa` como um **parâmetro por tipo**, configurável por ambiente/instalação.

---

## 3) Fluxo operacional (fim-a-fim)

O fluxo mínimo para transmissão, comum aos manuais PMO/PMGL/PMGD:
1. Preparação do XML pelo operador  
2. Compactação em ZIP  
3. Envio do ZIP via Web Service  
4. Validação automática do XML  
5. Reenvio do que não carregou  

---

## 4) Nomenclatura do arquivo (obrigatória)

Formato padrão:
```
aaa_bbbbbbbb_cccccccccccccc.ddd
```

Onde:
- `aaa` = código interno do arquivo (**não deve ser alterado**)  
- `bbbbbbbb` = 8 primeiros dígitos do CNPJ do operador  
- `cccccccccccccc` = data/hora de geração no formato `AAAAMMDDHHmmSS`  
- `ddd` = `xml` (descompactado) ou `zip` (compactado)

Requisitos adicionais do sistema:
- Timestamp deve ser gerado no momento de exportação do arquivo e gravado no metadado interno do job.
- O nome do ZIP deve corresponder exatamente ao nome do XML (mudando apenas `.xml` → `.zip`).

---

## 5) Regras gerais de preenchimento

### 5.1. Natureza (tipos) de campo
O sistema deve validar os campos conforme a “natureza”:
- `ANO_MES` = `AAAAMM` (sem separadores)  
- `TEXTO` = texto até o máximo definido
- `NATURAL` = inteiro não-negativo
- `INTEIRO` = inteiro (inclui negativos)
- `DATA` = `DD/MM/AAAA`
- `DATA_HORA` = `DD/MM/AAAA HH:mm:SS` (19 caracteres)
- `RACIONAL` = número decimal com **vírgula** (não usar ponto como separador de milhar)
- `SIM_NAO` = `S` ou `N`

### 5.2. Estrutura e formatação numérica
- A estrutura do XML **não pode ser alterada**, mesmo quando a informação “não for pertinente”.
- Para dados numéricos, usar **vírgula** como separador decimal e **não** usar `.` como separador de milhar.
- Para `RACIONAL (X,Y)`: validar tamanho máximo da parte inteira e número de casas decimais.

---

## 6) Modelo lógico comum (001/002/003)

> A evidência nos manuais descreve **grupos** (ex.: `DADOS_BASICOS`, `CONFIGURACAO_CV`, `ELEMENTO_PRIMARIO`, etc.).  
> O gerador deve mapear estes grupos para a hierarquia XML esperada pelo i-ENGINE (e/ou XSD quando disponível).

### 6.1. Grupo `DADOS_BASICOS` (obrigatório)
- Descreve a leitura de configuração/produção do ponto de medição em uma instalação.
- Cardinalidade: **mínimo 1 / máximo ilimitado** (1 por ponto/instalação).

Campos mínimos (presentes nos manuais):
- `NUM_SERIE_ELEMENTO_PRIMARIO` (TEXTO, 30, obrigatório)  
- `COD_INSTALACAO` (NATURAL, 10, obrigatório)  
- `COD_TAG_PONTO_MEDICAO` (TEXTO, 20, obrigatório)

### 6.2. Grupo `CONFIGURACAO_CV` (obrigatório; 1:1)
- Registra configuração do computador de vazão do ponto de medição.
- Cardinalidade: **mínimo 1 / máximo 1** por `DADOS_BASICOS`.

Campos mínimos:
- `NUM_SERIE_COMPUTADOR_VAZAO` (TEXTO, 30, obrigatório)  
- `DHA_COLETA` (DATA_HORA, 19, obrigatório)  
- `MED_TEMPERATURA` (RACIONAL (3,2), obrigatório)  
- `MED_PRESSAO_ATMSA` (RACIONAL (3,3), obrigatório)  
- `MED_PRESSAO_RFRNA` (RACIONAL (3,3), obrigatório)

Campos adicionais por tipo:
- **Óleo (001)**: `MED_DENSIDADE_RELATIVA` pode ser **não obrigatório** (ver manual PMO).  
- **Gás diferencial (003)**: `MED_DENSIDADE_RELATIVA` é **obrigatório** e há campo de norma de cálculo (`DSC_NORMA_UTILIZADA_CALCULO`).

### 6.3. Grupo `ELEMENTO_PRIMARIO` (obrigatório; 1:1)
- Configura o elemento primário/medidor vinculado ao ponto.
- Cardinalidade: **mínimo 1 / máximo 1**.
- Exemplo de campos (manuais PMO/PMGL indicam série de `ICE_METER_FACTOR_n` com 1 obrigatório e demais opcionais).

### 6.4. Grupos de instrumentos e produção (principalmente 002/003)
Os manuais de gás detalham grupos adicionais:
- Grupo de **produção** (`PRODUCAO`) com campos de vazão/volume/totalizadores (ver manual específico do tipo).
- Instrumentos:
  - `INSTRUMENTO_PRESSAO` (mínimo 1; máximo ilimitado)
  - `INSTRUMENTO_TEMPERATURA` (mínimo 1; máximo ilimitado)
- Para **gás diferencial (003)**: grupo `PLACA_ORIFICIO` (obrigatório; 1:1).

---

## 7) Modelo específico do Tipo 004 (A004 — Alarmes & Eventos)

### 7.1. Estrutura mínima (listas vazias permitidas)
Um XML A004 deve conter:
- Raiz `<a004>`
- `<LISTA_DADOS_BASICOS>`
- `<DADOS_BASICOS>` com atributos:
  - `NUM_SERIE_COMPUTADOR_VAZAO`
  - `COD_INSTALACAO`
- Listas:
  - `<LISTA_ALARMES>` (pode ser vazia como `<LISTA_ALARMES />`)
  - `<LISTA_EVENTOS>` (pode ser vazia como `<LISTA_EVENTOS />`)

### 7.2. Campos de `ALARMES`
Cada `<ALARMES>` deve conter:
- `<DSC_DADO_ALARMADO>`
- `<DHA_ALARME>` (DATA_HORA 19)
- `<DSC_MEDIDA_ALARMADA>`

### 7.3. Campos de `EVENTOS`
Cada `<EVENTOS>` deve conter:
- `<DSC_DADO_ALTERADO>`
- `<DSC_CONTEUDO_ORIGINAL>`
- `<DSC_CONTEUDO_ATUAL>`
- `<DHA_OCORRENCIA_EVENTO>` (DATA_HORA 19)

### 7.4. Declaração XML / encoding
Os templates fornecidos incluem `<?xml version="1.0" ?>` em alguns casos, e nenhum encoding explícito.  
**Requisito do produto:** encoding deve ser **configurável** por tipo/ambiente (ex.: `iso-8859-1`), pois isso costuma ser exigência de validadores ANP.

---

## 8) Validações obrigatórias (client-side) antes do envio

### 8.1. Validação estrutural
- XML bem-formado (parser XML).
- Presença de grupos obrigatórios (minOccurs).
- Cardinalidade (min/max) conforme manual.
- Manter tags esperadas mesmo se “não pertinentes” (preencher com valor default ou tag vazia **se permitido**).

### 8.2. Validação de campos (tipo, tamanho, formato)
- `DATA_HORA` com 19 caracteres e máscara `DD/MM/AAAA HH:mm:SS`.
- `RACIONAL`: usar vírgula decimal; rejeitar ponto como decimal quando a natureza for numérica.
- `SIM_NAO`: apenas `S`/`N`.
- `TEXTO`: truncar ou rejeitar se exceder tamanho máximo (decisão configurável; default: **rejeitar**).

### 8.3. Validação de consistência mínima
- `COD_INSTALACAO` deve existir no cadastro/config do sistema.
- Para 001–003: `COD_TAG_PONTO_MEDICAO` deve existir no cadastro.
- Para 004: `NUM_SERIE_COMPUTADOR_VAZAO` e `COD_INSTALACAO` não podem estar vazios.

---

## 9) Empacotamento e envio

### 9.1. ZIP obrigatório no canal
- O sistema deve zipar o XML para reduzir tempo de transmissão (conforme manuais).
- ZIP deve conter **apenas 1 XML** por arquivo.
- Nome do ZIP deve seguir o padrão de nomenclatura (seção 4).

### 9.2. Integração com Web Service (i-ENGINE)
- Implementar cliente HTTP/SOAP/WS conforme especificação do serviço de transferência.
- Persistir:
  - request-id
  - timestamp envio
  - resposta do serviço (sucesso/erro)
  - log de validação automática (quando disponível)

### 9.3. Reenvio de falhas
- Após retorno de erro de carga/validação, gerar “fila de reenvio” mantendo o mesmo arquivo e registrando tentativas.
- Regras anti-loop: limitar tentativas e exigir correção do dado após N falhas idênticas.

---

## 10) Critérios de aceite (DoD)

1. Para cada tipo (001–004), dado um dataset válido, o sistema gera:
   - XML bem-formado
   - ZIP nomeado corretamente
   - Passa todas as validações client-side
2. O envio registra status e evidencia de validação automática.
3. Para XML inválido, o sistema:
   - bloqueia envio
   - retorna lista de erros com:
     - caminho do campo/tag
     - regra violada (ex.: “DATA_HORA != 19 chars”)
     - valor recebido
4. Reenvio funciona e é auditável.

---

## 11) Lacunas e itens a solicitar para fechar “100% ANP”

Para transformar este PRD em “padrão-ouro” (sem inferência), faltam pelo menos:
1. **XSD oficiais** dos tipos 001–004 (ou export do i-ENGINE).  
2. **Tabela oficial de mapeamento** do `aaa` (código interno) para cada tipo/arquivo.  
3. Manual específico do **tipo 004** no i-ENGINE (caso haja regras adicionais além do template).  
4. Regras oficiais sobre **campos vazios** (quando “tag vazia” é aceitável vs “zero” obrigatório).

---

## 12) Anexos (templates)

### 12.1. A004 — listas vazias (exemplo)
Ver `AlarmeEmBranco.txt`.

### 12.2. A004 — exemplo completo
Ver `AlarmeEvento.txt` / `AlarmeFull.txt`.
