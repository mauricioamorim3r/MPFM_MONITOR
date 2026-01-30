# PRD — Geração, Validação e Preparação de XML (ANP i-Engine / SFP)
**Escopo:** Tipos **001 (Óleo)**, **002 (Gás Linear)**, **003 (Gás Diferencial/ISO5167)** e **004 (Alarmes & Eventos)**.

**Versão:** 1.0 (atualizado em 2026-01-30)

## 1. Objetivo
Definir, em formato implementável, as regras de **geração**, **validação** e **preparação (ZIP/transmissão)** dos arquivos XML para envio à ANP via i‑Engine (carga XML), cobrindo os tipos 001–004.

## 2. Evidências e fontes usadas
Este PRD foi consolidado a partir de:
- PDFs de referência operacional (procedimento i‑Engine) para cada família:
  - **PMO** (Óleo / tipo 001): `PMO - PONTOS DE MEDIÇÃO PARA ÓLEO.pdf`
  - **PMGL** (Gás Linear / tipo 002): `PMGL - PONTOS DE MEDIÇÃO PARA GÁS LINEAR.pdf`
  - **PMGD** (Gás Diferencial / tipo 003): `PMGD - PONTOS DE MEDIÇÃO PARA GÁS DIFERENCIAL.pdf`
- XMLs “golden samples” reais (estruturas e formatação de campos):
- 001_04028583_20260127001000_38480.xml
- 002_04028583_20260127001006_38480.xml
- 003_04028583_20260127001007_38480.xml
- 004_04028583_20260127001006_38480.xml
- Templates/insumos de geração do tipo 004 (placeholders e casos vazios): `AlarmeEmBranco.txt`, `AlarmeEvento.txt`, `AlarmeFull.txt`.

**Nota importante:** não foi fornecido XSD oficial; portanto, o validador deve combinar **regras do procedimento** + **verificações estruturais** e **convergência com os samples**.

## 3. Visão geral do fluxo ANP (i‑Engine)
Conforme os PDFs (procedimento i‑Engine), o fluxo é:
1) Gerar XML (operador);
2) Compactar em `.zip` (reduzir tempo de transmissão);
3) Enviar o ZIP via Web Service de transferência;
4) Validação automática do XML;
5) Reenvio dos arquivos não carregados.

O software deve ser capaz de: **gerar/zipar**, **validar localmente** (pré‑envio) e **interpretar retorno** (pós‑envio).

## 4. Regras comuns (aplicam a 001–004)
### 4.1. Nomenclatura do arquivo
Os PDFs definem o padrão genérico:
`aaa_bbbbbbbb_cccccccccccccc.ddd`
- `aaa`: código interno do tipo de arquivo (ex.: 001, 002, 003, 004)
- `bbbbbbbb`: 8 primeiros dígitos do CNPJ do operador
- `cccccccccccccc`: data/hora de geração no formato **AAAAMMDDHHmmSS**
- `ddd`: extensão (`xml` ou `zip`, conforme etapa)

**Observação (evidência de campo):** os samples atuais usam um sufixo adicional `_COD_INSTALACAO` antes da extensão, ex.: `001_04028583_20260127001000_38480.xml`. Portanto, implemente o naming como **configurável**:
- Variante A (procedimento): `aaa_CNPJ8_YYYYMMDDHHMMSS.xml`
- Variante B (samples): `aaa_CNPJ8_YYYYMMDDHHMMSS_COD_INSTALACAO.xml`

### 4.2. Codificação e declaração XML
- Recomendado (e observado em 001–003): `<?xml version="1.0" encoding="iso-8859-1"?>`
- **Não usar UTF‑8 com BOM** nos arquivos finais.
- O tipo 004, nos templates e em alguns samples, aparece sem `encoding`. Para robustez ANP, gere sempre com `iso-8859-1`.

### 4.3. Hierarquia padrão (todos os tipos)
Todos os tipos seguem o padrão de envelope:
- Raiz: `<a00X>` (a001, a002, a003, a004)
- Bloco: `<LISTA_DADOS_BASICOS>`
- Itens: `<DADOS_BASICOS ...>` (0..n por arquivo)

### 4.4. Formatos de dados (Natureza)
Os PDFs definem as naturezas e formatos principais:
- **ANO_MES**: `AAAAMM`
- **DATA**: `DD/MM/AAAA`
- **DATA_HORA**: `DD/MM/AAAA HH:mm:SS` (19 caracteres)
- **RACIONAL**: número com **vírgula** como separador decimal (não usar ponto)
- **NATURAL / INTEIRO**: inteiros (conforme definição do procedimento)
- **TEXTO**: string até o limite de caracteres
- **SIM_NAO**: `S` ou `N`

**Regra de ouro de geração:** *não reformatar* valores já “prontos” vindos do sistema fonte; preserve casas decimais, zeros à esquerda e campos de texto exatamente como coletados.

### 4.5. ZIP
- Compactar 1 XML em 1 ZIP (recomendado pelos PDFs).
- Nome do ZIP deve seguir o mesmo padrão (trocando apenas extensão para `.zip`).
- O conteúdo do ZIP deve conter o XML na raiz (sem subpastas).

### 4.6. Ordem e *pretty print*
- Preserve a **ordem dos elementos** conforme os procedimentos e os golden samples.
- Use indentação consistente (pretty print) para facilitar auditoria; isso não deveria afetar validação semântica, mas reduz risco de divergência em comparações.

## 5. Especificação por tipo (estrutura + campos)
### 5.1 Tipo 001 — Óleo (PMO)
**Documento de referência:** PMO - PONTOS DE MEDIÇÃO PARA ÓLEO.pdf

**Raiz:** `<a001>`  
**Itens por arquivo (evidência do sample):** `4` blocos `<DADOS_BASICOS>`

**Atributos de `<DADOS_BASICOS>` (obrigatórios no sample):** `COD_INSTALACAO, COD_TAG_PONTO_MEDICAO, NUM_SERIE_ELEMENTO_PRIMARIO`  
**Exemplo (do sample):** `{'NUM_SERIE_ELEMENTO_PRIMARIO': 'H668', 'COD_INSTALACAO': '38480', 'COD_TAG_PONTO_MEDICAO': '20FT2303'}`

**Sub-blocos dentro de `<DADOS_BASICOS>` (ordem observada):**
- `LISTA_CONFIGURACAO_CV`
- `LISTA_ELEMENTO_PRIMARIO`
- `LISTA_INSTRUMENTO_PRESSAO`
- `LISTA_INSTRUMENTO_TEMPERATURA`
- `LISTA_PRODUCAO`

**XML mínimo (esqueleto):**

