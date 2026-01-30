/**
 * Analisador Diário - MPFM Monitor
 * Análise automática de dados diários e geração de alertas inteligentes
 * Portado do daily_analyzer.py Python
 */

import { alertEngine, type Alert, type AlertSeverity } from './alertEngine';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type DailyAlertType = 
  | 'BSW_HIGH'
  | 'GAS_BALANCE_ERROR'
  | 'PRODUCTION_VARIATION'
  | 'MISSING_DATA'
  | 'CROSS_VALIDATION_FAIL'
  | 'RECONCILIATION_FAIL'
  | 'K_FACTOR_TREND'
  | 'CONSECUTIVE_DEVIATION';

export interface DailyAlertConfig {
  type: DailyAlertType;
  warningThreshold: number;
  criticalThreshold: number;
  unit: string;
  description: string;
  enabled: boolean;
}

export interface DailyData {
  date: string;
  assetTag: string;
  source: 'TOPSIDE' | 'SUBSEA' | 'SEPARATOR';
  
  // Produção
  oil?: number;
  gas?: number;
  water?: number;
  hc?: number;
  total?: number;
  
  // BSW
  bsw?: number;
  
  // Balanço de gás
  gasProduced?: number;
  gasExport?: number;
  gasLift?: number;
  gasFuel?: number;
  gasFlare?: number;
  
  // K-Factors
  kOil?: number;
  kGas?: number;
  kWater?: number;
  
  // Metadados
  dataCompleteness?: number; // 0-100%
  sourcesCount?: number;
}

export interface DailyAnalysisResult {
  date: string;
  assetTag: string;
  alertsGenerated: Alert[];
  anomaliesDetected: AnomalyDetection[];
  recommendations: string[];
  overallStatus: 'OK' | 'WARNING' | 'CRITICAL';
}

export interface AnomalyDetection {
  type: DailyAlertType;
  variable: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  deviationPct: number;
  severity: AlertSeverity;
  message: string;
}

export interface HistoricalStats {
  variable: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

// ============================================================================
// CONFIGURAÇÃO DE ALERTAS
// ============================================================================

const ALERT_CONFIGS: DailyAlertConfig[] = [
  {
    type: 'BSW_HIGH',
    warningThreshold: 30,
    criticalThreshold: 50,
    unit: '%',
    description: 'BSW (Basic Sediment & Water) acima do limite',
    enabled: true
  },
  {
    type: 'GAS_BALANCE_ERROR',
    warningThreshold: 1,
    criticalThreshold: 2,
    unit: '%',
    description: 'Erro no balanço de gás (entradas - saídas)',
    enabled: true
  },
  {
    type: 'PRODUCTION_VARIATION',
    warningThreshold: 15,
    criticalThreshold: 25,
    unit: '%',
    description: 'Variação de produção em relação à média histórica',
    enabled: true
  },
  {
    type: 'MISSING_DATA',
    warningThreshold: 10,
    criticalThreshold: 30,
    unit: '%',
    description: 'Dados faltantes detectados',
    enabled: true
  },
  {
    type: 'CROSS_VALIDATION_FAIL',
    warningThreshold: 1,
    criticalThreshold: 3,
    unit: 'variáveis',
    description: 'Variáveis inconsistentes entre fontes',
    enabled: true
  },
  {
    type: 'RECONCILIATION_FAIL',
    warningThreshold: 0.05,
    criticalThreshold: 0.1,
    unit: '%',
    description: 'Erro na reconciliação Hourly vs Daily',
    enabled: true
  },
  {
    type: 'K_FACTOR_TREND',
    warningThreshold: 3,
    criticalThreshold: 5,
    unit: 'dias',
    description: 'Tendência de K-Factor em direção ao limite',
    enabled: true
  },
  {
    type: 'CONSECUTIVE_DEVIATION',
    warningThreshold: 7,
    criticalThreshold: 10,
    unit: 'dias',
    description: 'Desvio consecutivo acima do limite',
    enabled: true
  }
];

// ============================================================================
// CLASSE: DailyAnalyzer
// ============================================================================

export class DailyAnalyzer {
  private configs: DailyAlertConfig[];
  private historicalData: Map<string, DailyData[]> = new Map();

