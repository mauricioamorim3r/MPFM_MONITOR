# PRD — Motor de Geração, Validação e Preparação de XMLs ANP (Tipos 001, 002, 003 e 004)

**Versão:** 0.1 (rascunho técnico)  
**Data:** 2026-01-29  
**Autor:** (Gerado com apoio do ChatGPT)  
**Escopo:** Regras e requisitos funcionais/não-funcionais para um *motor* (biblioteca + CLI/UI opcional) que gere, valide e prepare arquivos XML ANP dos tipos **001/002/003/004** para submissão.

---

## 1) Contexto e problema

A rotina operacional exige:
- gerar XMLs ANP (001/002/003/004) a partir de dados do computador de vazão (FC) e/ou pacotes diários (reports, logs, parâmetros);
- validar estrutura e conteúdo conforme regras da ANP;
- preparar pacotes (nomenclatura, timezone, encoding, zip quando aplicável);
- produzir um **relatório de conformidade** (pass/fail por arquivo, evidências e motivos de falha).

Há um risco alto de reprovação/erro se:
- nome do arquivo estiver fora do padrão;
- encoding/prolog estiver incorreto;
- formatos de data/hora e separador decimal divergirem do esperado;
- campos obrigatórios vierem vazios;
- ordem/hierarquia de nós for diferente do XSD/template exigido.

---

## 2) Objetivos

### 2.1 Objetivo principal
Entregar um motor que **gere + valide + empacote** XMLs ANP 001/002/003/004 com rastreabilidade e auditoria.

### 2.2 Objetivos secundários
- Reduzir falhas humanas (padronização automática).
- Garantir repetibilidade: mesma entrada → mesmos XMLs.
- Facilitar auditoria: logs e relatórios completos por dia/CV/instalação.

---

## 3) Fora de escopo (neste PRD)
- Integração automática com portal/sistema ANP (upload).  
- Implementação de um banco corporativo completo (pode existir uma base local simples).
- Modelagem completa das regras de negócio específicas de 001/002/003 enquanto o XSD/manual oficial não estiver versionado e disponível no repositório do projeto (ver Seção 6).

---

## 4) Usuários e stakeholders

- **Time de Medição / Operação**: executa geração/validação diária e responde por prazos.
- **Gerência / Compliance**: cobra evidências (logs, conformidade, rastreabilidade).
- **TI / Automação**: integra o motor com pipelines (scheduler, RPA, etc.).
- **Auditoria / ANP**: público indireto (consumidor final do XML e da aderência).

---

## 5) Definições

- **Tipo 001/002/003/004**: famílias de XMLs ANP gerados pelo FC e/ou sistema de medição.
- **XSD**: schema ANP oficial do tipo de XML (fonte de verdade para estrutura e ordem de elementos).
- **Template canônico**: XML “golden” (exemplar aprovado) usado como referência de hierarquia e ordem.
- **Conformance Report**: relatório gerado pelo motor contendo checks executados, resultados e evidências.

---

## 6) Dependências e fontes de verdade

### 6.1 Fonte de verdade para regras
1. **XSD oficial ANP por tipo (001/002/003/004)** (obrigatório para fechar o PRD 1.0).
2. **Manual ANP / guia de preenchimento** (quando existir separado do XSD).
3. **Templates “golden” aprovados** (um por tipo; ao menos por instalação).

> Situação atual: para **004 (Alarmes/Eventos)** há regras internas “fechadas” e um template canônico. Para **001/002/003** este PRD assume que o projeto irá versionar os XSD/manuais e, até lá, implementará o pipeline e pontos de extensão.

### 6.2 Configurações necessárias
- Mapa CV → (NUM_SERIE_COMPUTADOR_VAZAO, COD_INSTALACAO) por instalação.
- CNPJ8 default (quando aplicável) e CNPJ completo por instalação.
- Timezone operacional: **America/Sao_Paulo**.
- Regras de nomeação por tipo (se confirmadas nos manuais/XSD).

---

## 7) Fluxo macro (end-to-end)

1. **Ingestão**: usuário seleciona pacote diário (ZIP) ou pasta de insumos do FC.  
2. **Detecção de tipo/escopo**: identificar quais tipos gerar (001/002/003/004) e para quais CVs/datas.  
3. **Extração/Normalização**: transformar insumos em um modelo interno (staging).  
4. **Geração XML**: emitir XML por tipo, por CV e por janela temporal.  
5. **Validação**:
   - well-formed (XML parse);
   - encoding/prolog;
   - XSD validation (por tipo);
   - regras de negócio (campos obrigatórios, formatos, ranges, consistência temporal, etc.).