```xml
<?xml version="1.0" encoding="iso-8859-1"?>
<a001>
	<LISTA_DADOS_BASICOS>
		<DADOS_BASICOS COD_INSTALACAO="{COD_INSTALACAO}" COD_TAG_PONTO_MEDICAO="{COD_TAG_PONTO_MEDICAO}" NUM_SERIE_ELEMENTO_PRIMARIO="{NUM_SERIE_ELEMENTO_PRIMARIO}">
		<LISTA_CONFIGURACAO_CV>
			<CONFIGURACAO_CV>
			<NUM_SERIE_COMPUTADOR_VAZAO>{NUM_SERIE_COMPUTADOR_VAZAO}</NUM_SERIE_COMPUTADOR_VAZAO>
			<DHA_COLETA>{DHA_COLETA}</DHA_COLETA>
			<MED_TEMPERATURA>{MED_TEMPERATURA}</MED_TEMPERATURA>
			<MED_PRESSAO_ATMSA>{MED_PRESSAO_ATMSA}</MED_PRESSAO_ATMSA>
			<MED_PRESSAO_RFRNA>{MED_PRESSAO_RFRNA}</MED_PRESSAO_RFRNA>
			<MED_DENSIDADE_RELATIVA>{MED_DENSIDADE_RELATIVA}</MED_DENSIDADE_RELATIVA>
			<DSC_VERSAO_SOFTWARE>{DSC_VERSAO_SOFTWARE}</DSC_VERSAO_SOFTWARE>
			</CONFIGURACAO_CV>
		</LISTA_CONFIGURACAO_CV>
		<LISTA_ELEMENTO_PRIMARIO>
			<ELEMENTO_PRIMARIO>
			<ICE_METER_FACTOR_1>{ICE_METER_FACTOR_1}</ICE_METER_FACTOR_1>
			<ICE_METER_FACTOR_2>{ICE_METER_FACTOR_2}</ICE_METER_FACTOR_2>
			<ICE_METER_FACTOR_3>{ICE_METER_FACTOR_3}</ICE_METER_FACTOR_3>
			<ICE_METER_FACTOR_4>{ICE_METER_FACTOR_4}</ICE_METER_FACTOR_4>
			<ICE_METER_FACTOR_5>{ICE_METER_FACTOR_5}</ICE_METER_FACTOR_5>
			<ICE_METER_FACTOR_6>{ICE_METER_FACTOR_6}</ICE_METER_FACTOR_6>
			<ICE_METER_FACTOR_7>{ICE_METER_FACTOR_7}</ICE_METER_FACTOR_7>
			<ICE_METER_FACTOR_8>{ICE_METER_FACTOR_8}</ICE_METER_FACTOR_8>
			<ICE_METER_FACTOR_9>{ICE_METER_FACTOR_9}</ICE_METER_FACTOR_9>
			<ICE_METER_FACTOR_10>{ICE_METER_FACTOR_10}</ICE_METER_FACTOR_10>
			<ICE_METER_FACTOR_11>{ICE_METER_FACTOR_11}</ICE_METER_FACTOR_11>
			<ICE_METER_FACTOR_12>{ICE_METER_FACTOR_12}</ICE_METER_FACTOR_12>
			<QTD_PULSOS_METER_FACTOR_1>{QTD_PULSOS_METER_FACTOR_1}</QTD_PULSOS_METER_FACTOR_1>
			<QTD_PULSOS_METER_FACTOR_2>{QTD_PULSOS_METER_FACTOR_2}</QTD_PULSOS_METER_FACTOR_2>
			<QTD_PULSOS_METER_FACTOR_3>{QTD_PULSOS_METER_FACTOR_3}</QTD_PULSOS_METER_FACTOR_3>
			<QTD_PULSOS_METER_FACTOR_4>{QTD_PULSOS_METER_FACTOR_4}</QTD_PULSOS_METER_FACTOR_4>
			<QTD_PULSOS_METER_FACTOR_5>{QTD_PULSOS_METER_FACTOR_5}</QTD_PULSOS_METER_FACTOR_5>
			<QTD_PULSOS_METER_FACTOR_6>{QTD_PULSOS_METER_FACTOR_6}</QTD_PULSOS_METER_FACTOR_6>
			<QTD_PULSOS_METER_FACTOR_7>{QTD_PULSOS_METER_FACTOR_7}</QTD_PULSOS_METER_FACTOR_7>
			<QTD_PULSOS_METER_FACTOR_8>{QTD_PULSOS_METER_FACTOR_8}</QTD_PULSOS_METER_FACTOR_8>
			<QTD_PULSOS_METER_FACTOR_9>{QTD_PULSOS_METER_FACTOR_9}</QTD_PULSOS_METER_FACTOR_9>
			<QTD_PULSOS_METER_FACTOR_10>{QTD_PULSOS_METER_FACTOR_10}</QTD_PULSOS_METER_FACTOR_10>
			<QTD_PULSOS_METER_FACTOR_11>{QTD_PULSOS_METER_FACTOR_11}</QTD_PULSOS_METER_FACTOR_11>
			<QTD_PULSOS_METER_FACTOR_12>{QTD_PULSOS_METER_FACTOR_12}</QTD_PULSOS_METER_FACTOR_12>
			<ICE_K_FACTOR_1>{ICE_K_FACTOR_1}</ICE_K_FACTOR_1>
			<ICE_K_FACTOR_2>{ICE_K_FACTOR_2}</ICE_K_FACTOR_2>
			<ICE_K_FACTOR_3>{ICE_K_FACTOR_3}</ICE_K_FACTOR_3>
			<ICE_K_FACTOR_4>{ICE_K_FACTOR_4}</ICE_K_FACTOR_4>
			<ICE_K_FACTOR_5>{ICE_K_FACTOR_5}</ICE_K_FACTOR_5>
			<ICE_K_FACTOR_6>{ICE_K_FACTOR_6}</ICE_K_FACTOR_6>
			<ICE_K_FACTOR_7>{ICE_K_FACTOR_7}</ICE_K_FACTOR_7>
			<ICE_K_FACTOR_8>{ICE_K_FACTOR_8}</ICE_K_FACTOR_8>
			<ICE_K_FACTOR_9>{ICE_K_FACTOR_9}</ICE_K_FACTOR_9>
			<ICE_K_FACTOR_10>{ICE_K_FACTOR_10}</ICE_K_FACTOR_10>
			<ICE_K_FACTOR_11>{ICE_K_FACTOR_11}</ICE_K_FACTOR_11>
			<ICE_K_FACTOR_12>{ICE_K_FACTOR_12}</ICE_K_FACTOR_12>
			<QTD_PULSOS_K_FACTOR_1>{QTD_PULSOS_K_FACTOR_1}</QTD_PULSOS_K_FACTOR_1>
			<QTD_PULSOS_K_FACTOR_2>{QTD_PULSOS_K_FACTOR_2}</QTD_PULSOS_K_FACTOR_2>
			<QTD_PULSOS_K_FACTOR_3>{QTD_PULSOS_K_FACTOR_3}</QTD_PULSOS_K_FACTOR_3>
			<QTD_PULSOS_K_FACTOR_4>{QTD_PULSOS_K_FACTOR_4}</QTD_PULSOS_K_FACTOR_4>
			<QTD_PULSOS_K_FACTOR_5>{QTD_PULSOS_K_FACTOR_5}</QTD_PULSOS_K_FACTOR_5>
			<QTD_PULSOS_K_FACTOR_6>{QTD_PULSOS_K_FACTOR_6}</QTD_PULSOS_K_FACTOR_6>
			<QTD_PULSOS_K_FACTOR_7>{QTD_PULSOS_K_FACTOR_7}</QTD_PULSOS_K_FACTOR_7>
			<QTD_PULSOS_K_FACTOR_8>{QTD_PULSOS_K_FACTOR_8}</QTD_PULSOS_K_FACTOR_8>
			<QTD_PULSOS_K_FACTOR_9>{QTD_PULSOS_K_FACTOR_9}</QTD_PULSOS_K_FACTOR_9>
			<QTD_PULSOS_K_FACTOR_10>{QTD_PULSOS_K_FACTOR_10}</QTD_PULSOS_K_FACTOR_10>
			<QTD_PULSOS_K_FACTOR_11>{QTD_PULSOS_K_FACTOR_11}</QTD_PULSOS_K_FACTOR_11>
			<QTD_PULSOS_K_FACTOR_12>{QTD_PULSOS_K_FACTOR_12}</QTD_PULSOS_K_FACTOR_12>
			<ICE_CUTOFF>{ICE_CUTOFF}</ICE_CUTOFF>
			<ICE_LIMITE_SPRR_ALARME>{ICE_LIMITE_SPRR_ALARME}</ICE_LIMITE_SPRR_ALARME>
			<ICE_LIMITE_INFRR_ALARME>{ICE_LIMITE_INFRR_ALARME}</ICE_LIMITE_INFRR_ALARME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			</ELEMENTO_PRIMARIO>
		</LISTA_ELEMENTO_PRIMARIO>
		<LISTA_INSTRUMENTO_PRESSAO>
			<INSTRUMENTO_PRESSAO>
			<NUM_SERIE>{NUM_SERIE}</NUM_SERIE>
			<MED_PRSO_LIMITE_SPRR_ALRME>{MED_PRSO_LIMITE_SPRR_ALRME}</MED_PRSO_LIMITE_SPRR_ALRME>
			<MED_PRSO_LMTE_INFRR_ALRME>{MED_PRSO_LMTE_INFRR_ALRME}</MED_PRSO_LMTE_INFRR_ALRME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			<MED_PRSO_ADOTADA_FALHA>{MED_PRSO_ADOTADA_FALHA}</MED_PRSO_ADOTADA_FALHA>
			<DSC_ESTADO_INSNO_CASO_FALHA>{DSC_ESTADO_INSNO_CASO_FALHA}</DSC_ESTADO_INSNO_CASO_FALHA>
			<IND_TIPO_PRESSAO_CONSIDERADA>{IND_TIPO_PRESSAO_CONSIDERADA}</IND_TIPO_PRESSAO_CONSIDERADA>
			</INSTRUMENTO_PRESSAO>
		</LISTA_INSTRUMENTO_PRESSAO>
		<LISTA_INSTRUMENTO_TEMPERATURA>
			<INSTRUMENTO_TEMPERATURA>
			<NUM_SERIE>{NUM_SERIE}</NUM_SERIE>
			<MED_TMPTA_SPRR_ALARME>{MED_TMPTA_SPRR_ALARME}</MED_TMPTA_SPRR_ALARME>
			<MED_TMPTA_INFRR_ALRME>{MED_TMPTA_INFRR_ALRME}</MED_TMPTA_INFRR_ALRME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			<MED_TMPTA_ADTTA_FALHA>{MED_TMPTA_ADTTA_FALHA}</MED_TMPTA_ADTTA_FALHA>
			<DSC_ESTADO_INSTRUMENTO_FALHA>{DSC_ESTADO_INSTRUMENTO_FALHA}</DSC_ESTADO_INSTRUMENTO_FALHA>
			</INSTRUMENTO_TEMPERATURA>
		</LISTA_INSTRUMENTO_TEMPERATURA>
		<LISTA_PRODUCAO>
			<PRODUCAO>
			<DHA_INICIO_PERIODO_MEDICAO>{DHA_INICIO_PERIODO_MEDICAO}</DHA_INICIO_PERIODO_MEDICAO>
			<DHA_FIM_PERIODO_MEDICAO>{DHA_FIM_PERIODO_MEDICAO}</DHA_FIM_PERIODO_MEDICAO>
			<ICE_DENSIDADADE_RELATIVA>{ICE_DENSIDADADE_RELATIVA}</ICE_DENSIDADADE_RELATIVA>
			<ICE_CORRECAO_BSW>{ICE_CORRECAO_BSW}</ICE_CORRECAO_BSW>
			<ICE_CORRECAO_PRESSAO_LIQUIDO>{ICE_CORRECAO_PRESSAO_LIQUIDO}</ICE_CORRECAO_PRESSAO_LIQUIDO>
			<ICE_CRRCO_TEMPERATURA_LIQUIDO>{ICE_CRRCO_TEMPERATURA_LIQUIDO}</ICE_CRRCO_TEMPERATURA_LIQUIDO>
			<MED_PRESSAO_ESTATICA>{MED_PRESSAO_ESTATICA}</MED_PRESSAO_ESTATICA>
			<MED_TMPTA_FLUIDO>{MED_TMPTA_FLUIDO}</MED_TMPTA_FLUIDO>
			<MED_VOLUME_BRTO_CRRGO_MVMDO>{MED_VOLUME_BRTO_CRRGO_MVMDO}</MED_VOLUME_BRTO_CRRGO_MVMDO>
			<MED_VOLUME_BRUTO_MVMDO>{MED_VOLUME_BRUTO_MVMDO}</MED_VOLUME_BRUTO_MVMDO>
			<MED_VOLUME_LIQUIDO_MVMDO>{MED_VOLUME_LIQUIDO_MVMDO}</MED_VOLUME_LIQUIDO_MVMDO>
			<MED_VOLUME_TTLZO_FIM_PRDO>{MED_VOLUME_TTLZO_FIM_PRDO}</MED_VOLUME_TTLZO_FIM_PRDO>
			<MED_VOLUME_TTLZO_INCO_PRDO>{MED_VOLUME_TTLZO_INCO_PRDO}</MED_VOLUME_TTLZO_INCO_PRDO>
			</PRODUCAO>
		</LISTA_PRODUCAO>
		</DADOS_BASICOS>
	</LISTA_DADOS_BASICOS>
</a001>
```

<details>
<summary><strong>Matriz de campos — DADOS_BASICOS@attributes</strong> (3 campos)</summary>

| Campo                       | Natureza   |   Tamanho | Obrigatório   | Unidade   | Descrição                                                                                                                        |
|:----------------------------|:-----------|----------:|:--------------|:----------|:---------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE_ELEMENTO_PRIMARIO | TEXTO      |        30 | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). |
| COD_INSTALACAO              | NATURAL    |        10 | SIM           | -         | Código da instalação onde o ponto de medição se encontra                                                                         |
| COD_TAG_PONTO_MEDICAO       | TEXTO      |        20 | SIM           | -         | Tag do ponto de medição conforme cadastro do SFP.                                                                                |

</details>

<details>
<summary><strong>Matriz de campos — CONFIGURACAO_CV</strong> (7 campos)</summary>

| Campo                      | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                         |
|:---------------------------|:-----------|:----------|:--------------|:----------|:------------------------------------------------------------------|
| NUM_SERIE_COMPUTADOR_VAZAO | TEXTO      | 30        | SIM           | -         | Número de série do computador de vazão em questão.                |
| DHA_COLETA                 | DATA_HORA  | 19        | SIM           | -         | Momento em que os dados do computador de vazão foram registrados. |
| MED_TEMPERATURA            | RACIONAL   | (3,2)     | SIM           | °C        | Temperatura para qual os volumes estão sendo corrigidos.          |
| MED_PRESSAO_ATMSA          | RACIONAL   | (3,3)     | SIM           | kPa       | Valor da pressão atmosférica local no ponto de medição.           |
| MED_PRESSAO_RFRNA          | RACIONAL   | (3,3)     | SIM           | kPa       | Pressão para qual os volumes estão sendo corrigidos.              |
| MED_DENSIDADE_RELATIVA     | RACIONAL   | (2,8)     | NÃO           | -         | Desnsidade relativa do óleo.                                      |
| DSC_VERSAO_SOFTWARE        | TEXTO      | 30        | SIM           | -         | Versão do software do computador de vazão.                        |

</details>

<details>
<summary><strong>Matriz de campos — ELEMENTO_PRIMARIO</strong> (64 campos)</summary>