  constructor(customConfigs?: DailyAlertConfig[]) {
    this.configs = customConfigs || ALERT_CONFIGS;
  }

  /**
   * Adiciona dados históricos para análise de tendência
   */
  addHistoricalData(data: DailyData): void {
    const key = `${data.assetTag}_${data.source}`;
    if (!this.historicalData.has(key)) {
      this.historicalData.set(key, []);
    }
    this.historicalData.get(key)!.push(data);
    
    // Mantém últimos 90 dias
    const history = this.historicalData.get(key)!;
    if (history.length > 90) {
      history.shift();
    }
  }

  /**
   * Calcula estatísticas históricas
   */
  calculateStats(assetTag: string, source: string, variable: keyof DailyData): HistoricalStats | null {
    const key = `${assetTag}_${source}`;
    const history = this.historicalData.get(key);
    
    if (!history || history.length < 7) {
      return null;
    }
    
    const values = history
      .map(d => d[variable] as number | undefined)
      .filter((v): v is number => v !== undefined && v !== null);
    
    if (values.length === 0) {
      return null;
    }
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      variable: variable as string,
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  /**
   * Verifica alerta de BSW alto
   */
  private checkBSWHigh(data: DailyData): AnomalyDetection | null {
    const config = this.configs.find(c => c.type === 'BSW_HIGH');
    if (!config?.enabled || data.bsw === undefined) {
      return null;
    }
    
    if (data.bsw >= config.criticalThreshold) {
      return {
        type: 'BSW_HIGH',
        variable: 'bsw',
        currentValue: data.bsw,
        expectedValue: config.warningThreshold,
        deviation: data.bsw - config.warningThreshold,
        deviationPct: ((data.bsw - config.warningThreshold) / config.warningThreshold) * 100,
        severity: 'critical',
        message: `BSW crítico em ${data.bsw.toFixed(1)}% (limite: ${config.criticalThreshold}%)`
      };
    } else if (data.bsw >= config.warningThreshold) {
      return {
        type: 'BSW_HIGH',
        variable: 'bsw',
        currentValue: data.bsw,
        expectedValue: config.warningThreshold,
        deviation: data.bsw - config.warningThreshold,
        deviationPct: ((data.bsw - config.warningThreshold) / config.warningThreshold) * 100,
        severity: 'warning',
        message: `BSW elevado em ${data.bsw.toFixed(1)}% (limite: ${config.warningThreshold}%)`
      };
    }
    
    return null;
  }

  /**
   * Verifica erro no balanço de gás
   */
  private checkGasBalance(data: DailyData): AnomalyDetection | null {
    const config = this.configs.find(c => c.type === 'GAS_BALANCE_ERROR');
    if (!config?.enabled) {
      return null;
    }
    
    // Calcula balanço: Produzido - (Export + Lift + Fuel + Flare)
    const produced = data.gasProduced ?? data.gas ?? 0;
    const consumed = (data.gasExport ?? 0) + (data.gasLift ?? 0) + (data.gasFuel ?? 0) + (data.gasFlare ?? 0);
    
    if (produced === 0 && consumed === 0) {
      return null;
    }
    
    const reference = Math.max(produced, consumed, 0.001);
    const balance = produced - consumed;
    const balanceErrorPct = Math.abs(balance / reference) * 100;
    
    if (balanceErrorPct >= config.criticalThreshold) {
      return {
        type: 'GAS_BALANCE_ERROR',
        variable: 'gas_balance',
        currentValue: balanceErrorPct,
        expectedValue: 0,
        deviation: balance,
        deviationPct: balanceErrorPct,
        severity: 'critical',
        message: `Erro crítico no balanço de gás: ${balanceErrorPct.toFixed(2)}% (tolerância: ${config.criticalThreshold}%)`
      };
    } else if (balanceErrorPct >= config.warningThreshold) {
      return {
        type: 'GAS_BALANCE_ERROR',
        variable: 'gas_balance',
        currentValue: balanceErrorPct,
        expectedValue: 0,
        deviation: balance,
        deviationPct: balanceErrorPct,
        severity: 'warning',
        message: `Aviso no balanço de gás: ${balanceErrorPct.toFixed(2)}% (tolerância: ${config.warningThreshold}%)`
      };
    }
    
    return null;
  }

  /**
   * Verifica variação de produção em relação ao histórico
   */
  private checkProductionVariation(data: DailyData): AnomalyDetection | null {
    const config = this.configs.find(c => c.type === 'PRODUCTION_VARIATION');
    if (!config?.enabled) {
      return null;
    }
    
    // Verifica óleo primeiro, depois HC
    const currentProd = data.oil ?? data.hc ?? 0;
    if (currentProd === 0) {
      return null;
    }
    
    const stats = this.calculateStats(data.assetTag, data.source, data.oil !== undefined ? 'oil' : 'hc');
    if (!stats || stats.mean === 0) {
      return null;
    }
    
    const variationPct = Math.abs((currentProd - stats.mean) / stats.mean) * 100;
    
    if (variationPct >= config.criticalThreshold) {
      return {
        type: 'PRODUCTION_VARIATION',
        variable: data.oil !== undefined ? 'oil' : 'hc',
        currentValue: currentProd,
        expectedValue: stats.mean,
        deviation: currentProd - stats.mean,
        deviationPct: variationPct,
        severity: 'critical',
        message: `Variação crítica de produção: ${variationPct.toFixed(1)}% (média: ${stats.mean.toFixed(2)}, atual: ${currentProd.toFixed(2)})`
      };
    } else if (variationPct >= config.warningThreshold) {
      return {
        type: 'PRODUCTION_VARIATION',
        variable: data.oil !== undefined ? 'oil' : 'hc',
        currentValue: currentProd,
        expectedValue: stats.mean,
        deviation: currentProd - stats.mean,
        deviationPct: variationPct,
        severity: 'warning',
        message: `Variação de produção: ${variationPct.toFixed(1)}% da média histórica`
      };
    }
    
    return null;
  }

  /**
   * Verifica dados faltantes
   */
  private checkMissingData(data: DailyData): AnomalyDetection | null {
    const config = this.configs.find(c => c.type === 'MISSING_DATA');
    if (!config?.enabled) {
      return null;
    }
    
    // Calcula completude dos dados
    const requiredFields: (keyof DailyData)[] = ['oil', 'gas', 'water', 'hc', 'total'];
    const presentFields = requiredFields.filter(f => data[f] !== undefined && data[f] !== null);
    const completeness = (presentFields.length / requiredFields.length) * 100;
    const missingPct = 100 - completeness;
    
    if (missingPct >= config.criticalThreshold) {
      return {
        type: 'MISSING_DATA',
        variable: 'data_completeness',
        currentValue: missingPct,
        expectedValue: 0,
        deviation: missingPct,
        deviationPct: missingPct,
        severity: 'critical',
        message: `${missingPct.toFixed(0)}% dos dados obrigatórios faltantes`
      };
    } else if (missingPct >= config.warningThreshold) {
      return {
        type: 'MISSING_DATA',
        variable: 'data_completeness',
        currentValue: missingPct,
        expectedValue: 0,
        deviation: missingPct,
        deviationPct: missingPct,
        severity: 'warning',
        message: `${missingPct.toFixed(0)}% dos dados faltantes`
      };
    }
    
    return null;
  }

  /**
   * Analisa dados diários e gera alertas
   */
  analyze(data: DailyData): DailyAnalysisResult {
    const result: DailyAnalysisResult = {
      date: data.date,
      assetTag: data.assetTag,
      alertsGenerated: [],
      anomaliesDetected: [],
      recommendations: [],
      overallStatus: 'OK'
    };
    
    // Adiciona aos dados históricos
    this.addHistoricalData(data);
    
    // Executa verificações
    const checks = [
      this.checkBSWHigh(data),
      this.checkGasBalance(data),
      this.checkProductionVariation(data),
      this.checkMissingData(data)
    ];
    
    let hasCritical = false;
    let hasWarning = false;
    
    for (const anomaly of checks) {
      if (anomaly) {
        result.anomaliesDetected.push(anomaly);
        
        if (anomaly.severity === 'critical') {
          hasCritical = true;
        } else if (anomaly.severity === 'warning') {
          hasWarning = true;
        }
        
        // Gera alerta no engine
        const alert = alertEngine.createAlert({
          meterId: data.assetTag,
          meterTag: data.assetTag,
          category: this.mapAnomalyToCategory(anomaly.type),
          severity: anomaly.severity,
          title: this.formatAlertTitle(anomaly),
          description: anomaly.message,
          value: anomaly.currentValue,
          threshold: anomaly.expectedValue,
          unit: this.getUnit(anomaly.type),
          source: 'automatic'
        });
        
        result.alertsGenerated.push(alert);
      }
    }
    
    // Define status geral
    if (hasCritical) {
      result.overallStatus = 'CRITICAL';
    } else if (hasWarning) {
      result.overallStatus = 'WARNING';
    }
    
    // Gera recomendações
    result.recommendations = this.generateRecommendations(result);
    
    return result;
  }

  /**
   * Mapeia tipo de anomalia para categoria de alerta
   */
  private mapAnomalyToCategory(type: DailyAlertType): 'bsw' | 'production' | 'deviation' | 'compliance' {
    switch (type) {
      case 'BSW_HIGH':
        return 'bsw';
      case 'GAS_BALANCE_ERROR':
      case 'PRODUCTION_VARIATION':
        return 'production';
      case 'CROSS_VALIDATION_FAIL':
      case 'RECONCILIATION_FAIL':
        return 'deviation';
      default:
        return 'compliance';
    }
  }

  /**
   * Formata título do alerta
   */
  private formatAlertTitle(anomaly: AnomalyDetection): string {
    const titles: Record<DailyAlertType, string> = {
      'BSW_HIGH': 'BSW Elevado',
      'GAS_BALANCE_ERROR': 'Erro no Balanço de Gás',
      'PRODUCTION_VARIATION': 'Variação de Produção',
      'MISSING_DATA': 'Dados Faltantes',
      'CROSS_VALIDATION_FAIL': 'Validação Cruzada Falhou',
      'RECONCILIATION_FAIL': 'Reconciliação Falhou',
      'K_FACTOR_TREND': 'Tendência K-Factor',
      'CONSECUTIVE_DEVIATION': 'Desvio Consecutivo'
    };
    return titles[anomaly.type] || anomaly.type;
  }

  /**
   * Obtém unidade para tipo de alerta
   */
  private getUnit(type: DailyAlertType): string {
    const config = this.configs.find(c => c.type === type);
    return config?.unit || '%';
  }

  /**
   * Gera recomendações baseadas nos resultados
   */
  private generateRecommendations(result: DailyAnalysisResult): string[] {
    const recommendations: string[] = [];
    
    for (const anomaly of result.anomaliesDetected) {
      switch (anomaly.type) {
        case 'BSW_HIGH':
          recommendations.push('Verificar condições do separador');
          recommendations.push('Analisar histórico de BSW dos últimos 7 dias');
          if (anomaly.severity === 'critical') {
            recommendations.push('Considerar amostragem manual para confirmação');
          }
          break;
          
        case 'GAS_BALANCE_ERROR':
          recommendations.push('Verificar totalizadores de gás');
          recommendations.push('Conferir medição de gás de exportação e flare');
          recommendations.push('Verificar se há vazamentos no sistema');
          break;
          
        case 'PRODUCTION_VARIATION':
          recommendations.push('Verificar condições operacionais dos poços');
          recommendations.push('Analisar se houve parada programada');
          recommendations.push('Comparar com dados do dia anterior');
          break;
          
        case 'MISSING_DATA':
          recommendations.push('Verificar conexão com sistemas de aquisição');
          recommendations.push('Revisar arquivos de importação');
          recommendations.push('Contatar operação para dados manuais');
          break;
      }
    }
    
    // Remove duplicatas
    return [...new Set(recommendations)];
  }

  /**
   * Analisa tendência de uma variável
   */
  analyzeTrend(
    assetTag: string,
    source: string,
    variable: keyof DailyData,
    windowDays: number = 7
  ): {
    trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'INSUFFICIENT_DATA';
    slope: number;
    r2: number;
  } {
    const key = `${assetTag}_${source}`;
    const history = this.historicalData.get(key);
    
    if (!history || history.length < windowDays) {
      return { trend: 'INSUFFICIENT_DATA', slope: 0, r2: 0 };
    }
    
    const recentData = history.slice(-windowDays);
    const values = recentData
      .map(d => d[variable] as number | undefined)
      .filter((v): v is number => v !== undefined);
    
    if (values.length < 3) {
      return { trend: 'INSUFFICIENT_DATA', slope: 0, r2: 0 };
    }
    
    // Regressão linear simples
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }
    
    const slope = numerator / denominator;
    
    // Calcula R²
    const yPredicted = values.map((_, i) => yMean + slope * (i - xMean));
    const ssRes = values.reduce((sum, y, i) => sum + Math.pow(y - yPredicted[i], 2), 0);
    const ssTot = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const r2 = 1 - (ssRes / ssTot);
    
    // Classifica tendência
    const significantSlope = Math.abs(slope) > yMean * 0.01; // 1% da média
    let trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    
    if (r2 < 0.5 || !significantSlope) {
      trend = 'STABLE';
    } else if (slope > 0) {
      trend = 'INCREASING';
    } else {
      trend = 'DECREASING';
    }
    
    return { trend, slope, r2 };
  }