6. **Empacotamento**:
   - nomear arquivos corretamente;
   - opcional: zip por dia e/ou por tipo;
   - gerar checksums (opcional, mas recomendado).
7. **Relatório de conformidade**: gerar HTML/MD/PDF com sumário e detalhes por falha.
8. **Saída**: pasta “READY_TO_SUBMIT” com XML(s) + zip(s) + relatório(s).

---

## 8) Requisitos funcionais

### RF-01 — Importação de insumos
- Suportar entrada:
  - ZIP de reports (com subpastas de relatórios diários/horários/configuração);
  - pasta local com XML templates/XSDs;
  - (opcional) CSV/Excel com staging já normalizado.

### RF-02 — Identificação de escopo
- Identificar:
  - data de competência do arquivo (dia operacional);
  - CV(s) presentes;
  - instalação associada;
  - tipos a gerar (001/002/003/004).

### RF-03 — Geração por tipo
- Gerar XML do tipo solicitado usando:
  - template canônico (para ordem/hierarquia);
  - valores do staging (para conteúdo);
  - regras de preenchimento (defaults, truncamentos, formatações).

### RF-04 — Validação (pipeline de checks)
- Executar checks em camadas (com fail-fast opcional):
  1) Nome do arquivo (regex/padrão)
  2) XML parse + well-formed
  3) Encoding/prolog
  4) XSD validation (por tipo)
  5) Regras de conteúdo (obrigatórios, tamanhos, data/hora, separadores, etc.)
  6) Consistência cruzada (ex.: mesmo CV/dia → coerência de cabeçalhos)

### RF-05 — Relatório de conformidade (obrigatório)
- Para cada execução, produzir:
  - lista de arquivos gerados;
  - status pass/fail por arquivo;
  - lista de checks executados e resultados;
  - erros com:
    - caminho XPath do problema (quando aplicável);
    - valor recebido;
    - regra violada;
    - ação recomendada.

### RF-06 — Trilhas de auditoria e reprocessamento
- Salvar um **manifest** da execução contendo:
  - versão do motor;
  - versão dos XSDs/templates;
  - hash dos insumos;
  - parâmetros (CNPJ8, timezone, mapeamentos);
  - lista de saídas e checksums.

### RF-07 — Execução em lote
- Permitir execução:
  - por dia;
  - por intervalo de datas;
  - por lista de CVs;
  - por lista de tipos.

---

## 9) Requisitos não-funcionais

- **RNF-01 (Rastreabilidade):** toda regra aplicada deve ser rastreável ao XSD/template/manual e versão.  
- **RNF-02 (Determinismo):** entradas iguais devem gerar saídas idênticas.  
- **RNF-03 (Observabilidade):** logs estruturados (JSON) + relatório humano (MD/PDF/HTML).  
- **RNF-04 (Segurança):** dados locais; sem envio externo por padrão.  
- **RNF-05 (Portabilidade):** rodar offline (Windows).  
- **RNF-06 (Performance):** suportar geração diária típica (ex.: 7 CVs) em poucos minutos.  

---

## 10) Critérios de aceite (alto nível)

- CA-01: ao fornecer insumos de um dia com 7 CVs, o motor gera os XMLs esperados e um relatório de conformidade.  
- CA-02: XMLs passam em validação XSD e checks de conteúdo para todos os casos “green”.  
- CA-03: quando um arquivo viola uma regra (ex.: decimal com ponto), o motor marca fail e aponta o XPath e a correção sugerida.  
- CA-04: execução gera manifest com hashes, versões, parâmetros e outputs.  

---

## 11) Entregáveis do projeto (artefatos)

- Código do motor (lib) + CLI.
- Pasta `schemas/` com XSD por tipo e versão.
- Pasta `templates/` com “golden” por tipo.
- Documentação:
  - `PRD_GERAL.md` (este documento)
  - `PRD_REGRAS_001_004.md` (regras detalhadas por tipo)
  - `VALIDATION_CHECKLIST.md` (checklist operacional)
- Exemplos de entrada/saída para testes (fixtures).

---

## 12) Próximos passos para fechar PRD 1.0

1) Versionar no repositório os **XSDs oficiais ANP** para 001/002/003/004.  
2) Definir com precisão:
   - padrão de nome de arquivo para 001/002/003 (se igual ao 004 ou diferente);
   - cardinalidades e chaves de unicidade por tipo;
   - tabelas de campos obrigatórios por tipo.  
3) Selecionar 1 “golden XML” aprovado por tipo e instalação.  
4) Rodar um *piloto* com 3 dias de dados e fechar critérios de aceite com evidências.

