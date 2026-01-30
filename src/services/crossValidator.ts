/**
 * Serviço de Validação Cruzada Multi-Fonte - MPFM Monitor
 * Compara dados de Excel, PDF e outras fontes
 * Portado do cross_validator.py Python
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type ValidationSource = 'EXCEL' | 'PDF' | 'XML' | 'MANUAL' | 'API';
export type ValidationClassification = 'CONSISTENTE' | 'ACEITAVEL' | 'INCONSISTENTE' | 'FONTE_UNICA' | 'SEM_DADOS';

export interface SourceValue {
  source: ValidationSource;
  value: number | null;
  unit: string;
  timestamp: Date;
  qualityFlags: string[];
}

export interface ValidationTolerance {
  variableCode: string;
  toleranceAbs: number;
  tolerancePct: number;
  unit: string;
  description: string;
}

export interface CrossValidationResult {
  variableCode: string;
  variableDescription: string;
  dateRef: string;
  timeWindow: 'DAY' | 'HOUR' | 'CUMULATIVE';
  assetTag: string;
  
  // Valores por fonte
  values: SourceValue[];
  sourcesAvailable: ValidationSource[];
  sourcesCount: number;
  
  // Resultado
  classification: ValidationClassification;
  referenceValue: number | null;
  maxDeviationAbs: number | null;
  maxDeviationPct: number | null;
  toleranceApplied: number;
  
  // Detalhes
  comparisonDetails: string;
  recommendations: string[];
}

export interface ValidationSummary {
  date: string;
  totalVariables: number;
  consistente: number;
  aceitavel: number;
  inconsistente: number;
  fonteUnica: number;
  semDados: number;
  overallStatus: 'OK' | 'WARNING' | 'CRITICAL';
  criticalVariables: string[];
}

// ============================================================================
// CONSTANTES - TOLERÂNCIAS PADRÃO
// ============================================================================

/**
 * Tolerâncias padrão por tipo de variável
 * Baseado em regulação ANP e boas práticas
 */
const DEFAULT_TOLERANCES: ValidationTolerance[] = [
  // Massa
  { variableCode: 'mass_hc', toleranceAbs: 0.01, tolerancePct: 0.5, unit: 't', description: 'Massa HC' },
  { variableCode: 'mass_total', toleranceAbs: 0.01, tolerancePct: 0.5, unit: 't', description: 'Massa Total' },
  { variableCode: 'mass_oil', toleranceAbs: 0.01, tolerancePct: 0.5, unit: 't', description: 'Massa Óleo' },
  { variableCode: 'mass_gas', toleranceAbs: 0.01, tolerancePct: 0.5, unit: 't', description: 'Massa Gás' },
  { variableCode: 'mass_water', toleranceAbs: 0.01, tolerancePct: 1.0, unit: 't', description: 'Massa Água' },
  
  // Volume
  { variableCode: 'volume_std', toleranceAbs: 0.1, tolerancePct: 0.1, unit: 'Sm³', description: 'Volume padrão' },
  { variableCode: 'volume_gross', toleranceAbs: 0.1, tolerancePct: 0.2, unit: 'm³', description: 'Volume bruto' },
  
  // Energia
  { variableCode: 'energy', toleranceAbs: 1.0, tolerancePct: 1.0, unit: 'GJ', description: 'Energia' },
  
  // Tempo
  { variableCode: 'flow_time', toleranceAbs: 0, tolerancePct: 0, unit: 'min', description: 'Tempo de fluxo (exato)' },
  
  // Fatores
  { variableCode: 'k_factor', toleranceAbs: 0.001, tolerancePct: 0.1, unit: '', description: 'K-Factor' },
  { variableCode: 'meter_factor', toleranceAbs: 0.001, tolerancePct: 0.1, unit: '', description: 'Meter Factor' },
  
  // BSW
  { variableCode: 'bsw', toleranceAbs: 0.5, tolerancePct: 2.0, unit: '%', description: 'BSW' },
  
  // Condições
  { variableCode: 'pressure', toleranceAbs: 5, tolerancePct: 0.5, unit: 'kPa', description: 'Pressão' },
  { variableCode: 'temperature', toleranceAbs: 0.5, tolerancePct: 1.0, unit: '°C', description: 'Temperatura' }
];