  /**
   * Obtém configurações de alerta
   */
  getConfigs(): DailyAlertConfig[] {
    return [...this.configs];
  }

  /**
   * Atualiza configuração de alerta
   */
  updateConfig(type: DailyAlertType, updates: Partial<DailyAlertConfig>): void {
    const index = this.configs.findIndex(c => c.type === type);
    if (index !== -1) {
      this.configs[index] = { ...this.configs[index], ...updates };
    }
  }

  /**
   * Obtém dados históricos
   */
  getHistoricalData(assetTag: string, source: string): DailyData[] {
    const key = `${assetTag}_${source}`;
    return this.historicalData.get(key) || [];
  }

  /**
   * Limpa dados históricos
   */
  clearHistory(): void {
    this.historicalData.clear();
  }
}

// ============================================================================
// FUNÇÕES DE CONVENIÊNCIA
// ============================================================================

/**
 * Cria analisador com configurações padrão
 */
export function createDailyAnalyzer(): DailyAnalyzer {
  return new DailyAnalyzer();
}

/**
 * Análise rápida de dados diários
 */
export function quickAnalyze(data: DailyData): DailyAnalysisResult {
  const analyzer = new DailyAnalyzer();
  return analyzer.analyze(data);
}

/**
 * Verifica se valor excede threshold
 */
export function checkThreshold(
  value: number,
  warningThreshold: number,
  criticalThreshold: number
): { exceeded: boolean; severity: AlertSeverity | null } {
  if (value >= criticalThreshold) {
    return { exceeded: true, severity: 'critical' };
  } else if (value >= warningThreshold) {
    return { exceeded: true, severity: 'warning' };
  }
  return { exceeded: false, severity: null };
}

// Singleton para uso global
export const dailyAnalyzer = new DailyAnalyzer();

export default dailyAnalyzer;