| Campo                      | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                     |
|:---------------------------|:-----------|:----------|:--------------|:----------|:------------------------------------------------------------------------------------------------------------------------------|
| ICE_METER_FACTOR_1         | RACIONAL   | (1,5)     | SIM           | -         | Meter Factor associado ao ponto 1 ou no caso de se adotar um único Meter Factor.                                              |
| ICE_METER_FACTOR_2         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 2.                                                                                            |
| ICE_METER_FACTOR_3         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 3.                                                                                            |
| ICE_METER_FACTOR_4         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 4.                                                                                            |
| ICE_METER_FACTOR_5         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 5.                                                                                            |
| ICE_METER_FACTOR_6         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 6.                                                                                            |
| ICE_METER_FACTOR_7         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 7.                                                                                            |
| ICE_METER_FACTOR_8         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 8.                                                                                            |
| ICE_METER_FACTOR_9         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 9.                                                                                            |
| ICE_METER_FACTOR_10        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 10.                                                                                           |
| ICE_METER_FACTOR_11        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 11.                                                                                           |
| ICE_METER_FACTOR_12        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 12.                                                                                           |
| ICE_METER_FACTOR_13        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 13.                                                                                           |
| ICE_METER_FACTOR_14        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 14.                                                                                           |
| ICE_METER_FACTOR_15        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 15.                                                                                           |
| QTD_PULSOS_METER_FACTOR_1  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 1 ou zero no caso de se utilizar apenas um Meter Factor. |
| QTD_PULSOS_METER_FACTOR_2  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 2.                                                       |
| QTD_PULSOS_METER_FACTOR_3  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 3.                                                       |
| QTD_PULSOS_METER_FACTOR_4  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 4.                                                       |
| QTD_PULSOS_METER_FACTOR_5  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 5.                                                       |
| QTD_PULSOS_METER_FACTOR_6  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 6.                                                       |
| QTD_PULSOS_METER_FACTOR_7  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 7.                                                       |
| QTD_PULSOS_METER_FACTOR_8  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 8.                                                       |
| QTD_PULSOS_METER_FACTOR_9  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 9.                                                       |
| QTD_PULSOS_METER_FACTOR_10 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 10.                                                      |
| QTD_PULSOS_METER_FACTOR_11 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 11.                                                      |
| QTD_PULSOS_METER_FACTOR_12 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 12.                                                      |
| QTD_PULSOS_METER_FACTOR_13 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 13.                                                      |
| QTD_PULSOS_METER_FACTOR_14 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 14.                                                      |
| QTD_PULSOS_METER_FACTOR_15 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 15.                                                      |
| ICE_K_FACTOR_1             | RACIONAL   | (8,2)     | SIM           | Pulso/m³  | K Factor associado ao ponto 1 ou no caso de se adotar um único K Factor.                                                      |
| ICE_K_FACTOR_2             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 2.                                                                                                |
| ICE_K_FACTOR_3             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 3.                                                                                                |
| ICE_K_FACTOR_4             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 4.                                                                                                |
| ICE_K_FACTOR_5             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 5.                                                                                                |
| ICE_K_FACTOR_6             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 6.                                                                                                |
| ICE_K_FACTOR_7             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 7.                                                                                                |
| ICE_K_FACTOR_8             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 8.                                                                                                |
| ICE_K_FACTOR_9             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 9.                                                                                                |
| ICE_K_FACTOR_10            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 10.                                                                                               |
| ICE_K_FACTOR_11            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 11.                                                                                               |
| ICE_K_FACTOR_12            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 12.                                                                                               |
| ICE_K_FACTOR_13            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 13.                                                                                               |
| ICE_K_FACTOR_14            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 14.                                                                                               |
| ICE_K_FACTOR_15            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 15.                                                                                               |
| QTD_PULSOS_K_FACTOR_1      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 1 ou zero no caso de se utilizar apenas um K Factor.         |
| QTD_PULSOS_K_FACTOR_2      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 2.                                                           |
| QTD_PULSOS_K_FACTOR_3      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 3.                                                           |
| QTD_PULSOS_K_FACTOR_4      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 4.                                                           |
| QTD_PULSOS_K_FACTOR_5      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 5.                                                           |
| QTD_PULSOS_K_FACTOR_6      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 6.                                                           |
| QTD_PULSOS_K_FACTOR_7      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 7.                                                           |
| QTD_PULSOS_K_FACTOR_8      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 8.                                                           |
| QTD_PULSOS_K_FACTOR_9      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 9.                                                           |
| QTD_PULSOS_K_FACTOR_10     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 10.                                                          |
| QTD_PULSOS_K_FACTOR_11     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 11.                                                          |
| QTD_PULSOS_K_FACTOR_12     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 12.                                                          |
| QTD_PULSOS_K_FACTOR_13     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 13.                                                          |
| QTD_PULSOS_K_FACTOR_14     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 14.                                                          |
| QTD_PULSOS_K_FACTOR_15     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 15.                                                          |
| ICE_CUTOFF                 | RACIONAL   | (6,2)     | SIM           | m³/h      | Cutoff do Elemento Primário. Limite inferior a partir do qual o medidor passa a computar os volumes.                          |
| ICE_LIMITE_SPRR_ALARME     | RACIONAL   | (6,2)     | SIM           | m³/h      | Limite superior para o computador de vazão registrar alarme.                                                                  |
| ICE_LIMITE_INFRR_ALARME    | RACIONAL   | (6,2)     | SIM           | m³/h      | Limite inferior para o computador de vazão registrar alarme.                                                                  |
| IND_HABILITACAO_ALARME     | SIM_NAO    | 1         | SIM           | -         | Informação se o Alarme de vazão está habilitado ou não.                                                                       |

</details>

<details>
<summary><strong>Matriz de campos — INSTRUMENTO_PRESSAO</strong> (7 campos)</summary>

| Campo                        | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                        |
|:-----------------------------|:-----------|:----------|:--------------|:----------|:---------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE                    | TEXTO      | 30        | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). |
| MED_PRSO_LIMITE_SPRR_ALRME   | RACIONAL   | (6,3)     | SIM           | kPa       | Limite superior para o computador de vazão registrar alarme.                                                                     |
| MED_PRSO_LMTE_INFRR_ALRME    | RACIONAL   | (6,3)     | SIM           | kPa       | limite inferior para o computador de vazão registrar alarme.                                                                     |
| IND_HABILITACAO_ALARME       | SIM_NAO    | 1         | SIM           | -         | Informação se o Alarme de Pressão está habilitado ou não.                                                                        |
| MED_PRSO_ADOTADA_FALHA       | RACIONAL   | (6,3)     | SIM           | kPa       | Pressão a ser adotada em caso de falha do instrumento.                                                                           |
| DSC_ESTADO_INSNO_CASO_FALHA  | TEXTO      | 50        | SIM           | -         | Informação da ação tomada em caso de falha.                                                                                      |
| IND_TIPO_PRESSAO_CONSIDERADA | TEXTO      | 1         | SIM           | -         | Informação se a pressão está sendo considerada como absoluta ou manométrica. Os valores possíveis são A=absoluta, M=Manométrica. |

</details>

<details>
<summary><strong>Matriz de campos — INSTRUMENTO_TEMPERATURA</strong> (9 campos)</summary>

| Campo                        | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                        |
|:-----------------------------|:-----------|:----------|:--------------|:----------|:---------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE                    | TEXTO      | 30        | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). |
| MED_TMPTA_SPRR_ALARME        | RACIONAL   | (3,2)     | SIM           | °C        | Limite superior para o computador de vazão registrar alarme.                                                                     |
| MED_TMPTA_INFRR_ALRME        | RACIONAL   | (3,2)     | SIM           | °C        | Limite inferior para o computador de vazão registrar alarme.                                                                     |
| IND_HABILITACAO_ALARME       | SIM_NAO    | 1         | SIM           | -         | Informação se o Alarme de temperatura está habilitado ou não.                                                                    |
| MED_TMPTA_ADTTA_FALHA        | RACIONAL   | (3,2)     | SIM           | °C        | Temperatura a ser adotada em caso de falha do instrumento.                                                                       |
| DSC_ESTADO_INSTRUMENTO_FALHA | TEXTO      | 50        | SIM           | -         | Informação da ação tomada em caso de falha.                                                                                      |
| PCT_LIMITE_SUPERIOR          | RACIONAL   | (3,3)     | NÃO           | -         | limite superior para o computador de vazão registrar alarme (%).                                                                 |
| PCT_LIMITE_INFERIOR          | RACIONAL   | (3,3)     | NÃO           | -         | limite inferior para o computador de vazão registrar alarme (%).                                                                 |
| PCT_ADOTADO_CASO_FALHA       | RACIONAL   | (3,3)     | NÃO           | -         | Densidade a ser adotado em caso de falha do instrumento (%).                                                                     |

</details>

<details>
<summary><strong>Matriz de campos — PRODUCAO</strong> (13 campos)</summary>

| Campo                         | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                                     |
|:------------------------------|:-----------|:----------|:--------------|:----------|:----------------------------------------------------------------------------------------------------------------------------------------------|
| DHA_INICIO_PERIODO_MEDICAO    | DATA_HORA  | 19        | SIM           | -         | Data e Hora inicial do período a que se refere o volume considerado.                                                                          |
| DHA_FIM_PERIODO_MEDICAO       | DATA_HORA  | 19        | SIM           | -         | Data e Hora final do período a que se refere o volume considerado.                                                                            |
| ICE_DENSIDADADE_RELATIVA      | RACIONAL   | (2,8)     | NÃO           | -         | Média ponderada da densidade relativa medida no periodo.                                                                                      |
| ICE_CORRECAO_BSW              | RACIONAL   | (2,8)     | NÃO           | -         | Média ponderada do fator de correção do volume de água e sedimentos.                                                                          |
| ICE_CORRECAO_PRESSAO_LIQUIDO  | RACIONAL   | (2,8)     | SIM           | -         | Média ponderada do fator de correção do líquido pela pressão (CPL).                                                                           |
| ICE_CRRCO_TEMPERATURA_LIQUIDO | RACIONAL   | (2,8)     | SIM           | -         | Média ponderada do fator de correção do líquido pela temperatura (CTL).                                                                       |
| MED_PRESSAO_ESTATICA          | RACIONAL   | (6,6)     | SIM           | kPa       | Média ponderada da pressão estática no periodo.                                                                                               |
| MED_TMPTA_FLUIDO              | RACIONAL   | (3,5)     | SIM           | °C        | Média ponderada da temperatura no periodo.                                                                                                    |
| MED_VOLUME_BRTO_CRRGO_MVMDO   | RACIONAL   | (6,5)     | SIM           | m³        | Volume de petróleo com água movimentado no periodo entre a data e hora de abertura e a data e hora de fechamento nas condições de referência. |
| MED_VOLUME_BRUTO_MVMDO        | RACIONAL   | (6,5)     | SIM           | m³        | Volume de petróleo com água movimentado no periodo entre a data e hora de abertura e a data e hora de fechamento nas condições de operação.   |
| MED_VOLUME_LIQUIDO_MVMDO      | RACIONAL   | (6,5)     | SIM           | m³        | Volume de petróleo sem água movimentado no periodo entre a data e hora de abertura e a data e hora de fechamento nas condições de referência. |
| MED_VOLUME_TTLZO_FIM_PRDO     | RACIONAL   | (10,2)    | SIM           | m³        | Volume indicado pelo totalizador não resetável no fim do periodo.                                                                             |
| MED_VOLUME_TTLZO_INCO_PRDO    | RACIONAL   | (10,2)    | SIM           | m³        | Volume indicado pelo totalizador não resetável no início do periodo.                                                                          |

</details>

### 5.2 Tipo 002 — Gás Linear (PMGL)
**Documento de referência:** PMGL - PONTOS DE MEDIÇÃO PARA GÁS LINEAR.pdf

**Raiz:** `<a002>`  
**Itens por arquivo (evidência do sample):** `3` blocos `<DADOS_BASICOS>`

**Atributos de `<DADOS_BASICOS>` (obrigatórios no sample):** `COD_INSTALACAO, COD_TAG_PONTO_MEDICAO, NUM_SERIE_ELEMENTO_PRIMARIO`  
**Exemplo (do sample):** `{'NUM_SERIE_ELEMENTO_PRIMARIO': '1128U-23/1128D-23', 'COD_INSTALACAO': '38480', 'COD_TAG_PONTO_MEDICAO': '43FT0102'}`

**Sub-blocos dentro de `<DADOS_BASICOS>` (ordem observada):**
- `LISTA_CONFIGURACAO_CV`
- `LISTA_ELEMENTO_PRIMARIO`
- `LISTA_INSTRUMENTO_PRESSAO`
- `LISTA_INSTRUMENTO_TEMPERATURA`
- `LISTA_PRODUCAO`

**XML mínimo (esqueleto):**

