# PRD — Regras de geração/validação por tipo (001, 002, 003 e 004) — XML ANP

**Versão:** 0.1 (completo para 004; parcial para 001/002/003 até XSD/manual)  
**Data:** 2026-01-29  

> Este PRD descreve **regras implementáveis**. Onde houver “TBD”, é dependência direta do XSD/manual oficial do tipo.

---

## 0) Regras comuns (cross-cutting)

### 0.1 Encoding e prolog
- O motor deve suportar **ISO-8859-1** quando exigido e ser capaz de emitir o prolog correspondente.
- A validação deve falhar se o prolog/encoding não bater com o requerido pelo tipo.

### 0.2 Timezone e timestamp (nome de arquivo)
- Sempre usar **hora local (America/Sao_Paulo)** para timestamps em nomes quando o padrão exigir.

### 0.3 Datas e horários (campos)
- **DATA:** `DD/MM/AAAA`  
- **DATA_HORA:** `DD/MM/AAAA HH:mm:SS` (**19 caracteres**)  
- O motor deve validar comprimento e parse.

### 0.4 Números e separador decimal
- Quando o campo for natureza **RACIONAL**, usar **vírgula** como separador decimal.
- Preservar casas decimais recebidas (não “formatar” por conta própria).
- Inteiros não devem conter vírgula.

### 0.5 Campos obrigatórios
- Campos obrigatórios **nunca podem faltar**.
- Quando não houver valor (e a regra do tipo exigir), preencher com **"0"** ao invés de vazio.
- Campos texto devem respeitar tamanho máximo; truncar apenas se exceder o limite.

### 0.6 Ordem e hierarquia
- A ordem/hierarquia do XML deve ser a definida pelo **XSD** e/ou **template canônico**.
- A validação deve apontar divergências como erro estrutural.

---

## 1) Tipo 004 — PMAE (Alarmes e Eventos) — regras fechadas

### 1.1 Nome do arquivo
- Padrão: `004_<CNPJ8>_<AAAAMMDDHHmmSS>.xml`
- `CNPJ8` default: `02857854` (quando não informado).

### 1.2 Prolog/encoding
- Deve conter: `<?xml version="1.0" encoding="iso-8859-1"?>`

### 1.3 Raiz e estrutura obrigatória
- Raiz: `<a004>`
- Estrutura (nível alto):
  - `<LISTA_DADOS_BASICOS>`
    - `<DADOS_BASICOS NUM_SERIE_COMPUTADOR_VAZAO="..." COD_INSTALACAO="...">`
      - `<LISTA_ALARMES>`
        - 0..n `<ALARMES>`
      - `<LISTA_EVENTOS>`
        - 0..n `<EVENTOS>`

### 1.4 Cardinalidade e consolidação
- **1 XML por dia por `NUM_SERIE_COMPUTADOR_VAZAO`**.
- Alarmes e eventos do mesmo CV/dia devem estar no mesmo XML.
- Se não houver alarmes/eventos, as listas devem existir vazias:
  - `<LISTA_ALARMES />` e/ou `<LISTA_EVENTOS />` (conforme template).

### 1.5 Campos obrigatórios (004)
#### 1.5.1 DADOS_BÁSICOS (atributos obrigatórios)
- `NUM_SERIE_COMPUTADOR_VAZAO` (TEXT, máx 30, obrigatório)
- `COD_INSTALACAO` (NATURAL, máx 10, obrigatório)

#### 1.5.2 ALARMES
- `DSC_DADO_ALARMADO` (TEXT, 50, obrigatório)
- `DHA_ALARME` (DATA_HORA, 19, obrigatório)
- `DSC_MEDIDA_ALARMADA` (TEXT, 19, obrigatório)

#### 1.5.3 EVENTOS
- `DSC_DADO_ALTERADO` (TEXT, 50, obrigatório)
- `DSC_CONTEUDO_ORIGINAL` (TEXT, 50, obrigatório)
- `DSC_CONTEUDO_ATUAL` (TEXT, 50, obrigatório)
- `DHA_OCORRENCIA_EVENTO` (DATA_HORA, 19, obrigatório)  
  - **Observação:** a posição (ordem de filhos) deve seguir o template/XSD canônico do projeto (regra interna: “não é mais o primeiro filho”).