// Tolerância padrão quando não encontrada
const FALLBACK_TOLERANCE: ValidationTolerance = {
  variableCode: 'default',
  toleranceAbs: 0.01,
  tolerancePct: 1.0,
  unit: '',
  description: 'Tolerância padrão'
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Encontra tolerância para uma variável
 */
function getTolerance(variableCode: string): ValidationTolerance {
  // Busca exata
  const exact = DEFAULT_TOLERANCES.find(t => t.variableCode === variableCode);
  if (exact) return exact;
  
  // Busca parcial (massa, volume, etc)
  const partial = DEFAULT_TOLERANCES.find(t => 
    variableCode.includes(t.variableCode) || t.variableCode.includes(variableCode.split('_')[0])
  );
  if (partial) return partial;
  
  return FALLBACK_TOLERANCE;
}

/**
 * Calcula tolerância efetiva: max(absoluta, relativa * valor)
 */
function calculateEffectiveTolerance(
  value: number,
  tolerance: ValidationTolerance
): number {
  const absoluteTolerance = tolerance.toleranceAbs;
  const relativeTolerance = Math.abs(value) * (tolerance.tolerancePct / 100);
  return Math.max(absoluteTolerance, relativeTolerance);
}

/**
 * Calcula desvio entre dois valores
 */
function calculateDeviation(value1: number, value2: number): { abs: number; pct: number } {
  const abs = Math.abs(value1 - value2);
  const reference = Math.max(Math.abs(value1), Math.abs(value2), 0.0001);
  const pct = (abs / reference) * 100;
  return { abs, pct };
}

/**
 * Classifica resultado da validação
 */
function classifyValidation(
  maxDeviationAbs: number,
  effectiveTolerance: number
): ValidationClassification {
  if (maxDeviationAbs <= effectiveTolerance) {
    return 'CONSISTENTE';
  } else if (maxDeviationAbs <= effectiveTolerance * 2) {
    return 'ACEITAVEL';
  } else {
    return 'INCONSISTENTE';
  }
}

// ============================================================================
// CLASSE: CrossValidator
// ============================================================================

export class CrossValidator {
  private _tolerances: ValidationTolerance[];
  private results: CrossValidationResult[] = [];

  constructor(customTolerances?: ValidationTolerance[]) {
    this._tolerances = customTolerances || DEFAULT_TOLERANCES;
  }

  /**
   * Obtém tolerâncias configuradas
   */
  getTolerances(): ValidationTolerance[] {
    return [...this._tolerances];
  }

  /**
   * Valida uma variável entre múltiplas fontes
   */
  validateVariable(
    variableCode: string,
    variableDescription: string,
    dateRef: string,
    timeWindow: 'DAY' | 'HOUR' | 'CUMULATIVE',
    assetTag: string,
    sourceValues: SourceValue[]
  ): CrossValidationResult {
    const result: CrossValidationResult = {
      variableCode,
      variableDescription,
      dateRef,
      timeWindow,
      assetTag,
      values: sourceValues,
      sourcesAvailable: [],
      sourcesCount: 0,
      classification: 'SEM_DADOS',
      referenceValue: null,
      maxDeviationAbs: null,
      maxDeviationPct: null,
      toleranceApplied: 0,
      comparisonDetails: '',
      recommendations: []
    };

    // Filtra valores válidos (não null)
    const validValues = sourceValues.filter(sv => sv.value !== null);
    result.sourcesAvailable = validValues.map(sv => sv.source);
    result.sourcesCount = validValues.length;

    // Sem dados
    if (validValues.length === 0) {
      result.classification = 'SEM_DADOS';
      result.comparisonDetails = 'Nenhuma fonte com dados válidos';
      result.recommendations.push('Verificar extração de dados de todas as fontes');
      return result;
    }

    // Fonte única
    if (validValues.length === 1) {
      result.classification = 'FONTE_UNICA';
      result.referenceValue = validValues[0].value;
      result.comparisonDetails = `Apenas fonte ${validValues[0].source} disponível`;
      result.recommendations.push('Importar dados de fontes adicionais para validação cruzada');
      return result;
    }

    // Múltiplas fontes - calcular desvios
    const tolerance = getTolerance(variableCode);
    const values = validValues.map(sv => sv.value!);
    
    // Usa média como referência
    const referenceValue = values.reduce((a, b) => a + b, 0) / values.length;
    result.referenceValue = referenceValue;
    
    // Calcula tolerância efetiva
    result.toleranceApplied = calculateEffectiveTolerance(referenceValue, tolerance);

    // Encontra maior desvio
    let maxDevAbs = 0;
    let maxDevPct = 0;
    const deviationDetails: string[] = [];

    for (let i = 0; i < validValues.length; i++) {
      for (let j = i + 1; j < validValues.length; j++) {
        const dev = calculateDeviation(validValues[i].value!, validValues[j].value!);
        if (dev.abs > maxDevAbs) {
          maxDevAbs = dev.abs;
          maxDevPct = dev.pct;
        }
        deviationDetails.push(
          `${validValues[i].source} vs ${validValues[j].source}: Δ=${dev.abs.toFixed(4)} (${dev.pct.toFixed(2)}%)`
        );
      }
    }

    result.maxDeviationAbs = maxDevAbs;
    result.maxDeviationPct = maxDevPct;
    result.comparisonDetails = deviationDetails.join('; ');

    // Classifica
    result.classification = classifyValidation(maxDevAbs, result.toleranceApplied);

    // Recomendações
    if (result.classification === 'INCONSISTENTE') {
      result.recommendations.push('Investigar discrepância entre fontes');
      result.recommendations.push('Verificar se houve reprocessamento ou correção manual');
      result.recommendations.push('Considerar abertura de não-conformidade se persistir');
    } else if (result.classification === 'ACEITAVEL') {
      result.recommendations.push('Monitorar tendência de desvio nos próximos dias');
    }

    // Salva resultado
    this.results.push(result);

    return result;
  }

  /**
   * Valida conjunto de dados de diferentes fontes
   */
  validateDataSet(
    dateRef: string,
    assetTag: string,
    excelData: Record<string, number | null> | null,
    pdfData: Record<string, number | null> | null,
    manualData?: Record<string, number | null> | null
  ): CrossValidationResult[] {
    const results: CrossValidationResult[] = [];
    
    // Coleta todas as variáveis únicas
    const allVariables = new Set<string>();
    if (excelData) Object.keys(excelData).forEach(k => allVariables.add(k));
    if (pdfData) Object.keys(pdfData).forEach(k => allVariables.add(k));
    if (manualData) Object.keys(manualData).forEach(k => allVariables.add(k));

    // Valida cada variável
    for (const variableCode of allVariables) {
      const sourceValues: SourceValue[] = [];
      const now = new Date();

      if (excelData && excelData[variableCode] !== undefined) {
        sourceValues.push({
          source: 'EXCEL',
          value: excelData[variableCode],
          unit: '',
          timestamp: now,
          qualityFlags: []
        });
      }

      if (pdfData && pdfData[variableCode] !== undefined) {
        sourceValues.push({
          source: 'PDF',
          value: pdfData[variableCode],
          unit: '',
          timestamp: now,
          qualityFlags: []
        });
      }

      if (manualData && manualData[variableCode] !== undefined) {
        sourceValues.push({
          source: 'MANUAL',
          value: manualData[variableCode],
          unit: '',
          timestamp: now,
          qualityFlags: []
        });
      }

      const result = this.validateVariable(
        variableCode,
        variableCode, // Usar código como descrição por padrão
        dateRef,
        'DAY',
        assetTag,
        sourceValues
      );

      results.push(result);
    }

    return results;
  }

  /**
   * Gera resumo de validação para um dia
   */
  generateSummary(date: string, results?: CrossValidationResult[]): ValidationSummary {
    const targetResults = results || this.results.filter(r => r.dateRef === date);

    const summary: ValidationSummary = {
      date,
      totalVariables: targetResults.length,
      consistente: 0,
      aceitavel: 0,
      inconsistente: 0,
      fonteUnica: 0,
      semDados: 0,
      overallStatus: 'OK',
      criticalVariables: []
    };

    for (const result of targetResults) {
      switch (result.classification) {
        case 'CONSISTENTE':
          summary.consistente++;
          break;
        case 'ACEITAVEL':
          summary.aceitavel++;
          break;
        case 'INCONSISTENTE':
          summary.inconsistente++;
          summary.criticalVariables.push(result.variableCode);
          break;
        case 'FONTE_UNICA':
          summary.fonteUnica++;
          break;
        case 'SEM_DADOS':
          summary.semDados++;
          break;
      }
    }

    // Define status geral
    if (summary.inconsistente > 0) {
      summary.overallStatus = 'CRITICAL';
    } else if (summary.aceitavel > 0 || summary.semDados > summary.totalVariables * 0.2) {
      summary.overallStatus = 'WARNING';
    }

    return summary;
  }

  /**
   * Retorna todos os resultados
   */
  getResults(): CrossValidationResult[] {
    return [...this.results];
  }

  /**
   * Limpa resultados
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Exporta resultados para formato de tabela
   */
  exportToTable(): Array<{
    variavel: string;
    data: string;
    asset: string;
    excel: string;
    pdf: string;
    desvio: string;
    status: string;
  }> {
    return this.results.map(r => ({
      variavel: r.variableCode,
      data: r.dateRef,
      asset: r.assetTag,
      excel: r.values.find(v => v.source === 'EXCEL')?.value?.toFixed(4) || '-',
      pdf: r.values.find(v => v.source === 'PDF')?.value?.toFixed(4) || '-',
      desvio: r.maxDeviationPct !== null ? `${r.maxDeviationPct.toFixed(2)}%` : '-',
      status: r.classification
    }));
  }
}

// ============================================================================
// FUNÇÕES DE CONVENIÊNCIA
// ============================================================================

/**
 * Cria validador com tolerâncias padrão
 */
export function createValidator(): CrossValidator {
  return new CrossValidator();
}

/**
 * Validação rápida entre duas fontes
 */
export function quickValidate(
  variableCode: string,
  excelValue: number | null,
  pdfValue: number | null,
  dateRef: string = new Date().toISOString().split('T')[0],
  assetTag: string = 'UNKNOWN'
): CrossValidationResult {
  const validator = new CrossValidator();
  
  const sourceValues: SourceValue[] = [];
  const now = new Date();
  
  if (excelValue !== null) {
    sourceValues.push({
      source: 'EXCEL',
      value: excelValue,
      unit: '',
      timestamp: now,
      qualityFlags: []
    });
  }
  
  if (pdfValue !== null) {
    sourceValues.push({
      source: 'PDF',
      value: pdfValue,
      unit: '',
      timestamp: now,
      qualityFlags: []
    });
  }
  
  return validator.validateVariable(
    variableCode,
    variableCode,
    dateRef,
    'DAY',
    assetTag,
    sourceValues
  );
}

/**
 * Verifica se dados estão consistentes (helper para uso em componentes)
 */
export function isDataConsistent(
  excelValue: number | null,
  pdfValue: number | null,
  tolerancePct: number = 1.0
): boolean {
  if (excelValue === null || pdfValue === null) {
    return true; // Não pode validar sem ambos os valores
  }
  
  const reference = Math.max(Math.abs(excelValue), Math.abs(pdfValue), 0.0001);
  const deviation = Math.abs(excelValue - pdfValue);
  const deviationPct = (deviation / reference) * 100;
  
  return deviationPct <= tolerancePct;
}

/**
 * Calcula status de consistência para exibição
 */
export function getConsistencyStatus(
  classification: ValidationClassification
): { color: string; icon: string; text: string } {
  switch (classification) {
    case 'CONSISTENTE':
      return { color: 'green', icon: '✅', text: 'Consistente' };
    case 'ACEITAVEL':
      return { color: 'yellow', icon: '⚠️', text: 'Aceitável' };
    case 'INCONSISTENTE':
      return { color: 'red', icon: '❌', text: 'Inconsistente' };
    case 'FONTE_UNICA':
      return { color: 'blue', icon: 'ℹ️', text: 'Fonte Única' };
    case 'SEM_DADOS':
      return { color: 'gray', icon: '❓', text: 'Sem Dados' };
    default:
      return { color: 'gray', icon: '?', text: 'Desconhecido' };
  }
}