```xml
<?xml version="1.0" encoding="iso-8859-1"?>
<a002>
	<LISTA_DADOS_BASICOS>
		<DADOS_BASICOS COD_INSTALACAO="{COD_INSTALACAO}" COD_TAG_PONTO_MEDICAO="{COD_TAG_PONTO_MEDICAO}" NUM_SERIE_ELEMENTO_PRIMARIO="{NUM_SERIE_ELEMENTO_PRIMARIO}">
		<LISTA_CONFIGURACAO_CV>
			<CONFIGURACAO_CV>
			<NUM_SERIE_COMPUTADOR_VAZAO>{NUM_SERIE_COMPUTADOR_VAZAO}</NUM_SERIE_COMPUTADOR_VAZAO>
			<DHA_COLETA>{DHA_COLETA}</DHA_COLETA>
			<MED_TEMPERATURA>{MED_TEMPERATURA}</MED_TEMPERATURA>
			<MED_PRESSAO_ATMSA>{MED_PRESSAO_ATMSA}</MED_PRESSAO_ATMSA>
			<MED_PRESSAO_RFRNA>{MED_PRESSAO_RFRNA}</MED_PRESSAO_RFRNA>
			<MED_DENSIDADE_RELATIVA>{MED_DENSIDADE_RELATIVA}</MED_DENSIDADE_RELATIVA>
			<DSC_NORMA_UTILIZADA_CALCULO>{DSC_NORMA_UTILIZADA_CALCULO}</DSC_NORMA_UTILIZADA_CALCULO>
			<PCT_CROMATOGRAFIA_NITROGENIO>{PCT_CROMATOGRAFIA_NITROGENIO}</PCT_CROMATOGRAFIA_NITROGENIO>
			<PCT_CROMATOGRAFIA_CO2>{PCT_CROMATOGRAFIA_CO2}</PCT_CROMATOGRAFIA_CO2>
			<PCT_CROMATOGRAFIA_METANO>{PCT_CROMATOGRAFIA_METANO}</PCT_CROMATOGRAFIA_METANO>
			<PCT_CROMATOGRAFIA_ETANO>{PCT_CROMATOGRAFIA_ETANO}</PCT_CROMATOGRAFIA_ETANO>
			<PCT_CROMATOGRAFIA_PROPANO>{PCT_CROMATOGRAFIA_PROPANO}</PCT_CROMATOGRAFIA_PROPANO>
			<PCT_CROMATOGRAFIA_N_BUTANO>{PCT_CROMATOGRAFIA_N_BUTANO}</PCT_CROMATOGRAFIA_N_BUTANO>
			<PCT_CROMATOGRAFIA_I_BUTANO>{PCT_CROMATOGRAFIA_I_BUTANO}</PCT_CROMATOGRAFIA_I_BUTANO>
			<PCT_CROMATOGRAFIA_N_PENTANO>{PCT_CROMATOGRAFIA_N_PENTANO}</PCT_CROMATOGRAFIA_N_PENTANO>
			<PCT_CROMATOGRAFIA_I_PENTANO>{PCT_CROMATOGRAFIA_I_PENTANO}</PCT_CROMATOGRAFIA_I_PENTANO>
			<PCT_CROMATOGRAFIA_HEXANO>{PCT_CROMATOGRAFIA_HEXANO}</PCT_CROMATOGRAFIA_HEXANO>
			<PCT_CROMATOGRAFIA_HEPTANO>{PCT_CROMATOGRAFIA_HEPTANO}</PCT_CROMATOGRAFIA_HEPTANO>
			<PCT_CROMATOGRAFIA_OCTANO>{PCT_CROMATOGRAFIA_OCTANO}</PCT_CROMATOGRAFIA_OCTANO>
			<PCT_CROMATOGRAFIA_NONANO>{PCT_CROMATOGRAFIA_NONANO}</PCT_CROMATOGRAFIA_NONANO>
			<PCT_CROMATOGRAFIA_DECANO>{PCT_CROMATOGRAFIA_DECANO}</PCT_CROMATOGRAFIA_DECANO>
			<PCT_CROMATOGRAFIA_H2S>{PCT_CROMATOGRAFIA_H2S}</PCT_CROMATOGRAFIA_H2S>
			<PCT_CROMATOGRAFIA_AGUA>{PCT_CROMATOGRAFIA_AGUA}</PCT_CROMATOGRAFIA_AGUA>
			<PCT_CROMATOGRAFIA_HELIO>{PCT_CROMATOGRAFIA_HELIO}</PCT_CROMATOGRAFIA_HELIO>
			<PCT_CROMATOGRAFIA_OXIGENIO>{PCT_CROMATOGRAFIA_OXIGENIO}</PCT_CROMATOGRAFIA_OXIGENIO>
			<PCT_CROMATOGRAFIA_CO>{PCT_CROMATOGRAFIA_CO}</PCT_CROMATOGRAFIA_CO>
			<PCT_CROMATOGRAFIA_HIDROGENIO>{PCT_CROMATOGRAFIA_HIDROGENIO}</PCT_CROMATOGRAFIA_HIDROGENIO>
			<PCT_CROMATOGRAFIA_ARGONIO>{PCT_CROMATOGRAFIA_ARGONIO}</PCT_CROMATOGRAFIA_ARGONIO>
			<DSC_VERSAO_SOFTWARE>{DSC_VERSAO_SOFTWARE}</DSC_VERSAO_SOFTWARE>
			</CONFIGURACAO_CV>
		</LISTA_CONFIGURACAO_CV>
		<LISTA_ELEMENTO_PRIMARIO>
			<ELEMENTO_PRIMARIO>
			<ICE_METER_FACTOR_1>{ICE_METER_FACTOR_1}</ICE_METER_FACTOR_1>
			<ICE_METER_FACTOR_2>{ICE_METER_FACTOR_2}</ICE_METER_FACTOR_2>
			<ICE_METER_FACTOR_3>{ICE_METER_FACTOR_3}</ICE_METER_FACTOR_3>
			<ICE_METER_FACTOR_4>{ICE_METER_FACTOR_4}</ICE_METER_FACTOR_4>
			<ICE_METER_FACTOR_5>{ICE_METER_FACTOR_5}</ICE_METER_FACTOR_5>
			<ICE_METER_FACTOR_6>{ICE_METER_FACTOR_6}</ICE_METER_FACTOR_6>
			<ICE_METER_FACTOR_7>{ICE_METER_FACTOR_7}</ICE_METER_FACTOR_7>
			<ICE_METER_FACTOR_8>{ICE_METER_FACTOR_8}</ICE_METER_FACTOR_8>
			<ICE_METER_FACTOR_9>{ICE_METER_FACTOR_9}</ICE_METER_FACTOR_9>
			<ICE_METER_FACTOR_10>{ICE_METER_FACTOR_10}</ICE_METER_FACTOR_10>
			<ICE_METER_FACTOR_11>{ICE_METER_FACTOR_11}</ICE_METER_FACTOR_11>
			<ICE_METER_FACTOR_12>{ICE_METER_FACTOR_12}</ICE_METER_FACTOR_12>
			<QTD_PULSOS_METER_FACTOR_1>{QTD_PULSOS_METER_FACTOR_1}</QTD_PULSOS_METER_FACTOR_1>
			<QTD_PULSOS_METER_FACTOR_2>{QTD_PULSOS_METER_FACTOR_2}</QTD_PULSOS_METER_FACTOR_2>
			<QTD_PULSOS_METER_FACTOR_3>{QTD_PULSOS_METER_FACTOR_3}</QTD_PULSOS_METER_FACTOR_3>
			<QTD_PULSOS_METER_FACTOR_4>{QTD_PULSOS_METER_FACTOR_4}</QTD_PULSOS_METER_FACTOR_4>
			<QTD_PULSOS_METER_FACTOR_5>{QTD_PULSOS_METER_FACTOR_5}</QTD_PULSOS_METER_FACTOR_5>
			<QTD_PULSOS_METER_FACTOR_6>{QTD_PULSOS_METER_FACTOR_6}</QTD_PULSOS_METER_FACTOR_6>
			<QTD_PULSOS_METER_FACTOR_7>{QTD_PULSOS_METER_FACTOR_7}</QTD_PULSOS_METER_FACTOR_7>
			<QTD_PULSOS_METER_FACTOR_8>{QTD_PULSOS_METER_FACTOR_8}</QTD_PULSOS_METER_FACTOR_8>
			<QTD_PULSOS_METER_FACTOR_9>{QTD_PULSOS_METER_FACTOR_9}</QTD_PULSOS_METER_FACTOR_9>
			<QTD_PULSOS_METER_FACTOR_10>{QTD_PULSOS_METER_FACTOR_10}</QTD_PULSOS_METER_FACTOR_10>
			<QTD_PULSOS_METER_FACTOR_11>{QTD_PULSOS_METER_FACTOR_11}</QTD_PULSOS_METER_FACTOR_11>
			<QTD_PULSOS_METER_FACTOR_12>{QTD_PULSOS_METER_FACTOR_12}</QTD_PULSOS_METER_FACTOR_12>
			<ICE_K_FACTOR_1>{ICE_K_FACTOR_1}</ICE_K_FACTOR_1>
			<ICE_K_FACTOR_2>{ICE_K_FACTOR_2}</ICE_K_FACTOR_2>
			<ICE_K_FACTOR_3>{ICE_K_FACTOR_3}</ICE_K_FACTOR_3>
			<ICE_K_FACTOR_4>{ICE_K_FACTOR_4}</ICE_K_FACTOR_4>
			<ICE_K_FACTOR_5>{ICE_K_FACTOR_5}</ICE_K_FACTOR_5>
			<ICE_K_FACTOR_6>{ICE_K_FACTOR_6}</ICE_K_FACTOR_6>
			<ICE_K_FACTOR_7>{ICE_K_FACTOR_7}</ICE_K_FACTOR_7>
			<ICE_K_FACTOR_8>{ICE_K_FACTOR_8}</ICE_K_FACTOR_8>
			<ICE_K_FACTOR_9>{ICE_K_FACTOR_9}</ICE_K_FACTOR_9>
			<ICE_K_FACTOR_10>{ICE_K_FACTOR_10}</ICE_K_FACTOR_10>
			<ICE_K_FACTOR_11>{ICE_K_FACTOR_11}</ICE_K_FACTOR_11>
			<ICE_K_FACTOR_12>{ICE_K_FACTOR_12}</ICE_K_FACTOR_12>
			<ICE_K_FACTOR_13>{ICE_K_FACTOR_13}</ICE_K_FACTOR_13>
			<ICE_K_FACTOR_14>{ICE_K_FACTOR_14}</ICE_K_FACTOR_14>
			<ICE_K_FACTOR_15>{ICE_K_FACTOR_15}</ICE_K_FACTOR_15>
			<QTD_PULSOS_K_FACTOR_1>{QTD_PULSOS_K_FACTOR_1}</QTD_PULSOS_K_FACTOR_1>
			<QTD_PULSOS_K_FACTOR_2>{QTD_PULSOS_K_FACTOR_2}</QTD_PULSOS_K_FACTOR_2>
			<QTD_PULSOS_K_FACTOR_3>{QTD_PULSOS_K_FACTOR_3}</QTD_PULSOS_K_FACTOR_3>
			<QTD_PULSOS_K_FACTOR_4>{QTD_PULSOS_K_FACTOR_4}</QTD_PULSOS_K_FACTOR_4>
			<QTD_PULSOS_K_FACTOR_5>{QTD_PULSOS_K_FACTOR_5}</QTD_PULSOS_K_FACTOR_5>
			<QTD_PULSOS_K_FACTOR_6>{QTD_PULSOS_K_FACTOR_6}</QTD_PULSOS_K_FACTOR_6>
			<QTD_PULSOS_K_FACTOR_7>{QTD_PULSOS_K_FACTOR_7}</QTD_PULSOS_K_FACTOR_7>
			<QTD_PULSOS_K_FACTOR_8>{QTD_PULSOS_K_FACTOR_8}</QTD_PULSOS_K_FACTOR_8>
			<QTD_PULSOS_K_FACTOR_9>{QTD_PULSOS_K_FACTOR_9}</QTD_PULSOS_K_FACTOR_9>
			<QTD_PULSOS_K_FACTOR_10>{QTD_PULSOS_K_FACTOR_10}</QTD_PULSOS_K_FACTOR_10>
			<QTD_PULSOS_K_FACTOR_11>{QTD_PULSOS_K_FACTOR_11}</QTD_PULSOS_K_FACTOR_11>
			<QTD_PULSOS_K_FACTOR_12>{QTD_PULSOS_K_FACTOR_12}</QTD_PULSOS_K_FACTOR_12>
			<QTD_PULSOS_K_FACTOR_13>{QTD_PULSOS_K_FACTOR_13}</QTD_PULSOS_K_FACTOR_13>
			<QTD_PULSOS_K_FACTOR_14>{QTD_PULSOS_K_FACTOR_14}</QTD_PULSOS_K_FACTOR_14>
			<QTD_PULSOS_K_FACTOR_15>{QTD_PULSOS_K_FACTOR_15}</QTD_PULSOS_K_FACTOR_15>
			<ICE_CUTOFF>{ICE_CUTOFF}</ICE_CUTOFF>
			<ICE_LIMITE_SPRR_ALARME>{ICE_LIMITE_SPRR_ALARME}</ICE_LIMITE_SPRR_ALARME>
			<ICE_LIMITE_INFRR_ALARME>{ICE_LIMITE_INFRR_ALARME}</ICE_LIMITE_INFRR_ALARME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			</ELEMENTO_PRIMARIO>
		</LISTA_ELEMENTO_PRIMARIO>
		<LISTA_INSTRUMENTO_PRESSAO>
			<INSTRUMENTO_PRESSAO>
			<NUM_SERIE>{NUM_SERIE}</NUM_SERIE>
			<MED_PRSO_LIMITE_SPRR_ALRME>{MED_PRSO_LIMITE_SPRR_ALRME}</MED_PRSO_LIMITE_SPRR_ALRME>
			<MED_PRSO_LMTE_INFRR_ALRME>{MED_PRSO_LMTE_INFRR_ALRME}</MED_PRSO_LMTE_INFRR_ALRME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			<MED_PRSO_ADOTADA_FALHA>{MED_PRSO_ADOTADA_FALHA}</MED_PRSO_ADOTADA_FALHA>
			<DSC_ESTADO_INSNO_CASO_FALHA>{DSC_ESTADO_INSNO_CASO_FALHA}</DSC_ESTADO_INSNO_CASO_FALHA>
			<IND_TIPO_PRESSAO_CONSIDERADA>{IND_TIPO_PRESSAO_CONSIDERADA}</IND_TIPO_PRESSAO_CONSIDERADA>
			</INSTRUMENTO_PRESSAO>
		</LISTA_INSTRUMENTO_PRESSAO>
		<LISTA_INSTRUMENTO_TEMPERATURA>
			<INSTRUMENTO_TEMPERATURA>
			<NUM_SERIE>{NUM_SERIE}</NUM_SERIE>
			<MED_TMPTA_SPRR_ALARME>{MED_TMPTA_SPRR_ALARME}</MED_TMPTA_SPRR_ALARME>
			<MED_TMPTA_INFRR_ALRME>{MED_TMPTA_INFRR_ALRME}</MED_TMPTA_INFRR_ALRME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			<MED_TMPTA_ADTTA_FALHA>{MED_TMPTA_ADTTA_FALHA}</MED_TMPTA_ADTTA_FALHA>
			<DSC_ESTADO_INSTRUMENTO_FALHA>{DSC_ESTADO_INSTRUMENTO_FALHA}</DSC_ESTADO_INSTRUMENTO_FALHA>
			</INSTRUMENTO_TEMPERATURA>
		</LISTA_INSTRUMENTO_TEMPERATURA>
		<LISTA_PRODUCAO>
			<PRODUCAO>
			<DHA_INICIO_PERIODO_MEDICAO>{DHA_INICIO_PERIODO_MEDICAO}</DHA_INICIO_PERIODO_MEDICAO>
			<DHA_FIM_PERIODO_MEDICAO>{DHA_FIM_PERIODO_MEDICAO}</DHA_FIM_PERIODO_MEDICAO>
			<ICE_DENSIDADE_RELATIVA>{ICE_DENSIDADE_RELATIVA}</ICE_DENSIDADE_RELATIVA>
			<MED_PRESSAO_ESTATICA>{MED_PRESSAO_ESTATICA}</MED_PRESSAO_ESTATICA>
			<MED_TEMPERATURA>{MED_TEMPERATURA}</MED_TEMPERATURA>
			<PRZ_DURACAO_FLUXO_EFETIVO>{PRZ_DURACAO_FLUXO_EFETIVO}</PRZ_DURACAO_FLUXO_EFETIVO>
			<MED_BRUTO_MOVIMENTADO>{MED_BRUTO_MOVIMENTADO}</MED_BRUTO_MOVIMENTADO>
			<MED_CORRIGIDO_MVMDO>{MED_CORRIGIDO_MVMDO}</MED_CORRIGIDO_MVMDO>
			</PRODUCAO>
		</LISTA_PRODUCAO>
		</DADOS_BASICOS>
	</LISTA_DADOS_BASICOS>
</a002>
```