### 1.6 Regras de conteúdo adicionais (004)
- Não alterar textos operacionais (ex.: `SET`, `ACK`, `CLR`, `Active`, `Clear`, `ACCEPT`).
- Detectar valores numéricos e aplicar vírgula quando natureza for racional; porém, se o campo for TEXT (ex.: `DSC_MEDIDA_ALARMADA`), preservar literal.
- Truncar somente se exceder o limite do campo (50 chars para TEXT 50).

### 1.7 Pretty print
- O XML deve ser *pretty-printed* idêntico ao template de referência (indentação/quebras), sem alterar valores.

### 1.8 Inferência de CV e mapeamento
- Quando os insumos tiverem padrão de nome (ex.: `"<CV> - ALARMS dd-mm-aaaa"` e `"<CV> - EVENTS dd-mm-aaaa"`), inferir o CV e preencher:
  - `NUM_SERIE_COMPUTADOR_VAZAO`
  - `COD_INSTALACAO`
- Mapeamento CV→(NUM_SERIE, COD_INST) deve ser configurável.

---

## 2) Tipo 001 — (TBD até XSD/manual)

### 2.1 Hipótese operacional (para o motor)
- O tipo 001 é gerado diariamente por CV/instalação e deve ser validado por XSD específico.
- O motor deve implementar o pipeline completo (nomeação, encoding, XSD validation, checks), mas **os campos obrigatórios e hierarquia** são **TBD**.

### 2.2 Regras a definir via XSD/manual (TBD)
- Nome padrão do arquivo (se segue `001_<CNPJ8>_<timestamp>.xml` ou outro).
- Elemento raiz e namespaces.
- Chaves de unicidade (ex.: instalação, ponto de medição, período).
- Tabela completa de campos obrigatórios + tipos (DATA/RACIONAL/TEXT etc.).
- Unidades (m³, Sm³, kg, t etc.) e regras de conversão/normalização.

### 2.3 Checks mínimos (já implementáveis)
- XML well-formed.
- Prolog/encoding conforme definido no XSD/manual.
- XSD validation.
- Campos com natureza DATA_HORA devem ter 19 caracteres.
- RACIONAL deve usar vírgula (quando aplicável).

---

## 3) Tipo 002 — (TBD até XSD/manual)

Mesma abordagem do tipo 001:
- pipeline completo implementável;
- regras de estrutura/campos a fechar com XSD/manual.

TBD:
- hierarquia e lista de campos obrigatórios;
- nomenclatura;
- cardinalidades por CV/dia/período.

Checks mínimos implementáveis:
- parse, prolog/encoding, XSD, formatos de data/hora e racional.

---

## 4) Tipo 003 — (TBD até XSD/manual)

Mesma abordagem do tipo 001/002.

TBD:
- estrutura e obrigatórios;
- regras específicas para “gás diferencial” (se for o caso), incluindo parâmetros metrológicos e períodos.

Checks mínimos implementáveis:
- parse, prolog/encoding, XSD, formatos data/hora e racional.

---

## 5) Relatório de conformidade (obrigatório para todos os tipos)

Para cada arquivo:
- Resultado de validação XSD.
- Lista de regras de conteúdo avaliadas:
  - obrigatórios presentes;
  - tamanhos máximos;
  - formatos (DATA, DATA_HORA, RACIONAL etc.);
  - nome do arquivo;
  - coerência de metadados (CNPJ/instalação/CV).
- Evidências:
  - XPath do erro;
  - valor; esperado; sugestão.

Sumário por execução:
- Quantidade total de XMLs por tipo;
- % aprovação;
- Top 10 erros.

---

## 6) O que falta para “fechar” 001/002/003 neste PRD

Para transformar TBD em regras fechadas, o projeto precisa versionar:
1) XSD oficial ANP para 001/002/003.
2) 1 “golden XML” aprovado por tipo.
3) Definição do padrão de nome de arquivo por tipo.
4) Lista completa de campos obrigatórios + naturezas (TEXT/RACIONAL/DATA_HORA etc.).

Com esses itens, este PRD evolui para versão 1.0 com regras determinísticas por tipo.
