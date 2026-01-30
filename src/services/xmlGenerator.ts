/**
 * Gerador de XML ANP - MPFM Monitor
 * Gera arquivos XML para envio ao i-ENGINE (SFP) da ANP
 * Tipos suportados: 001 (Óleo), 002 (Gás Linear), 003 (Gás Diferencial), 004 (Alarmes)
 * 
 * Baseado no PRD_XML_ANP_001_004.md
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type XMLType = '001' | '002' | '003' | '004';

export interface XMLGeneratorConfig {
  cnpjOperador: string;
  codigoInstalacao: string;
  encoding: 'UTF-8' | 'ISO-8859-1';
  validateBeforeGenerate: boolean;
}

export interface DadosBasicos {
  numSerieElementoPrimario: string;
  codInstalacao: string;
  codTagPontoMedicao: string;
}

export interface ConfiguracaoCV {
  numSerieComputadorVazao: string;
  dhaColeta: Date;
  medTemperatura: number;
  medPressaoAtmsa: number;
  medPressaoRfrna: number;
  medDensidadeRelativa?: number;
  dscNormaUtilizadaCalculo?: string;
}

export interface ElementoPrimario {
  meterFactor1: number;
  meterFactor2?: number;
  meterFactor3?: number;
  meterFactor4?: number;
  meterFactor5?: number;
}

export interface Producao {
  volumeBruto: number;
  volumeCorrigido: number;
  volumePadrao: number;
  massaTotal: number;
  tempoFluxo: number;
  totalizadorInicio: number;
  totalizadorFim: number;
}

export interface Alarme {
  dscDadoAlarmado: string;
  dhaAlarme: Date;
  dscMedidaAlarmada: string;
}

export interface Evento {
  dscDadoAlterado: string;
  dscConteudoOriginal: string;
  dscConteudoAtual: string;
  dhaOcorrenciaEvento: Date;
}

export interface XMLProductionData {
  tipo: XMLType;
  dadosBasicos: DadosBasicos;
  configuracaoCV: ConfiguracaoCV;
  elementoPrimario: ElementoPrimario;
  producao?: Producao;
  instrumentoPressao?: Array<{ tag: string; valor: number }>;
  instrumentoTemperatura?: Array<{ tag: string; valor: number }>;
}

export interface XMLAlarmEventData {
  dadosBasicos: {
    numSerieComputadorVazao: string;
    codInstalacao: string;
  };
  alarmes: Alarme[];
  eventos: Evento[];
}

export interface XMLGenerationResult {
  success: boolean;
  xmlContent: string;
  fileName: string;
  fileSize: number;
  validationErrors: string[];
  warnings: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const XML_DECLARATION = '<?xml version="1.0" encoding="{encoding}" ?>';

// Formatos de data ANP
const formatDateTimeANP = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const formatRacional = (value: number, _intPart: number, decPart: number): string => {
  // ANP usa vírgula como separador decimal
  // _intPart reservado para validação futura de tamanho máximo
  return value.toFixed(decPart).replace('.', ',');
};

const generateTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

// ============================================================================
// CLASSE: XMLGenerator
// ============================================================================

export class ANPXMLGenerator {
  private config: XMLGeneratorConfig;

  constructor(config: XMLGeneratorConfig) {
    this.config = config;
  }

  /**
   * Gera nome do arquivo conforme padrão ANP
   * Formato: aaa_bbbbbbbb_cccccccccccccc.ddd
   */
  generateFileName(tipo: XMLType, extension: 'xml' | 'zip' = 'xml'): string {
    const cnpj8 = this.config.cnpjOperador.replace(/\D/g, '').substring(0, 8);
    const timestamp = generateTimestamp();
    return `${tipo}_${cnpj8}_${timestamp}.${extension}`;
  }

  /**
   * Valida campos obrigatórios
   */
  validateDadosBasicos(dados: DadosBasicos): string[] {
    const errors: string[] = [];
    
    if (!dados.numSerieElementoPrimario || dados.numSerieElementoPrimario.length > 30) {
      errors.push('NUM_SERIE_ELEMENTO_PRIMARIO: obrigatório, máximo 30 caracteres');
    }
    if (!dados.codInstalacao || dados.codInstalacao.length > 10) {
      errors.push('COD_INSTALACAO: obrigatório, máximo 10 caracteres');
    }
    if (!dados.codTagPontoMedicao || dados.codTagPontoMedicao.length > 20) {
      errors.push('COD_TAG_PONTO_MEDICAO: obrigatório, máximo 20 caracteres');
    }
    
    return errors;
  }

  /**
   * Valida configuração CV
   */
  validateConfiguracaoCV(config: ConfiguracaoCV): string[] {
    const errors: string[] = [];
    
    if (!config.numSerieComputadorVazao) {
      errors.push('NUM_SERIE_COMPUTADOR_VAZAO: obrigatório');
    }
    if (!config.dhaColeta) {
      errors.push('DHA_COLETA: obrigatório (DATA_HORA)');
    }
    if (config.medTemperatura === undefined) {
      errors.push('MED_TEMPERATURA: obrigatório');
    }
    if (config.medPressaoAtmsa === undefined) {
      errors.push('MED_PRESSAO_ATMSA: obrigatório');
    }
    
    return errors;
  }

  /**
   * Gera XML tipo 001 (Óleo)
   */
  generateXML001(data: XMLProductionData): XMLGenerationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validação
    if (this.config.validateBeforeGenerate) {
      errors.push(...this.validateDadosBasicos(data.dadosBasicos));
      errors.push(...this.validateConfiguracaoCV(data.configuracaoCV));
    }

    if (errors.length > 0) {
      return {
        success: false,
        xmlContent: '',
        fileName: '',
        fileSize: 0,
        validationErrors: errors,
        warnings
      };
    }

    const xml = `${XML_DECLARATION.replace('{encoding}', this.config.encoding)}
<a001>
  <LISTA_DADOS_BASICOS>
    <DADOS_BASICOS>
      <NUM_SERIE_ELEMENTO_PRIMARIO>${this.escapeXML(data.dadosBasicos.numSerieElementoPrimario)}</NUM_SERIE_ELEMENTO_PRIMARIO>
      <COD_INSTALACAO>${data.dadosBasicos.codInstalacao}</COD_INSTALACAO>
      <COD_TAG_PONTO_MEDICAO>${this.escapeXML(data.dadosBasicos.codTagPontoMedicao)}</COD_TAG_PONTO_MEDICAO>
      <CONFIGURACAO_CV>
        <NUM_SERIE_COMPUTADOR_VAZAO>${this.escapeXML(data.configuracaoCV.numSerieComputadorVazao)}</NUM_SERIE_COMPUTADOR_VAZAO>
        <DHA_COLETA>${formatDateTimeANP(data.configuracaoCV.dhaColeta)}</DHA_COLETA>
        <MED_TEMPERATURA>${formatRacional(data.configuracaoCV.medTemperatura, 3, 2)}</MED_TEMPERATURA>
        <MED_PRESSAO_ATMSA>${formatRacional(data.configuracaoCV.medPressaoAtmsa, 3, 3)}</MED_PRESSAO_ATMSA>
        <MED_PRESSAO_RFRNA>${formatRacional(data.configuracaoCV.medPressaoRfrna, 3, 3)}</MED_PRESSAO_RFRNA>
        ${data.configuracaoCV.medDensidadeRelativa !== undefined ? 
          `<MED_DENSIDADE_RELATIVA>${formatRacional(data.configuracaoCV.medDensidadeRelativa, 1, 5)}</MED_DENSIDADE_RELATIVA>` : ''}
      </CONFIGURACAO_CV>
      <ELEMENTO_PRIMARIO>
        <ICE_METER_FACTOR_1>${formatRacional(data.elementoPrimario.meterFactor1, 1, 6)}</ICE_METER_FACTOR_1>
        ${data.elementoPrimario.meterFactor2 !== undefined ? 
          `<ICE_METER_FACTOR_2>${formatRacional(data.elementoPrimario.meterFactor2, 1, 6)}</ICE_METER_FACTOR_2>` : ''}
        ${data.elementoPrimario.meterFactor3 !== undefined ? 
          `<ICE_METER_FACTOR_3>${formatRacional(data.elementoPrimario.meterFactor3, 1, 6)}</ICE_METER_FACTOR_3>` : ''}
        ${data.elementoPrimario.meterFactor4 !== undefined ? 
          `<ICE_METER_FACTOR_4>${formatRacional(data.elementoPrimario.meterFactor4, 1, 6)}</ICE_METER_FACTOR_4>` : ''}
        ${data.elementoPrimario.meterFactor5 !== undefined ? 
          `<ICE_METER_FACTOR_5>${formatRacional(data.elementoPrimario.meterFactor5, 1, 6)}</ICE_METER_FACTOR_5>` : ''}
      </ELEMENTO_PRIMARIO>
      ${data.producao ? this.generateProducaoXML(data.producao) : ''}
    </DADOS_BASICOS>
  </LISTA_DADOS_BASICOS>
</a001>`;

    const fileName = this.generateFileName('001');
    
    return {
      success: true,
      xmlContent: xml,
      fileName,
      fileSize: new Blob([xml]).size,
      validationErrors: [],
      warnings
    };
  }

  /**
   * Gera XML tipo 002 (Gás Linear)
   */
  generateXML002(data: XMLProductionData): XMLGenerationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this.config.validateBeforeGenerate) {
      errors.push(...this.validateDadosBasicos(data.dadosBasicos));
      errors.push(...this.validateConfiguracaoCV(data.configuracaoCV));
    }

    if (errors.length > 0) {
      return {
        success: false,
        xmlContent: '',
        fileName: '',
        fileSize: 0,
        validationErrors: errors,
        warnings
      };
    }

    const xml = `${XML_DECLARATION.replace('{encoding}', this.config.encoding)}
<a002>
  <LISTA_DADOS_BASICOS>
    <DADOS_BASICOS>
      <NUM_SERIE_ELEMENTO_PRIMARIO>${this.escapeXML(data.dadosBasicos.numSerieElementoPrimario)}</NUM_SERIE_ELEMENTO_PRIMARIO>
      <COD_INSTALACAO>${data.dadosBasicos.codInstalacao}</COD_INSTALACAO>
      <COD_TAG_PONTO_MEDICAO>${this.escapeXML(data.dadosBasicos.codTagPontoMedicao)}</COD_TAG_PONTO_MEDICAO>
      <CONFIGURACAO_CV>
        <NUM_SERIE_COMPUTADOR_VAZAO>${this.escapeXML(data.configuracaoCV.numSerieComputadorVazao)}</NUM_SERIE_COMPUTADOR_VAZAO>
        <DHA_COLETA>${formatDateTimeANP(data.configuracaoCV.dhaColeta)}</DHA_COLETA>
        <MED_TEMPERATURA>${formatRacional(data.configuracaoCV.medTemperatura, 3, 2)}</MED_TEMPERATURA>
        <MED_PRESSAO_ATMSA>${formatRacional(data.configuracaoCV.medPressaoAtmsa, 3, 3)}</MED_PRESSAO_ATMSA>
        <MED_PRESSAO_RFRNA>${formatRacional(data.configuracaoCV.medPressaoRfrna, 3, 3)}</MED_PRESSAO_RFRNA>
        ${data.configuracaoCV.medDensidadeRelativa !== undefined ? 
          `<MED_DENSIDADE_RELATIVA>${formatRacional(data.configuracaoCV.medDensidadeRelativa, 1, 5)}</MED_DENSIDADE_RELATIVA>` : ''}
      </CONFIGURACAO_CV>
      <ELEMENTO_PRIMARIO>
        <ICE_METER_FACTOR_1>${formatRacional(data.elementoPrimario.meterFactor1, 1, 6)}</ICE_METER_FACTOR_1>
      </ELEMENTO_PRIMARIO>
      ${data.producao ? this.generateProducaoXML(data.producao) : ''}
      ${this.generateInstrumentosXML(data.instrumentoPressao, data.instrumentoTemperatura)}
    </DADOS_BASICOS>
  </LISTA_DADOS_BASICOS>
</a002>`;

    const fileName = this.generateFileName('002');
    
    return {
      success: true,
      xmlContent: xml,
      fileName,
      fileSize: new Blob([xml]).size,
      validationErrors: [],
      warnings
    };
  }

  /**
   * Gera XML tipo 003 (Gás Diferencial)
   */
  generateXML003(data: XMLProductionData): XMLGenerationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this.config.validateBeforeGenerate) {
      errors.push(...this.validateDadosBasicos(data.dadosBasicos));
      errors.push(...this.validateConfiguracaoCV(data.configuracaoCV));
      
      // Gás diferencial requer densidade relativa
      if (data.configuracaoCV.medDensidadeRelativa === undefined) {
        errors.push('MED_DENSIDADE_RELATIVA: obrigatório para tipo 003');
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        xmlContent: '',
        fileName: '',
        fileSize: 0,
        validationErrors: errors,
        warnings
      };
    }

    const xml = `${XML_DECLARATION.replace('{encoding}', this.config.encoding)}
<a003>
  <LISTA_DADOS_BASICOS>
    <DADOS_BASICOS>
      <NUM_SERIE_ELEMENTO_PRIMARIO>${this.escapeXML(data.dadosBasicos.numSerieElementoPrimario)}</NUM_SERIE_ELEMENTO_PRIMARIO>
      <COD_INSTALACAO>${data.dadosBasicos.codInstalacao}</COD_INSTALACAO>
      <COD_TAG_PONTO_MEDICAO>${this.escapeXML(data.dadosBasicos.codTagPontoMedicao)}</COD_TAG_PONTO_MEDICAO>
      <CONFIGURACAO_CV>
        <NUM_SERIE_COMPUTADOR_VAZAO>${this.escapeXML(data.configuracaoCV.numSerieComputadorVazao)}</NUM_SERIE_COMPUTADOR_VAZAO>
        <DHA_COLETA>${formatDateTimeANP(data.configuracaoCV.dhaColeta)}</DHA_COLETA>
        <MED_TEMPERATURA>${formatRacional(data.configuracaoCV.medTemperatura, 3, 2)}</MED_TEMPERATURA>
        <MED_PRESSAO_ATMSA>${formatRacional(data.configuracaoCV.medPressaoAtmsa, 3, 3)}</MED_PRESSAO_ATMSA>
        <MED_PRESSAO_RFRNA>${formatRacional(data.configuracaoCV.medPressaoRfrna, 3, 3)}</MED_PRESSAO_RFRNA>
        <MED_DENSIDADE_RELATIVA>${formatRacional(data.configuracaoCV.medDensidadeRelativa!, 1, 5)}</MED_DENSIDADE_RELATIVA>
        ${data.configuracaoCV.dscNormaUtilizadaCalculo ? 
          `<DSC_NORMA_UTILIZADA_CALCULO>${this.escapeXML(data.configuracaoCV.dscNormaUtilizadaCalculo)}</DSC_NORMA_UTILIZADA_CALCULO>` : ''}
      </CONFIGURACAO_CV>
      <ELEMENTO_PRIMARIO>
        <ICE_METER_FACTOR_1>${formatRacional(data.elementoPrimario.meterFactor1, 1, 6)}</ICE_METER_FACTOR_1>
      </ELEMENTO_PRIMARIO>
      ${data.producao ? this.generateProducaoXML(data.producao) : ''}
      ${this.generateInstrumentosXML(data.instrumentoPressao, data.instrumentoTemperatura)}
    </DADOS_BASICOS>
  </LISTA_DADOS_BASICOS>
</a003>`;

    const fileName = this.generateFileName('003');
    
    return {
      success: true,
      xmlContent: xml,
      fileName,
      fileSize: new Blob([xml]).size,
      validationErrors: [],
      warnings
    };
  }

  /**
   * Gera XML tipo 004 (Alarmes & Eventos)
   */
  generateXML004(data: XMLAlarmEventData): XMLGenerationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this.config.validateBeforeGenerate) {
      if (!data.dadosBasicos.numSerieComputadorVazao) {
        errors.push('NUM_SERIE_COMPUTADOR_VAZAO: obrigatório');
      }
      if (!data.dadosBasicos.codInstalacao) {
        errors.push('COD_INSTALACAO: obrigatório');
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        xmlContent: '',
        fileName: '',
        fileSize: 0,
        validationErrors: errors,
        warnings
      };
    }

    // Gera lista de alarmes
    let alarmesXML = '<LISTA_ALARMES />';
    if (data.alarmes.length > 0) {
      const alarmesItems = data.alarmes.map(a => `
      <ALARMES>
        <DSC_DADO_ALARMADO>${this.escapeXML(a.dscDadoAlarmado)}</DSC_DADO_ALARMADO>
        <DHA_ALARME>${formatDateTimeANP(a.dhaAlarme)}</DHA_ALARME>
        <DSC_MEDIDA_ALARMADA>${this.escapeXML(a.dscMedidaAlarmada)}</DSC_MEDIDA_ALARMADA>
      </ALARMES>`).join('');
      alarmesXML = `<LISTA_ALARMES>${alarmesItems}
    </LISTA_ALARMES>`;
    }

    // Gera lista de eventos
    let eventosXML = '<LISTA_EVENTOS />';
    if (data.eventos.length > 0) {
      const eventosItems = data.eventos.map(e => `
      <EVENTOS>
        <DSC_DADO_ALTERADO>${this.escapeXML(e.dscDadoAlterado)}</DSC_DADO_ALTERADO>
        <DSC_CONTEUDO_ORIGINAL>${this.escapeXML(e.dscConteudoOriginal)}</DSC_CONTEUDO_ORIGINAL>
        <DSC_CONTEUDO_ATUAL>${this.escapeXML(e.dscConteudoAtual)}</DSC_CONTEUDO_ATUAL>
        <DHA_OCORRENCIA_EVENTO>${formatDateTimeANP(e.dhaOcorrenciaEvento)}</DHA_OCORRENCIA_EVENTO>
      </EVENTOS>`).join('');
      eventosXML = `<LISTA_EVENTOS>${eventosItems}
    </LISTA_EVENTOS>`;
    }

    const xml = `${XML_DECLARATION.replace('{encoding}', this.config.encoding)}
<a004>
  <LISTA_DADOS_BASICOS>
    <DADOS_BASICOS NUM_SERIE_COMPUTADOR_VAZAO="${this.escapeXML(data.dadosBasicos.numSerieComputadorVazao)}" COD_INSTALACAO="${data.dadosBasicos.codInstalacao}">
      ${alarmesXML}
      ${eventosXML}
    </DADOS_BASICOS>
  </LISTA_DADOS_BASICOS>
</a004>`;

    const fileName = this.generateFileName('004');
    
    return {
      success: true,
      xmlContent: xml,
      fileName,
      fileSize: new Blob([xml]).size,
      validationErrors: [],
      warnings
    };
  }

  /**
   * Gera seção de produção
   */
  private generateProducaoXML(producao: Producao): string {
    return `
      <PRODUCAO>
        <QTD_VOLUME_BRUTO>${formatRacional(producao.volumeBruto, 10, 3)}</QTD_VOLUME_BRUTO>
        <QTD_VOLUME_CORRIGIDO>${formatRacional(producao.volumeCorrigido, 10, 3)}</QTD_VOLUME_CORRIGIDO>
        <QTD_VOLUME_PADRAO>${formatRacional(producao.volumePadrao, 10, 3)}</QTD_VOLUME_PADRAO>
        <QTD_MASSA_TOTAL>${formatRacional(producao.massaTotal, 10, 3)}</QTD_MASSA_TOTAL>
        <QTD_TEMPO_FLUXO>${formatRacional(producao.tempoFluxo, 6, 0)}</QTD_TEMPO_FLUXO>
        <QTD_TOTALIZADOR_INICIO>${formatRacional(producao.totalizadorInicio, 15, 3)}</QTD_TOTALIZADOR_INICIO>
        <QTD_TOTALIZADOR_FIM>${formatRacional(producao.totalizadorFim, 15, 3)}</QTD_TOTALIZADOR_FIM>
      </PRODUCAO>`;
  }

  /**
   * Gera seção de instrumentos
   */
  private generateInstrumentosXML(
    pressao?: Array<{ tag: string; valor: number }>,
    temperatura?: Array<{ tag: string; valor: number }>
  ): string {
    let xml = '';

    if (pressao && pressao.length > 0) {
      xml += '\n      <LISTA_INSTRUMENTO_PRESSAO>';
      for (const p of pressao) {
        xml += `
        <INSTRUMENTO_PRESSAO>
          <COD_TAG>${this.escapeXML(p.tag)}</COD_TAG>
          <MED_PRESSAO>${formatRacional(p.valor, 5, 3)}</MED_PRESSAO>
        </INSTRUMENTO_PRESSAO>`;
      }
      xml += '\n      </LISTA_INSTRUMENTO_PRESSAO>';
    }

    if (temperatura && temperatura.length > 0) {
      xml += '\n      <LISTA_INSTRUMENTO_TEMPERATURA>';
      for (const t of temperatura) {
        xml += `
        <INSTRUMENTO_TEMPERATURA>
          <COD_TAG>${this.escapeXML(t.tag)}</COD_TAG>
          <MED_TEMPERATURA>${formatRacional(t.valor, 3, 2)}</MED_TEMPERATURA>
        </INSTRUMENTO_TEMPERATURA>`;
      }
      xml += '\n      </LISTA_INSTRUMENTO_TEMPERATURA>';
    }

    return xml;
  }

  /**
   * Escapa caracteres especiais XML
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Cria arquivo ZIP com o XML
   */
  async createZipFile(xmlResult: XMLGenerationResult): Promise<Blob | null> {
    if (!xmlResult.success) {
      return null;
    }

    // Usa a biblioteca JSZip se disponível
    try {
      // @ts-expect-error JSZip pode não estar disponível
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      
      zip.file(xmlResult.fileName, xmlResult.xmlContent);
      
      return await zip.generateAsync({ type: 'blob' });
    } catch {
      console.warn('[XMLGenerator] JSZip não disponível, retornando XML sem compactação');
      return new Blob([xmlResult.xmlContent], { type: 'application/xml' });
    }
  }

  /**
   * Baixa o arquivo gerado
   */
  downloadFile(xmlResult: XMLGenerationResult, asZip: boolean = false): void {
    if (!xmlResult.success) {
      console.error('[XMLGenerator] Não é possível baixar arquivo com erros');
      return;
    }

    const content = xmlResult.xmlContent;
    const fileName = asZip 
      ? xmlResult.fileName.replace('.xml', '.zip')
      : xmlResult.fileName;
    const mimeType = asZip ? 'application/zip' : 'application/xml';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// FUNÇÕES DE CONVENIÊNCIA
// ============================================================================

/**
 * Cria gerador com configuração padrão
 */
export function createXMLGenerator(cnpj: string, codInstalacao: string): ANPXMLGenerator {
  return new ANPXMLGenerator({
    cnpjOperador: cnpj,
    codigoInstalacao: codInstalacao,
    encoding: 'UTF-8',
    validateBeforeGenerate: true
  });
}

/**
 * Gera XML tipo 004 vazio (listas vazias)
 */
export function generateEmptyAlarmXML(
  cnpj: string,
  codInstalacao: string,
  numSerieCV: string
): XMLGenerationResult {
  const generator = createXMLGenerator(cnpj, codInstalacao);
  
  return generator.generateXML004({
    dadosBasicos: {
      numSerieComputadorVazao: numSerieCV,
      codInstalacao: codInstalacao
    },
    alarmes: [],
    eventos: []
  });
}

/**
 * Valida XML gerado (básico)
 */
export function validateXML(xmlContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');
    
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      errors.push('XML mal formado: ' + parseError.textContent);
    }
  } catch (e) {
    errors.push('Erro ao parsear XML: ' + (e instanceof Error ? e.message : String(e)));
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default ANPXMLGenerator;