<details>
<summary><strong>Matriz de campos — DADOS_BASICOS@attributes</strong> (3 campos)</summary>

| Campo                       | Natureza   |   Tamanho | Obrigatório   | Unidade   | Descrição                                                                                                                        |
|:----------------------------|:-----------|----------:|:--------------|:----------|:---------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE_ELEMENTO_PRIMARIO | TEXTO      |        30 | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). |
| COD_INSTALACAO              | NATURAL    |        10 | SIM           | -         | Código da instalação onde o ponto de medição se encontra                                                                         |
| COD_TAG_PONTO_MEDICAO       | TEXTO      |        20 | SIM           | -         | Tag do ponto de medição conforme cadastro do SFP.                                                                                |

</details>

<details>
<summary><strong>Matriz de campos — CONFIGURACAO_CV</strong> (29 campos)</summary>

| Campo                        | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                     |
|:-----------------------------|:-----------|:----------|:--------------|:----------|:--------------------------------------------------------------|
| NUM_SERIE_COMPUTADOR_VAZAO   | TEXTO      | 30        | SIM           | -         | Número de série do computador de vazão em questão.            |
| DHA_COLETA                   | DATA_HORA  | 19        | SIM           | -         | Data e hora que correspondem a configuração em questão.       |
| MED_TEMPERATURA              | RACIONAL   | (3,2)     | SIM           | °C        | Temperatura para qual os volumes estão sendo corrigidos.      |
| MED_PRESSAO_ATMSA            | RACIONAL   | (3,3)     | SIM           | kPa       | Valor da pressão atmosférica local no ponto de medição.       |
| MED_PRESSAO_RFRNA            | RACIONAL   | (3,3)     | SIM           | kPa       | Pressão para qual os volumes estão sendo corrigidos.          |
| MED_DENSIDADE_RELATIVA       | RACIONAL   | (2,8)     | SIM           | -         | Densidade Relativa utilizado no calculo de volume do fluido.  |
| DSC_NORMA_UTILIZADA_CALCULO  | TEXTO      | 50        | NÃO           | -         | Norma utilizada para cálculo dos volumes.                     |
| PCT_CROMATOGRAFIA_NITROGENIO | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_CO2        | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_METANO     | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_ETANO      | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_PROPANO    | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_N_BUTANO   | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_I_BUTANO   | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_N_PENTANO  | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_I_PENTANO  | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_HEXANO     | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_HEPTANO    | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_OCTANO     | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_NONANO     | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_DECANO     | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_H2S        | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_AGUA       | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_HELIO      | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_OXIGENIO   | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_CO         | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_HIDROGENIO | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| PCT_CROMATOGRAFIA_ARGONIO    | RACIONAL   | (3,6)     | NÃO           | Mol       | Porcentagem em moles do componente no gás                     |
| DSC_VERSAO_SOFTWARE          | TEXTO      | 30        | SIM           | -         | Descrição da versão do Software utilizada nesta configuração. |

</details>

<details>
<summary><strong>Matriz de campos — ELEMENTO_PRIMARIO</strong> (64 campos)</summary>

| Campo                      | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                     |
|:---------------------------|:-----------|:----------|:--------------|:----------|:------------------------------------------------------------------------------------------------------------------------------|
| ICE_METER_FACTOR_1         | RACIONAL   | (1,5)     | SIM           | -         | Meter Factor associado ao ponto 1 ou no caso de se adotar um único Meter Factor.                                              |
| ICE_METER_FACTOR_2         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 2.                                                                                            |
| ICE_METER_FACTOR_3         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 3.                                                                                            |
| ICE_METER_FACTOR_4         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 4.                                                                                            |
| ICE_METER_FACTOR_5         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 5.                                                                                            |
| ICE_METER_FACTOR_6         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 6.                                                                                            |
| ICE_METER_FACTOR_7         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 7.                                                                                            |
| ICE_METER_FACTOR_8         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 8.                                                                                            |
| ICE_METER_FACTOR_9         | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 9.                                                                                            |
| ICE_METER_FACTOR_10        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 10.                                                                                           |
| ICE_METER_FACTOR_11        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 11.                                                                                           |
| ICE_METER_FACTOR_12        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 12.                                                                                           |
| ICE_METER_FACTOR_13        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 13.                                                                                           |
| ICE_METER_FACTOR_14        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 14.                                                                                           |
| ICE_METER_FACTOR_15        | RACIONAL   | (1,5)     | NÃO           | -         | Meter Factor associado ao ponto 15.                                                                                           |
| QTD_PULSOS_METER_FACTOR_1  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 1 ou zero no caso de se utilizar apenas um Meter Factor. |
| QTD_PULSOS_METER_FACTOR_2  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 2.                                                       |
| QTD_PULSOS_METER_FACTOR_3  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 3.                                                       |
| QTD_PULSOS_METER_FACTOR_4  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 4.                                                       |
| QTD_PULSOS_METER_FACTOR_5  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 5.                                                       |
| QTD_PULSOS_METER_FACTOR_6  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 6.                                                       |
| QTD_PULSOS_METER_FACTOR_7  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 7.                                                       |
| QTD_PULSOS_METER_FACTOR_8  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 8.                                                       |
| QTD_PULSOS_METER_FACTOR_9  | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 9.                                                       |
| QTD_PULSOS_METER_FACTOR_10 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 10.                                                      |
| QTD_PULSOS_METER_FACTOR_11 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 11.                                                      |
| QTD_PULSOS_METER_FACTOR_12 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 12.                                                      |
| QTD_PULSOS_METER_FACTOR_13 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 13.                                                      |
| QTD_PULSOS_METER_FACTOR_14 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 14.                                                      |
| QTD_PULSOS_METER_FACTOR_15 | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao Meter Factor 15.                                                      |
| ICE_K_FACTOR_1             | RACIONAL   | (8,2)     | SIM           | Pulso/m³  | K Factor associado ao ponto 1 ou no caso de se adotar um único K Factor.                                                      |
| ICE_K_FACTOR_2             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 2.                                                                                                |
| ICE_K_FACTOR_3             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 3.                                                                                                |
| ICE_K_FACTOR_4             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 4.                                                                                                |
| ICE_K_FACTOR_5             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 5.                                                                                                |
| ICE_K_FACTOR_6             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 6.                                                                                                |
| ICE_K_FACTOR_7             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 7.                                                                                                |
| ICE_K_FACTOR_8             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 8.                                                                                                |
| ICE_K_FACTOR_9             | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 9.                                                                                                |
| ICE_K_FACTOR_10            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 10.                                                                                               |
| ICE_K_FACTOR_11            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 11.                                                                                               |
| ICE_K_FACTOR_12            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 12.                                                                                               |
| ICE_K_FACTOR_13            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 13.                                                                                               |
| ICE_K_FACTOR_14            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 14.                                                                                               |
| ICE_K_FACTOR_15            | RACIONAL   | (8,2)     | NÃO           | Pulso/m³  | K Factor associado ao ponto 15.                                                                                               |
| QTD_PULSOS_K_FACTOR_1      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 1.                                                           |
| QTD_PULSOS_K_FACTOR_2      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 2.                                                           |
| QTD_PULSOS_K_FACTOR_3      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 3.                                                           |
| QTD_PULSOS_K_FACTOR_4      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 4.                                                           |
| QTD_PULSOS_K_FACTOR_5      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 5.                                                           |
| QTD_PULSOS_K_FACTOR_6      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 6.                                                           |
| QTD_PULSOS_K_FACTOR_7      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 7.                                                           |
| QTD_PULSOS_K_FACTOR_8      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 8.                                                           |
| QTD_PULSOS_K_FACTOR_9      | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 9.                                                           |
| QTD_PULSOS_K_FACTOR_10     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 10.                                                          |
| QTD_PULSOS_K_FACTOR_11     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 11.                                                          |
| QTD_PULSOS_K_FACTOR_12     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 12.                                                          |
| QTD_PULSOS_K_FACTOR_13     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 13.                                                          |
| QTD_PULSOS_K_FACTOR_14     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 14.                                                          |
| QTD_PULSOS_K_FACTOR_15     | RACIONAL   | (8,2)     | NÃO           | Hz        | Frequência do medidor (pulsos por segundo) associada ao K Factor 15.                                                          |
| ICE_CUTOFF                 | RACIONAL   | (6,3)     | SIM           | 10³ m³/h  | Limite inferior a partir do qual o medidor passa a computar os volumes.                                                       |
| ICE_LIMITE_SPRR_ALARME     | RACIONAL   | (6,3)     | SIM           | 10³ m³/h  | Limite superior para o computador de vazão registrar alarme.                                                                  |
| ICE_LIMITE_INFRR_ALARME    | RACIONAL   | (6,3)     | SIM           | 10³ m³/h  | limite inferior para o computador de vazão registrar alarme.                                                                  |
| IND_HABILITACAO_ALARME     | SIM_NAO    | 1         | SIM           | -         | Informação se o Alarme de vazão está habilitado ou não.                                                                       |

</details>

