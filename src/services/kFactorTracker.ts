/**
 * Serviço de Rastreamento de K-Factors - MPFM Monitor
 * Monitora evolução e detecta desvios consecutivos conforme ANP 44/2015
 */

// Limites ANP 44/2015 específicos para rastreamento de K-Factors
export const KFACTOR_LIMITS = {
  K_FACTOR_MIN: 0.8,
  K_FACTOR_MAX: 1.2,
  K_FACTOR_WARNING_MIN: 0.85,
  K_FACTOR_WARNING_MAX: 1.15,
  CONSECUTIVE_DAYS_TRIGGER: 10,
  CONSECUTIVE_DAYS_WARNING: 7,
  HC_DEVIATION_MAX: 10,
  TOTAL_DEVIATION_MAX: 7,
  BSW_WARNING: 15,
  BSW_CRITICAL: 20,
  CALIBRATION_INTERVAL_DAYS: 180,
  CALIBRATION_WARNING_DAYS: 150,
} as const

export interface KFactorReading {
  date: string
  timestamp: string
  meterId: string
  meterTag: string
  kOil: number
  kGas: number
  kWater: number
  source: 'calculated' | 'imported' | 'manual' | 'calibration'
  isWithinLimits: boolean
}

export interface MeterKFactorStatus {
  meterId: string
  meterTag: string
  meterName: string
  currentKFactors: {
    oil: number
    gas: number
    water: number
  }
  status: 'ok' | 'warning' | 'critical'
  consecutiveDaysOutOfRange: number
  lastCalibrationDate?: string
  daysSinceCalibration: number
  calibrationRequired: boolean
  calibrationReason?: string
  complianceRate: number // % de dias dentro do limite nos últimos 30 dias
  trend: 'improving' | 'stable' | 'degrading'
}

export interface KFactorHistory {
  meterId: string
  readings: KFactorReading[]
  statistics: {
    avgKOil: number
    avgKGas: number
    avgKWater: number
    stdDevKOil: number
    stdDevKGas: number
    stdDevKWater: number
    daysInRange: number
    daysOutOfRange: number
    complianceRate: number
  }
}

const STORAGE_KEY = 'mpfm_kfactor_history'