<details>
<summary><strong>Matriz de campos — INSTRUMENTO_PRESSAO</strong> (7 campos)</summary>

| Campo                        | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                        |
|:-----------------------------|:-----------|:----------|:--------------|:----------|:---------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE                    | TEXTO      | 30        | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). |
| MED_PRSO_LIMITE_SPRR_ALRME   | RACIONAL   | (6,3)     | SIM           | kPa       | Limite superior para o computador de vazão registrar alarme.                                                                     |
| MED_PRSO_LMTE_INFRR_ALRME    | RACIONAL   | (6,3)     | SIM           | kPa       | Limite inferior para o computador de vazão registrar alarme.                                                                     |
| IND_HABILITACAO_ALARME       | SIM_NAO    | 1         | SIM           | -         | Informação se o Alarme de Pressão Estática está habilitado ou não.                                                               |
| MED_PRSO_ADOTADA_FALHA       | RACIONAL   | (6,3)     | SIM           | kPa       | Pressão Estática a ser adotada em caso de falha do instrumento.                                                                  |
| DSC_ESTADO_INSNO_CASO_FALHA  | TEXTO      | 50        | SIM           | -         | Informação da ação tomada em caso de falha.                                                                                      |
| IND_TIPO_PRESSAO_CONSIDERADA | TEXTO      | 1         | SIM           | -         | Informação se a pressão está sendo considerada como absoluta ou manométrica. Os valores possíveis são A=absoluta, M=Manométrica. |

</details>

<details>
<summary><strong>Matriz de campos — INSTRUMENTO_TEMPERATURA</strong> (6 campos)</summary>

| Campo                        | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                        |
|:-----------------------------|:-----------|:----------|:--------------|:----------|:---------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE                    | TEXTO      | 30        | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). |
| MED_TMPTA_SPRR_ALARME        | RACIONAL   | (3,2)     | SIM           | °C        | Limite superior para o computador de vazão registrar alarme.                                                                     |
| MED_TMPTA_INFRR_ALRME        | RACIONAL   | (3,2)     | SIM           | °C        | Limite inferior para o computador de vazão registrar alarme.                                                                     |
| IND_HABILITACAO_ALARME       | SIM_NAO    | 1         | SIM           | -         | Informação se o Alarme de temperatura está habilitado ou não.                                                                    |
| MED_TMPTA_ADTTA_FALHA        | RACIONAL   | (3,2)     | SIM           | °C        | Temperatura a ser adotada em caso de falha do instrumento.                                                                       |
| DSC_ESTADO_INSTRUMENTO_FALHA | TEXTO      | 50        | SIM           | -         | Informação da ação tomada em caso de falha.                                                                                      |

</details>

<details>
<summary><strong>Matriz de campos — PRODUCAO</strong> (8 campos)</summary>

| Campo                      | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                    |
|:---------------------------|:-----------|:----------|:--------------|:----------|:-----------------------------------------------------------------------------------------------------------------------------|
| DHA_INICIO_PERIODO_MEDICAO | DATA_HORA  | 19        | SIM           | -         | Data e Hora inicial do período a que se refere o volume considerado.                                                         |
| DHA_FIM_PERIODO_MEDICAO    | DATA_HORA  | 19        | SIM           | -         | Data e Hora final do período a que se refere o volume considerado.                                                           |
| ICE_DENSIDADE_RELATIVA     | RACIONAL   | (2,8)     | NÃO           | -         | Média ponderada da densidade relativa medida no período.                                                                     |
| MED_PRESSAO_ESTATICA       | RACIONAL   | (6,3)     | SIM           | kPa       | Média ponderada da pressão estática no período.                                                                              |
| MED_TEMPERATURA            | RACIONAL   | (3,2)     | SIM           | °C        | Média ponderada da temperatura no período.                                                                                   |
| PRZ_DURACAO_FLUXO_EFETIVO  | RACIONAL   | (4,4)     | SIM           | Min       | Tempo de efetivo fluxo no período considerado.                                                                               |
| MED_BRUTO_MOVIMENTADO      | RACIONAL   | (6,5)     | SIM           | 10³ m³    | Volume bruto movimentado no período entre a data e hora de abertura e a data e hora de fechamento nas condições de operação. |
| MED_CORRIGIDO_MVMDO        | RACIONAL   | (6,5)     | SIM           | 10³ m³    | Volume movimentado no período entre a data e hora de abertura e a data e hora de fechamento nas condições de referência.     |

</details>

### 5.3 Tipo 003 — Gás Diferencial (PMGD / ISO 5167)
**Documento de referência:** PMGD - PONTOS DE MEDIÇÃO PARA GÁS DIFERENCIAL.pdf

**Raiz:** `<a003>`  
**Itens por arquivo (evidência do sample):** `5` blocos `<DADOS_BASICOS>`

**Atributos de `<DADOS_BASICOS>` (obrigatórios no sample):** `COD_INSTALACAO, COD_TAG_PONTO_MEDICAO, NUM_SERIE_ELEMENTO_PRIMARIO`  
**Exemplo (do sample):** `{'NUM_SERIE_ELEMENTO_PRIMARIO': '4014012', 'COD_INSTALACAO': '38480', 'COD_TAG_PONTO_MEDICAO': '45FT0555'}`

**Sub-blocos dentro de `<DADOS_BASICOS>` (ordem observada):**
- `LISTA_CONFIGURACAO_CV`
- `LISTA_ELEMENTO_PRIMARIO`
- `LISTA_INSTRUMENTO_PRESSAO`
- `LISTA_INSTRUMENTO_TEMPERATURA`
- `LISTA_PLACA_ORIFICIO`
- `LISTA_INST_DIFEREN_PRESSAO_PRINCIPAL`
- `LISTA_PRODUCAO`

**XML mínimo (esqueleto):**

```xml
<?xml version="1.0" encoding="iso-8859-1"?>
<a003>
	<LISTA_DADOS_BASICOS>
		<DADOS_BASICOS COD_INSTALACAO="{COD_INSTALACAO}" COD_TAG_PONTO_MEDICAO="{COD_TAG_PONTO_MEDICAO}" NUM_SERIE_ELEMENTO_PRIMARIO="{NUM_SERIE_ELEMENTO_PRIMARIO}">
		<LISTA_CONFIGURACAO_CV>
			<CONFIGURACAO_CV>
			<NUM_SERIE_COMPUTADOR_VAZAO>{NUM_SERIE_COMPUTADOR_VAZAO}</NUM_SERIE_COMPUTADOR_VAZAO>
			<DHA_COLETA>{DHA_COLETA}</DHA_COLETA>
			<MED_TEMPERATURA>{MED_TEMPERATURA}</MED_TEMPERATURA>
			<MED_PRESSAO_ATMSA>{MED_PRESSAO_ATMSA}</MED_PRESSAO_ATMSA>
			<MED_PRESSAO_RFRNA>{MED_PRESSAO_RFRNA}</MED_PRESSAO_RFRNA>
			<MED_DENSIDADE_RELATIVA>{MED_DENSIDADE_RELATIVA}</MED_DENSIDADE_RELATIVA>
			<DSC_NORMA_UTILIZADA_CALCULO>{DSC_NORMA_UTILIZADA_CALCULO}</DSC_NORMA_UTILIZADA_CALCULO>
			<PCT_CROMATOGRAFIA_NITROGENIO>{PCT_CROMATOGRAFIA_NITROGENIO}</PCT_CROMATOGRAFIA_NITROGENIO>
			<PCT_CROMATOGRAFIA_CO2>{PCT_CROMATOGRAFIA_CO2}</PCT_CROMATOGRAFIA_CO2>
			<PCT_CROMATOGRAFIA_METANO>{PCT_CROMATOGRAFIA_METANO}</PCT_CROMATOGRAFIA_METANO>
			<PCT_CROMATOGRAFIA_ETANO>{PCT_CROMATOGRAFIA_ETANO}</PCT_CROMATOGRAFIA_ETANO>
			<PCT_CROMATOGRAFIA_PROPANO>{PCT_CROMATOGRAFIA_PROPANO}</PCT_CROMATOGRAFIA_PROPANO>
			<PCT_CROMATOGRAFIA_N_BUTANO>{PCT_CROMATOGRAFIA_N_BUTANO}</PCT_CROMATOGRAFIA_N_BUTANO>
			<PCT_CROMATOGRAFIA_I_BUTANO>{PCT_CROMATOGRAFIA_I_BUTANO}</PCT_CROMATOGRAFIA_I_BUTANO>
			<PCT_CROMATOGRAFIA_N_PENTANO>{PCT_CROMATOGRAFIA_N_PENTANO}</PCT_CROMATOGRAFIA_N_PENTANO>
			<PCT_CROMATOGRAFIA_I_PENTANO>{PCT_CROMATOGRAFIA_I_PENTANO}</PCT_CROMATOGRAFIA_I_PENTANO>
			<PCT_CROMATOGRAFIA_HEXANO>{PCT_CROMATOGRAFIA_HEXANO}</PCT_CROMATOGRAFIA_HEXANO>
			<PCT_CROMATOGRAFIA_HEPTANO>{PCT_CROMATOGRAFIA_HEPTANO}</PCT_CROMATOGRAFIA_HEPTANO>
			<PCT_CROMATOGRAFIA_OCTANO>{PCT_CROMATOGRAFIA_OCTANO}</PCT_CROMATOGRAFIA_OCTANO>
			<PCT_CROMATOGRAFIA_NONANO>{PCT_CROMATOGRAFIA_NONANO}</PCT_CROMATOGRAFIA_NONANO>
			<PCT_CROMATOGRAFIA_DECANO>{PCT_CROMATOGRAFIA_DECANO}</PCT_CROMATOGRAFIA_DECANO>
			<PCT_CROMATOGRAFIA_H2S>{PCT_CROMATOGRAFIA_H2S}</PCT_CROMATOGRAFIA_H2S>
			<PCT_CROMATOGRAFIA_AGUA>{PCT_CROMATOGRAFIA_AGUA}</PCT_CROMATOGRAFIA_AGUA>
			<PCT_CROMATOGRAFIA_HELIO>{PCT_CROMATOGRAFIA_HELIO}</PCT_CROMATOGRAFIA_HELIO>
			<PCT_CROMATOGRAFIA_OXIGENIO>{PCT_CROMATOGRAFIA_OXIGENIO}</PCT_CROMATOGRAFIA_OXIGENIO>
			<PCT_CROMATOGRAFIA_CO>{PCT_CROMATOGRAFIA_CO}</PCT_CROMATOGRAFIA_CO>
			<PCT_CROMATOGRAFIA_HIDROGENIO>{PCT_CROMATOGRAFIA_HIDROGENIO}</PCT_CROMATOGRAFIA_HIDROGENIO>
			<PCT_CROMATOGRAFIA_ARGONIO>{PCT_CROMATOGRAFIA_ARGONIO}</PCT_CROMATOGRAFIA_ARGONIO>
			<DSC_VERSAO_SOFTWARE>{DSC_VERSAO_SOFTWARE}</DSC_VERSAO_SOFTWARE>
			</CONFIGURACAO_CV>
		</LISTA_CONFIGURACAO_CV>
		<LISTA_ELEMENTO_PRIMARIO>
			<ELEMENTO_PRIMARIO>
			<ICE_LIMITE_SPRR_ALARME>{ICE_LIMITE_SPRR_ALARME}</ICE_LIMITE_SPRR_ALARME>
			<ICE_LIMITE_INFRR_ALARME>{ICE_LIMITE_INFRR_ALARME}</ICE_LIMITE_INFRR_ALARME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			</ELEMENTO_PRIMARIO>
		</LISTA_ELEMENTO_PRIMARIO>
		<LISTA_INSTRUMENTO_PRESSAO>
			<INSTRUMENTO_PRESSAO>
			<NUM_SERIE>{NUM_SERIE}</NUM_SERIE>
			<MED_PRSO_LIMITE_SPRR_ALRME>{MED_PRSO_LIMITE_SPRR_ALRME}</MED_PRSO_LIMITE_SPRR_ALRME>
			<MED_PRSO_LMTE_INFRR_ALRME>{MED_PRSO_LMTE_INFRR_ALRME}</MED_PRSO_LMTE_INFRR_ALRME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			<MED_PRSO_ADOTADA_FALHA>{MED_PRSO_ADOTADA_FALHA}</MED_PRSO_ADOTADA_FALHA>
			<DSC_ESTADO_INSNO_CASO_FALHA>{DSC_ESTADO_INSNO_CASO_FALHA}</DSC_ESTADO_INSNO_CASO_FALHA>
			<IND_TIPO_PRESSAO_CONSIDERADA>{IND_TIPO_PRESSAO_CONSIDERADA}</IND_TIPO_PRESSAO_CONSIDERADA>
			</INSTRUMENTO_PRESSAO>
		</LISTA_INSTRUMENTO_PRESSAO>
		<LISTA_INSTRUMENTO_TEMPERATURA>
			<INSTRUMENTO_TEMPERATURA>
			<NUM_SERIE>{NUM_SERIE}</NUM_SERIE>
			<MED_TMPTA_SPRR_ALARME>{MED_TMPTA_SPRR_ALARME}</MED_TMPTA_SPRR_ALARME>
			<MED_TMPTA_INFRR_ALRME>{MED_TMPTA_INFRR_ALRME}</MED_TMPTA_INFRR_ALRME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			<MED_TMPTA_ADTTA_FALHA>{MED_TMPTA_ADTTA_FALHA}</MED_TMPTA_ADTTA_FALHA>
			<DSC_ESTADO_INSTRUMENTO_FALHA>{DSC_ESTADO_INSTRUMENTO_FALHA}</DSC_ESTADO_INSTRUMENTO_FALHA>
			</INSTRUMENTO_TEMPERATURA>
		</LISTA_INSTRUMENTO_TEMPERATURA>
		<LISTA_PLACA_ORIFICIO>
			<PLACA_ORIFICIO>
			<MED_DIAMETRO_REFERENCIA>{MED_DIAMETRO_REFERENCIA}</MED_DIAMETRO_REFERENCIA>
			<MED_TEMPERATURA_RFRNA>{MED_TEMPERATURA_RFRNA}</MED_TEMPERATURA_RFRNA>
			<DSC_MATERIAL_CONTRUCAO_PLACA>{DSC_MATERIAL_CONTRUCAO_PLACA}</DSC_MATERIAL_CONTRUCAO_PLACA>
			<MED_DMTRO_INTRO_TRCHO_MDCO>{MED_DMTRO_INTRO_TRCHO_MDCO}</MED_DMTRO_INTRO_TRCHO_MDCO>
			<MED_TMPTA_TRCHO_MDCO>{MED_TMPTA_TRCHO_MDCO}</MED_TMPTA_TRCHO_MDCO>
			<DSC_MATERIAL_CNSTO_TRCHO_MDCO>{DSC_MATERIAL_CNSTO_TRCHO_MDCO}</DSC_MATERIAL_CNSTO_TRCHO_MDCO>
			<DSC_LCLZO_TMDA_PRSO_DFRNL>{DSC_LCLZO_TMDA_PRSO_DFRNL}</DSC_LCLZO_TMDA_PRSO_DFRNL>
			<IND_TOMADA_PRESSAO_ESTATICA>{IND_TOMADA_PRESSAO_ESTATICA}</IND_TOMADA_PRESSAO_ESTATICA>
			</PLACA_ORIFICIO>
		</LISTA_PLACA_ORIFICIO>
		<LISTA_INST_DIFEREN_PRESSAO_PRINCIPAL>
			<INST_DIFEREN_PRESSAO_PRINCIPAL>
			<NUM_SERIE>{NUM_SERIE}</NUM_SERIE>
			<MED_PRSO_LIMITE_SPRR_ALRME>{MED_PRSO_LIMITE_SPRR_ALRME}</MED_PRSO_LIMITE_SPRR_ALRME>
			<MED_PRSO_LMTE_INFRR_ALRME>{MED_PRSO_LMTE_INFRR_ALRME}</MED_PRSO_LMTE_INFRR_ALRME>
			<IND_HABILITACAO_ALARME>{IND_HABILITACAO_ALARME}</IND_HABILITACAO_ALARME>
			<MED_PRSO_ADOTADA_FALHA>{MED_PRSO_ADOTADA_FALHA}</MED_PRSO_ADOTADA_FALHA>
			<DSC_ESTADO_INSNO_CASO_FALHA>{DSC_ESTADO_INSNO_CASO_FALHA}</DSC_ESTADO_INSNO_CASO_FALHA>
			<MED_CUTOFF_KPA>{MED_CUTOFF_KPA}</MED_CUTOFF_KPA>
			</INST_DIFEREN_PRESSAO_PRINCIPAL>
		</LISTA_INST_DIFEREN_PRESSAO_PRINCIPAL>
		<LISTA_PRODUCAO>
			<PRODUCAO>
			<DHA_INICIO_PERIODO_MEDICAO>{DHA_INICIO_PERIODO_MEDICAO}</DHA_INICIO_PERIODO_MEDICAO>
			<DHA_FIM_PERIODO_MEDICAO>{DHA_FIM_PERIODO_MEDICAO}</DHA_FIM_PERIODO_MEDICAO>
			<ICE_DENSIDADE_RELATIVA>{ICE_DENSIDADE_RELATIVA}</ICE_DENSIDADE_RELATIVA>
			<MED_DIFERENCIAL_PRESSAO>{MED_DIFERENCIAL_PRESSAO}</MED_DIFERENCIAL_PRESSAO>
			<MED_PRESSAO_ESTATICA>{MED_PRESSAO_ESTATICA}</MED_PRESSAO_ESTATICA>
			<MED_TEMPERATURA>{MED_TEMPERATURA}</MED_TEMPERATURA>
			<PRZ_DURACAO_FLUXO_EFETIVO>{PRZ_DURACAO_FLUXO_EFETIVO}</PRZ_DURACAO_FLUXO_EFETIVO>
			<MED_CORRIGIDO_MVMDO>{MED_CORRIGIDO_MVMDO}</MED_CORRIGIDO_MVMDO>
			</PRODUCAO>
		</LISTA_PRODUCAO>
		</DADOS_BASICOS>
	</LISTA_DADOS_BASICOS>
</a003>
```

<details>
<summary><strong>Matriz de campos — DADOS_BASICOS@attributes</strong> (3 campos)</summary>

| Campo                       | Natureza   |   Tamanho | Obrigatório   | Unidade   | Descrição                                                                                                                                                                                      |
|:----------------------------|:-----------|----------:|:--------------|:----------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE_ELEMENTO_PRIMARIO | TEXTO      |        30 | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). No caso da placa de orifício deve ser considerado o da placa. |
| COD_INSTALACAO              | NATURAL    |        10 | SIM           | -         | Código da instalação onde o ponto de medição se encontra                                                                                                                                       |
| COD_TAG_PONTO_MEDICAO       | TEXTO      |        20 | SIM           | -         | Tag do ponto de medição conforme cadastro do SFP.                                                                                                                                              |

</details>

<details>
<summary><strong>Matriz de campos — CONFIGURACAO_CV</strong> (29 campos)</summary>

| Campo                        | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                              |
|:-----------------------------|:-----------|:----------|:--------------|:----------|:-----------------------------------------------------------------------|
| NUM_SERIE_COMPUTADOR_VAZAO   | TEXTO      | 30        | SIM           | -         | Identificação no sistema de medição da posição do computador de vazão. |
| DHA_COLETA                   | DATA_HORA  | 19        | SIM           | -         | Data e hora que correspondem a configuração em questão.                |
| MED_TEMPERATURA              | RACIONAL   | (3,2)     | SIM           | °C        | Temperatura para qual os volumes estão sendo corrigidos.               |
| MED_PRESSAO_ATMSA            | RACIONAL   | (3,3)     | SIM           | kPa       | Valor da pressão atmosférica local no ponto de medição.                |
| MED_PRESSAO_RFRNA            | RACIONAL   | (3,3)     | SIM           | kPa       | Pressão para qual os volumes estão sendo corrigidos.                   |
| MED_DENSIDADE_RELATIVA       | RACIONAL   | (2,8)     | SIM           | -         | Desnsidade relativa do gás.                                            |
| DSC_NORMA_UTILIZADA_CALCULO  | TEXTO      | 50        | SIM           | -         | Norma utilizada para cálculo dos volumes.                              |
| PCT_CROMATOGRAFIA_NITROGENIO | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_CO2        | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_METANO     | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_ETANO      | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_PROPANO    | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_N_BUTANO   | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_I_BUTANO   | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_N_PENTANO  | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_I_PENTANO  | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_HEXANO     | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_HEPTANO    | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_OCTANO     | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_NONANO     | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_DECANO     | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_H2S        | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_AGUA       | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_HELIO      | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_OXIGENIO   | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_CO         | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_HIDROGENIO | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| PCT_CROMATOGRAFIA_ARGONIO    | RACIONAL   | (3,6)     | SIM           | Mol       | Porcentagem em moles do componente no gás                              |
| DSC_VERSAO_SOFTWARE          | TEXTO      | 30        | SIM           | -         | Descrição da versão do Software utilizada nesta configuração.          |

</details>

<details>
<summary><strong>Matriz de campos — ELEMENTO_PRIMARIO</strong> (3 campos)</summary>

| Campo                   | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                    |
|:------------------------|:-----------|:----------|:--------------|:----------|:-------------------------------------------------------------|
| ICE_LIMITE_SPRR_ALARME  | RACIONAL   | (6,3)     | SIM           | 10³ m³/h  | Limite superior para o computador de vazão registrar alarme. |
| ICE_LIMITE_INFRR_ALARME | RACIONAL   | (6,3)     | SIM           | 10³ m³/h  | limite inferior para o computador de vazão registrar alarme. |
| IND_HABILITACAO_ALARME  | SIM_NAO    | 1         | SIM           | -         | Informação se o Alarme de vazão está habilitado ou não.      |

</details>

<details>
<summary><strong>Matriz de campos — INSTRUMENTO_PRESSAO</strong> (7 campos)</summary>

| Campo                        | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                        |
|:-----------------------------|:-----------|:----------|:--------------|:----------|:---------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE                    | TEXTO      | 30        | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). |
| MED_PRSO_LIMITE_SPRR_ALRME   | RACIONAL   | (6,3)     | SIM           | kPa       | Limite superior para o computador de vazão registrar alarme.                                                                     |
| MED_PRSO_LMTE_INFRR_ALRME    | RACIONAL   | (6,3)     | SIM           | kPa       | Limite inferior para o computador de vazão registrar alarme.                                                                     |
| IND_HABILITACAO_ALARME       | SIM_NAO    | 1         | SIM           | -         | Informação se o Alarme de Pressão Estática está habilitado ou não.                                                               |
| MED_PRSO_ADOTADA_FALHA       | RACIONAL   | (6,3)     | SIM           | kPa       | Pressão Estática a ser adotada em caso de falha do instrumento.                                                                  |
| DSC_ESTADO_INSNO_CASO_FALHA  | TEXTO      | 50        | SIM           | -         | Informação da ação tomada em caso de falha.                                                                                      |
| IND_TIPO_PRESSAO_CONSIDERADA | TEXTO      | 1         | SIM           | -         | Informação se a pressão está sendo considerada como absoluta ou manométrica. Os valores possíveis são A=absoluta, M=Manométrica. |

</details>

<details>
<summary><strong>Matriz de campos — INSTRUMENTO_TEMPERATURA</strong> (6 campos)</summary>

| Campo                        | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                        |
|:-----------------------------|:-----------|:----------|:--------------|:----------|:---------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE                    | TEXTO      | 30        | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). |
| MED_TMPTA_SPRR_ALARME        | RACIONAL   | (3,2)     | SIM           | °C        | Limite superior para o computador de vazão registrar alarme.                                                                     |
| MED_TMPTA_INFRR_ALRME        | RACIONAL   | (3,2)     | SIM           | °C        | Limite inferior para o computador de vazão registrar alarme.                                                                     |
| IND_HABILITACAO_ALARME       | SIM_NAO    | 1         | SIM           | -         | Informação se o Alarme de temperatura está habilitado ou não.                                                                    |
| MED_TMPTA_ADTTA_FALHA        | RACIONAL   | (3,2)     | SIM           | °C        | Temperatura a ser adotada em caso de falha do instrumento.                                                                       |
| DSC_ESTADO_INSTRUMENTO_FALHA | TEXTO      | 50        | SIM           | -         | Informação da ação tomada em caso de falha.                                                                                      |