class KFactorTrackerService {
  private histories: Map<string, KFactorHistory> = new Map()
  private consecutiveDays: Map<string, number> = new Map()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        this.histories = new Map(Object.entries(data.histories || {}))
        this.consecutiveDays = new Map(Object.entries(data.consecutiveDays || {}))
      }
    } catch (error) {
      console.error('[KFactorTracker] Erro ao carregar histórico:', error)
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        histories: Object.fromEntries(this.histories),
        consecutiveDays: Object.fromEntries(this.consecutiveDays),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('[KFactorTracker] Erro ao salvar histórico:', error)
    }
  }

  private isWithinLimits(k: number): boolean {
    return k >= KFACTOR_LIMITS.K_FACTOR_MIN && k <= KFACTOR_LIMITS.K_FACTOR_MAX
  }

  private isNearLimits(k: number): boolean {
    return (
      (k >= KFACTOR_LIMITS.K_FACTOR_MIN && k < KFACTOR_LIMITS.K_FACTOR_WARNING_MIN) ||
      (k > KFACTOR_LIMITS.K_FACTOR_WARNING_MAX && k <= KFACTOR_LIMITS.K_FACTOR_MAX)
    )
  }

  /**
   * Adiciona uma leitura de K-Factor
   */
  addReading(
    meterId: string,
    meterTag: string,
    kOil: number,
    kGas: number,
    kWater: number,
    source: KFactorReading['source'] = 'calculated'
  ): KFactorReading {
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    
    const allWithinLimits = 
      this.isWithinLimits(kOil) && 
      this.isWithinLimits(kGas) && 
      this.isWithinLimits(kWater)

    const reading: KFactorReading = {
      date,
      timestamp: now.toISOString(),
      meterId,
      meterTag,
      kOil,
      kGas,
      kWater,
      source,
      isWithinLimits: allWithinLimits,
    }

    // Atualizar histórico
    let history = this.histories.get(meterId)
    if (!history) {
      history = {
        meterId,
        readings: [],
        statistics: {
          avgKOil: 1, avgKGas: 1, avgKWater: 1,
          stdDevKOil: 0, stdDevKGas: 0, stdDevKWater: 0,
          daysInRange: 0, daysOutOfRange: 0, complianceRate: 100,
        },
      }
    }

    // Evitar duplicatas no mesmo dia
    const existingIdx = history.readings.findIndex(r => r.date === date)
    if (existingIdx >= 0) {
      history.readings[existingIdx] = reading
    } else {
      history.readings.push(reading)
    }

    // Manter últimos 365 dias
    if (history.readings.length > 365) {
      history.readings = history.readings.slice(-365)
    }

    // Atualizar dias consecutivos fora do limite
    this.updateConsecutiveDays(meterId, allWithinLimits)

    // Recalcular estatísticas
    this.updateStatistics(history)

    this.histories.set(meterId, history)
    this.saveToStorage()

    console.log(`[KFactorTracker] Leitura adicionada: ${meterTag} - Oil: ${kOil.toFixed(4)}, Gas: ${kGas.toFixed(4)}, Water: ${kWater.toFixed(4)}`)

    return reading
  }

  private updateConsecutiveDays(meterId: string, withinLimits: boolean): void {
    if (withinLimits) {
      this.consecutiveDays.set(meterId, 0)
    } else {
      const current = this.consecutiveDays.get(meterId) || 0
      this.consecutiveDays.set(meterId, current + 1)
    }
  }

  private updateStatistics(history: KFactorHistory): void {
    const readings = history.readings
    if (readings.length === 0) return

    const kOils = readings.map(r => r.kOil)
    const kGases = readings.map(r => r.kGas)
    const kWaters = readings.map(r => r.kWater)

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
    const stdDev = (arr: number[], mean: number) => 
      Math.sqrt(arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length)

    const avgOil = avg(kOils)
    const avgGas = avg(kGases)
    const avgWater = avg(kWaters)

    const inRange = readings.filter(r => r.isWithinLimits).length

    history.statistics = {
      avgKOil: avgOil,
      avgKGas: avgGas,
      avgKWater: avgWater,
      stdDevKOil: stdDev(kOils, avgOil),
      stdDevKGas: stdDev(kGases, avgGas),
      stdDevKWater: stdDev(kWaters, avgWater),
      daysInRange: inRange,
      daysOutOfRange: readings.length - inRange,
      complianceRate: (inRange / readings.length) * 100,
    }
  }

  /**
   * Obtém dias consecutivos fora do limite
   */
  getConsecutiveDaysOutOfRange(meterId: string): number {
    return this.consecutiveDays.get(meterId) || 0
  }

  /**
   * Verifica se calibração é necessária
   */
  needsCalibration(meterId: string, lastCalibrationDate?: string): {
    required: boolean
    reason?: string
    severity: 'warning' | 'critical' | 'none'
    daysOutOfRange: number
    daysSinceCalibration: number
  } {
    const days = this.getConsecutiveDaysOutOfRange(meterId)
    
    // Calcular dias desde última calibração
    let daysSinceCalibration = 0
    if (lastCalibrationDate) {
      const lastCal = new Date(lastCalibrationDate)
      daysSinceCalibration = Math.floor(
        (Date.now() - lastCal.getTime()) / (1000 * 60 * 60 * 24)
      )
    } else {
      daysSinceCalibration = 365 // Assumir que nunca foi calibrado
    }

    // Regra 10 dias consecutivos (ANP 44/2015)
    if (days >= KFACTOR_LIMITS.CONSECUTIVE_DAYS_TRIGGER) {
      return {
        required: true,
        reason: `K-Factor fora do limite por ${days} dias consecutivos (ANP 44/2015 Art. 12)`,
        severity: 'critical',
        daysOutOfRange: days,
        daysSinceCalibration,
      }
    }

    // Calibração periódica vencida
    if (daysSinceCalibration > KFACTOR_LIMITS.CALIBRATION_INTERVAL_DAYS) {
      return {
        required: true,
        reason: `Calibração periódica vencida (${daysSinceCalibration} dias desde última calibração)`,
        severity: 'critical',
        daysOutOfRange: days,
        daysSinceCalibration,
      }
    }

    // Alertas de aviso
    if (days >= KFACTOR_LIMITS.CONSECUTIVE_DAYS_WARNING) {
      return {
        required: false,
        reason: `Atenção: ${days} dias consecutivos fora do limite. Calibração obrigatória em ${KFACTOR_LIMITS.CONSECUTIVE_DAYS_TRIGGER - days} dias.`,
        severity: 'warning',
        daysOutOfRange: days,
        daysSinceCalibration,
      }
    }

    if (daysSinceCalibration > KFACTOR_LIMITS.CALIBRATION_WARNING_DAYS) {
      return {
        required: false,
        reason: `Calibração periódica vence em ${KFACTOR_LIMITS.CALIBRATION_INTERVAL_DAYS - daysSinceCalibration} dias`,
        severity: 'warning',
        daysOutOfRange: days,
        daysSinceCalibration,
      }
    }

    return {
      required: false,
      severity: 'none',
      daysOutOfRange: days,
      daysSinceCalibration,
    }
  }

  /**
   * Obtém o status completo de K-Factor para um medidor
   */
  getMeterStatus(
    meterId: string,
    meterTag: string,
    meterName: string,
    currentKFactors: { oil: number; gas: number; water: number },
    lastCalibrationDate?: string
  ): MeterKFactorStatus {
    const calibration = this.needsCalibration(meterId, lastCalibrationDate)
    const history = this.histories.get(meterId)
    
    // Determinar status
    let status: MeterKFactorStatus['status'] = 'ok'
    if (calibration.severity === 'critical') {
      status = 'critical'
    } else if (calibration.severity === 'warning') {
      status = 'warning'
    } else {
      // Verificar se K-Factors atuais estão perto do limite
      const { oil, gas, water } = currentKFactors
      if (this.isNearLimits(oil) || this.isNearLimits(gas) || this.isNearLimits(water)) {
        status = 'warning'
      }
    }

    // Determinar tendência (últimos 7 dias vs anterior)
    let trend: MeterKFactorStatus['trend'] = 'stable'
    if (history && history.readings.length >= 14) {
      const recent = history.readings.slice(-7)
      const previous = history.readings.slice(-14, -7)
      
      const recentOOL = recent.filter(r => !r.isWithinLimits).length
      const previousOOL = previous.filter(r => !r.isWithinLimits).length
      
      if (recentOOL < previousOOL) trend = 'improving'
      else if (recentOOL > previousOOL) trend = 'degrading'
    }

    return {
      meterId,
      meterTag,
      meterName,
      currentKFactors,
      status,
      consecutiveDaysOutOfRange: calibration.daysOutOfRange,
      lastCalibrationDate,
      daysSinceCalibration: calibration.daysSinceCalibration,
      calibrationRequired: calibration.required,
      calibrationReason: calibration.reason,
      complianceRate: history?.statistics.complianceRate || 100,
      trend,
    }
  }

  /**
   * Obtém histórico de um medidor
   */
  getHistory(meterId: string): KFactorHistory | undefined {
    return this.histories.get(meterId)
  }

  /**
   * Registra que uma calibração foi realizada
   */
  recordCalibration(meterId: string, kOil: number, kGas: number, kWater: number): void {
    // Resetar contador de dias consecutivos
    this.consecutiveDays.set(meterId, 0)
    
    // Adicionar leitura como calibração
    const history = this.histories.get(meterId)
    if (history) {
      this.addReading(meterId, history.readings[0]?.meterTag || meterId, kOil, kGas, kWater, 'calibration')
    }
    
    this.saveToStorage()
    console.log(`[KFactorTracker] Calibração registrada para ${meterId}`)
  }

  /**
   * Limpa dados (apenas desenvolvimento)
   */
  clearAll(): void {
    if (import.meta.env.PROD) return
    this.histories.clear()
    this.consecutiveDays.clear()
    this.saveToStorage()
  }
}

// Singleton
export const kFactorTracker = new KFactorTrackerService()

export default kFactorTracker