</details>

<details>
<summary><strong>Matriz de campos — PLACA_ORIFICIO</strong> (8 campos)</summary>

| Campo                         | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                 |
|:------------------------------|:-----------|:----------|:--------------|:----------|:--------------------------------------------------------------------------------------------------------------------------|
| MED_DIAMETRO_REFERENCIA       | RACIONAL   | (4,3)     | SIM           | mm        | Diâmetro de Referência do orifício da Placa                                                                               |
| MED_TEMPERATURA_RFRNA         | RACIONAL   | (3,2)     | SIM           | °C        | Temperatura de referência do diâmetro do orifício da placa                                                                |
| DSC_MATERIAL_CONTRUCAO_PLACA  | TEXTO      | 50        | SIM           | -         | Material da Placa de Orifício                                                                                             |
| MED_DMTRO_INTRO_TRCHO_MDCO    | RACIONAL   | (4,3)     | SIM           | mm        | Diâmetro de Referência interno do Trecho de Medição                                                                       |
| MED_TMPTA_TRCHO_MDCO          | RACIONAL   | (3,2)     | SIM           | °C        | Temperatura de referência do diâmetro interno do trecho de medição                                                        |
| DSC_MATERIAL_CNSTO_TRCHO_MDCO | TEXTO      | 50        | SIM           | -         | Material do Trecho de Medição                                                                                             |
| DSC_LCLZO_TMDA_PRSO_DFRNL     | TEXTO      | 50        | SIM           | -         | Localização dos pontos de tomada de pressão diferencial. Configuração das Tomadas de Pressão Diferencial.                 |
| IND_TOMADA_PRESSAO_ESTATICA   | TEXTO      | 1         | SIM           | -         | Localização da tomada de pressão estática. Montante ou Jusante da placa de orifício. Os valores possíveis são 'M' ou 'J'. |

</details>

<details>
<summary><strong>Matriz de campos — INST_DIFEREN_PRESSAO_PRINCIPAL</strong> (7 campos)</summary>

| Campo                       | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                        |
|:----------------------------|:-----------|:----------|:--------------|:----------|:---------------------------------------------------------------------------------------------------------------------------------|
| NUM_SERIE                   | TEXTO      | 30        | SIM           | -         | n° de série do instrumento (deve ser o mesmo número de série utilizado no cadastro do ponto de medição para fazer a associação). |
| MED_PRSO_LIMITE_SPRR_ALRME  | RACIONAL   | (6,3)     | NÃO           | kPa       | Limite de Alta de Alarme do Instrumento de Diferencial de Pressão.                                                               |
| MED_PRSO_LMTE_INFRR_ALRME   | RACIONAL   | (6,3)     | NÃO           | kPa       | Limite de Baixa de Alarme do Instrumento de Diferencial de Pressão.                                                              |
| IND_HABILITACAO_ALARME      | SIM_NAO    | 1         | NÃO           | -         | Status do Alarme de Diferencial de Pressão do Instrumento de Diferencial de Pressão                                              |
| MED_PRSO_ADOTADA_FALHA      | RACIONAL   | (6,3)     | NÃO           | kPa       | Medida em caso de falha do Instrumento de Diferencial de Pressão Principal (Sem extensão de faixa)                               |
| DSC_ESTADO_INSNO_CASO_FALHA | TEXTO      | 50        | NÃO           | -         | Status do instrumento de Diferencial de Pressão em Caso de Falha. Informação da ação tomada em caso de falha.                    |
| MED_CUTOFF_KPA              | RACIONAL   | (6,3)     | NÃO           | kPa       | Limite inferior a partir do qual o medidor passa a computar os volumes.                                                          |

</details>

<details>
<summary><strong>Matriz de campos — PRODUCAO</strong> (8 campos)</summary>

| Campo                      | Natureza   | Tamanho   | Obrigatório   | Unidade   | Descrição                                                                                                                |
|:---------------------------|:-----------|:----------|:--------------|:----------|:-------------------------------------------------------------------------------------------------------------------------|
| DHA_INICIO_PERIODO_MEDICAO | DATA_HORA  | 19        | SIM           | -         | Data e Hora inicial do período a que se refere o volume considerado.                                                     |
| DHA_FIM_PERIODO_MEDICAO    | DATA_HORA  | 19        | SIM           | -         | Data e Hora final do período a que se refere o volume considerado.                                                       |
| ICE_DENSIDADE_RELATIVA     | RACIONAL   | (2,8)     | NÃO           | -         | Média ponderada da densidade relativa medida no período.                                                                 |
| MED_DIFERENCIAL_PRESSAO    | RACIONAL   | (6,3)     | SIM           | kPa       | Média ponderada do diferencial de pressão no período.                                                                    |
| MED_PRESSAO_ESTATICA       | RACIONAL   | (6,3)     | SIM           | kPa       | Média ponderada da pressão estática no período.                                                                          |
| MED_TEMPERATURA            | RACIONAL   | (3,2)     | SIM           | °C        | Média ponderada da temperatura no período.                                                                               |
| PRZ_DURACAO_FLUXO_EFETIVO  | RACIONAL   | (4,4)     | SIM           | Min       | Tempo de efetivo fluxo no período considerado.                                                                           |
| MED_CORRIGIDO_MVMDO        | RACIONAL   | (6,5)     | SIM           | 10³ m³    | Volume movimentado no período entre a data e hora de abertura e a data e hora de fechamento nas condições de referência. |

</details>

### 5.4 Tipo 004 — Alarmes & Eventos (a004)
**Fontes usadas:** XML sample `004_04028583_20260127001006_38480.xml` e templates `Alarme*.txt`.

**Raiz:** `<a004>`  
**Itens por arquivo (evidência do sample):** `9` blocos `<DADOS_BASICOS>` (um por computador de vazão).

**Atributos de `<DADOS_BASICOS>`:** `NUM_SERIE_COMPUTADOR_VAZAO`, `COD_INSTALACAO`.

**Estrutura:**
- `<a004>`
  - `<LISTA_DADOS_BASICOS>`
    - `<DADOS_BASICOS ...>` (0..n)
      - `<LISTA_ALARMES>` → `<ALARMES>` (0..n)
      - `<LISTA_EVENTOS>` → `<EVENTOS>` (0..n)

**XML mínimo (listas vazias):**

```xml
<?xml version="1.0" encoding="iso-8859-1"?>
<a004>
	<LISTA_DADOS_BASICOS>
		<DADOS_BASICOS NUM_SERIE_COMPUTADOR_VAZAO="{NUM_SERIE_COMPUTADOR_VAZAO}" COD_INSTALACAO="{COD_INSTALACAO}">
			<LISTA_ALARMES />
			<LISTA_EVENTOS />
		</DADOS_BASICOS>
	</LISTA_DADOS_BASICOS>
</a004>
```

<details>
<summary><strong>Matriz de campos — DADOS_BASICOS (atributos)</strong></summary>

| Campo                      | Natureza   |   Tamanho | Obrigatório   | Unidade   | Descrição                                                         |
|:---------------------------|:-----------|----------:|:--------------|:----------|:------------------------------------------------------------------|
| NUM_SERIE_COMPUTADOR_VAZAO | TEXTO      |        30 | S             |           | Identificação do computador de vazão (atributo do DADOS_BASICOS). |
| COD_INSTALACAO             | NATURAL    |        10 | S             |           | Código ANP da instalação (atributo do DADOS_BASICOS).             |

</details>

<details>
<summary><strong>Matriz de campos — ALARMES</strong> (ordem observada)</summary>

| Campo               | Natureza   |   Tamanho | Obrigatório   | Unidade   | Descrição                                                |
|:--------------------|:-----------|----------:|:--------------|:----------|:---------------------------------------------------------|
| DSC_DADO_ALARMADO   | TEXTO      |        50 | S             |           | Campo do elemento <ALARMES> (ordem deve ser preservada). |
| DHA_ALARME          | DATA_HORA  |        19 | S             |           | Campo do elemento <ALARMES> (ordem deve ser preservada). |
| DSC_MEDIDA_ALARMADA | TEXTO      |        19 | S             |           | Campo do elemento <ALARMES> (ordem deve ser preservada). |

</details>

<details>
<summary><strong>Matriz de campos — EVENTOS</strong> (ordem observada)</summary>

| Campo                 | Natureza   |   Tamanho | Obrigatório   | Unidade   | Descrição                                                |
|:----------------------|:-----------|----------:|:--------------|:----------|:---------------------------------------------------------|
| DSC_DADO_ALTERADO     | TEXTO      |        50 | S             |           | Campo do elemento <EVENTOS> (ordem deve ser preservada). |
| DSC_CONTEUDO_ORIGINAL | TEXTO      |        50 | S             |           | Campo do elemento <EVENTOS> (ordem deve ser preservada). |
| DSC_CONTEUDO_ATUAL    | TEXTO      |        50 | S             |           | Campo do elemento <EVENTOS> (ordem deve ser preservada). |
| DHA_OCORRENCIA_EVENTO | DATA_HORA  |        19 | S             |           | Campo do elemento <EVENTOS> (ordem deve ser preservada). |

</details>

#### Regras específicas do 004
- **DATA_HORA** sempre `DD/MM/AAAA HH:mm:SS`.
- **Campos TEXTO:** não alterar conteúdo (ex.: `SET`, `ACK`, `CLR`, `Active`, `Clear`, etc.).
- Quando não houver alarmes/eventos: gerar `<LISTA_ALARMES />` e/ou `<LISTA_EVENTOS />`.
- Um mesmo arquivo pode conter vários computadores de vazão (vários `<DADOS_BASICOS>`), como no sample.

## 6. Validação (pré-envio) — checklist implementável
### 6.1. Validação de arquivo
- Nome segue variante configurada (A ou B) e extensão correta.
- Timestamp `YYYYMMDDHHmmSS` válido.
- XML bem formado (parse ok) e encoding `iso-8859-1`.
- Raiz correta por tipo (`a001`..`a004`).
- Estrutura mínima presente (`LISTA_DADOS_BASICOS` + ao menos 1 `DADOS_BASICOS`, exceto cenários permitidos).

### 6.2. Validação de estrutura e campos
- Atributos obrigatórios de `DADOS_BASICOS` presentes.
- Blocos obrigatórios presentes por tipo.
- Campos obrigatórios presentes conforme matriz (PDFs ou regra do 004).
- Validação de **tamanho máximo** para TEXTO.
- Validação de formatos: DATA/DATA_HORA/ANO_MES.
- Validação de RACIONAL: apenas dígitos + vírgula (se houver decimal).

### 6.3. Validação de consistência (regras de negócio)
- Não duplicar o mesmo `COD_TAG_PONTO_MEDICAO` dentro do mesmo arquivo (001–003).
- Coerência `COD_INSTALACAO` do atributo com o sufixo do filename (se Variante B).
- Para 004: permitir 0..n alarmes/eventos; opcional ordenar por `DHA_*` (se exigido internamente).

### 6.4. Validação do ZIP
- ZIP contém exatamente 1 XML.
- CRC/integração do ZIP OK.
- Sem subpastas.

## 7. Configuração do sistema (parâmetros)
- `CNPJ8` por operador/instalação.
- `COD_INSTALACAO` por instalação.
- Timezone/relógio de geração (para o timestamp do filename).
- Variante de nomenclatura (A vs B) por tipo.
- Catálogo de pontos válidos por tipo (lista de `COD_TAG_PONTO_MEDICAO` e `NUM_SERIE_ELEMENTO_PRIMARIO` esperados).

## 8. Plano de testes mínimo
- **Golden tests:** parser/validador deve aceitar integralmente os 4 XMLs de amostra sem modificar conteúdo.
- **Fuzz tests:** truncamento de TEXTO acima do limite; datas inválidas; decimal com ponto.
- **Round-trip:** gerar XML a partir de dados estruturados → validar local → comparar com golden (quando disponível).

## 9. Pendências para fechar 100% com ANP
Para reduzir incerteza e “blindar” o validador, ainda seria ideal obter pelo menos um destes itens:
- XSD oficial por tipo (001–004), se existir no i‑Engine.
- Exemplo real de resposta do Web Service (sucesso/erro) + códigos de rejeição.
- Regras oficiais (ANP) sobre Variante A vs Variante B de nomenclatura (com/sem `_COD_INSTALACAO`).
