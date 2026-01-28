/**
 * Motor de Alertas - MPFM Monitor
 * Detecta e gerencia alertas em tempo real conforme ANP 44/2015
 */

import { KFACTOR_LIMITS } from './kFactorTracker'

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertCategory = 
  | 'k_factor' 
  | 'deviation' 
  | 'production' 
  | 'calibration' 
  | 'bsw' 
  | 'equipment'
  | 'compliance'

export interface Alert {
  id: string
  timestamp: string
  meterId?: string
  meterTag?: string
  category: AlertCategory
  severity: AlertSeverity
  title: string
  description: string
  value?: number
  threshold?: number
  unit?: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  resolved: boolean
  resolvedAt?: string
  resolutionNote?: string
  source: 'automatic' | 'manual' | 'system'
}

export interface AlertRule {
  id: string
  name: string
  category: AlertCategory
  condition: (data: AlertCheckData) => boolean
  severity: AlertSeverity
  titleTemplate: string
  descriptionTemplate: string
  enabled: boolean
}

export interface AlertCheckData {
  meterId?: string
  meterTag?: string
  meterName?: string
  kOil?: number
  kGas?: number
  kWater?: number
  bsw?: number
  oilDeviation?: number
  gasDeviation?: number
  waterDeviation?: number
  totalDeviation?: number
  productionOil?: number
  productionGas?: number
  consecutiveDaysOutOfRange?: number
  daysSinceCalibration?: number
  customData?: Record<string, unknown>
}

const STORAGE_KEY = 'mpfm_alerts'

class AlertEngineService {
  private alerts: Alert[] = []
  private rules: AlertRule[] = []
  private listeners: Set<(alerts: Alert[]) => void> = new Set()

  constructor() {
    this.loadFromStorage()
    this.initializeDefaultRules()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.alerts = JSON.parse(stored)
      }
    } catch (error) {
      console.error('[AlertEngine] Erro ao carregar alertas:', error)
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts))
      this.notifyListeners()
    } catch (error) {
      console.error('[AlertEngine] Erro ao salvar alertas:', error)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.alerts]))
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private initializeDefaultRules(): void {
    this.rules = [
      // K-Factor fora do limite
      {
        id: 'k_factor_out_of_range',
        name: 'K-Factor Fora do Limite',
        category: 'k_factor',
        condition: (data) => {
          if (!data.kOil || !data.kGas || !data.kWater) return false
          return (
            data.kOil < KFACTOR_LIMITS.K_FACTOR_MIN || data.kOil > KFACTOR_LIMITS.K_FACTOR_MAX ||
            data.kGas < KFACTOR_LIMITS.K_FACTOR_MIN || data.kGas > KFACTOR_LIMITS.K_FACTOR_MAX ||
            data.kWater < KFACTOR_LIMITS.K_FACTOR_MIN || data.kWater > KFACTOR_LIMITS.K_FACTOR_MAX
          )
        },
        severity: 'warning',
        titleTemplate: 'K-Factor fora do limite - {meterTag}',
        descriptionTemplate: 'K-Factor(s) fora do intervalo permitido (0.8 - 1.2). K-Oil: {kOil}, K-Gas: {kGas}, K-Water: {kWater}',
        enabled: true,
      },

      // Dias consecutivos - aviso (7 dias)
      {
        id: 'consecutive_days_warning',
        name: 'Dias Consecutivos - Aviso',
        category: 'calibration',
        condition: (data) => {
          const days = data.consecutiveDaysOutOfRange || 0
          return days >= KFACTOR_LIMITS.CONSECUTIVE_DAYS_WARNING && days < KFACTOR_LIMITS.CONSECUTIVE_DAYS_TRIGGER
        },
        severity: 'warning',
        titleTemplate: 'Atenção: {consecutiveDaysOutOfRange} dias consecutivos fora do limite',
        descriptionTemplate: 'Medidor {meterTag} está fora do limite por {consecutiveDaysOutOfRange} dias. Calibração obrigatória em {daysRemaining} dias.',
        enabled: true,
      },

      // Dias consecutivos - crítico (10 dias)
      {
        id: 'consecutive_days_critical',
        name: 'Dias Consecutivos - Crítico',
        category: 'calibration',
        condition: (data) => (data.consecutiveDaysOutOfRange || 0) >= KFACTOR_LIMITS.CONSECUTIVE_DAYS_TRIGGER,
        severity: 'critical',
        titleTemplate: 'CALIBRAÇÃO OBRIGATÓRIA - {meterTag}',
        descriptionTemplate: 'K-Factor fora do limite por {consecutiveDaysOutOfRange} dias consecutivos. Calibração obrigatória conforme ANP 44/2015 Art. 12.',
        enabled: true,
      },

      // Desvio HC > 10%
      {
        id: 'hc_deviation_exceeded',
        name: 'Desvio HC Excedido',
        category: 'deviation',
        condition: (data) => {
          const oilDev = Math.abs(data.oilDeviation || 0)
          const gasDev = Math.abs(data.gasDeviation || 0)
          return oilDev > KFACTOR_LIMITS.HC_DEVIATION_MAX || gasDev > KFACTOR_LIMITS.HC_DEVIATION_MAX
        },
        severity: 'critical',
        titleTemplate: 'Desvio de HC excedido - {meterTag}',
        descriptionTemplate: 'Desvio de hidrocarboneto excede limite de ±10%. Óleo: {oilDeviation}%, Gás: {gasDeviation}%',
        enabled: true,
      },

      // Desvio Total > 7%
      {
        id: 'total_deviation_exceeded',
        name: 'Desvio Total Excedido',
        category: 'deviation',
        condition: (data) => Math.abs(data.totalDeviation || 0) > KFACTOR_LIMITS.TOTAL_DEVIATION_MAX,
        severity: 'warning',
        titleTemplate: 'Desvio total excedido - {meterTag}',
        descriptionTemplate: 'Desvio total excede limite de ±7%. Valor: {totalDeviation}%',
        enabled: true,
      },

      // BSW alto - aviso
      {
        id: 'bsw_warning',
        name: 'BSW Elevado',
        category: 'bsw',
        condition: (data) => {
          const bsw = data.bsw || 0
          return bsw >= KFACTOR_LIMITS.BSW_WARNING && bsw < KFACTOR_LIMITS.BSW_CRITICAL
        },
        severity: 'warning',
        titleTemplate: 'BSW elevado - {meterTag}',
        descriptionTemplate: 'BSW em {bsw}% - acima do limite de advertência de {threshold}%',
        enabled: true,
      },

      // BSW crítico
      {
        id: 'bsw_critical',
        name: 'BSW Crítico',
        category: 'bsw',
        condition: (data) => (data.bsw || 0) >= KFACTOR_LIMITS.BSW_CRITICAL,
        severity: 'critical',
        titleTemplate: 'BSW crítico - {meterTag}',
        descriptionTemplate: 'BSW em {bsw}% - impacta significativamente a qualidade do óleo',
        enabled: true,
      },

      // Calibração periódica - aviso
      {
        id: 'calibration_due_warning',
        name: 'Calibração Periódica - Aviso',
        category: 'calibration',
        condition: (data) => {
          const days = data.daysSinceCalibration || 0
          return days >= KFACTOR_LIMITS.CALIBRATION_WARNING_DAYS && days < KFACTOR_LIMITS.CALIBRATION_INTERVAL_DAYS
        },
        severity: 'info',
        titleTemplate: 'Calibração periódica se aproximando - {meterTag}',
        descriptionTemplate: 'Última calibração há {daysSinceCalibration} dias. Vence em {daysRemaining} dias.',
        enabled: true,
      },

      // Calibração periódica - vencida
      {
        id: 'calibration_overdue',
        name: 'Calibração Periódica Vencida',
        category: 'calibration',
        condition: (data) => (data.daysSinceCalibration || 0) > KFACTOR_LIMITS.CALIBRATION_INTERVAL_DAYS,
        severity: 'critical',
        titleTemplate: 'CALIBRAÇÃO VENCIDA - {meterTag}',
        descriptionTemplate: 'Calibração periódica vencida há {overdueDays} dias. Verificar conformidade ANP.',
        enabled: true,
      },
    ]
  }

  private processTemplate(template: string, data: AlertCheckData): string {
    let result = template
    
    // Substituir variáveis
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      result = result.replace(regex, String(value ?? 'N/A'))
    })

    // Variáveis calculadas
    if (data.consecutiveDaysOutOfRange) {
      const daysRemaining = KFACTOR_LIMITS.CONSECUTIVE_DAYS_TRIGGER - data.consecutiveDaysOutOfRange
      result = result.replace(/\{daysRemaining\}/g, String(Math.max(0, daysRemaining)))
    }

    if (data.daysSinceCalibration) {
      const daysRemaining = KFACTOR_LIMITS.CALIBRATION_INTERVAL_DAYS - data.daysSinceCalibration
      result = result.replace(/\{daysRemaining\}/g, String(Math.max(0, daysRemaining)))
      const overdueDays = data.daysSinceCalibration - KFACTOR_LIMITS.CALIBRATION_INTERVAL_DAYS
      result = result.replace(/\{overdueDays\}/g, String(Math.max(0, overdueDays)))
    }

    result = result.replace(/\{threshold\}/g, String(KFACTOR_LIMITS.BSW_WARNING))

    return result
  }

  /**
   * Verifica dados e gera alertas automaticamente
   */
  checkAndGenerateAlerts(data: AlertCheckData): Alert[] {
    const newAlerts: Alert[] = []

    for (const rule of this.rules) {
      if (!rule.enabled) continue

      try {
        if (rule.condition(data)) {
          // Verificar se já existe alerta similar não resolvido
          const existingAlert = this.alerts.find(
            a => !a.resolved && 
                 a.meterId === data.meterId && 
                 a.title.includes(rule.id.replace(/_/g, ' '))
          )

          if (!existingAlert) {
            const alert = this.createAlert({
              meterId: data.meterId,
              meterTag: data.meterTag,
              category: rule.category,
              severity: rule.severity,
              title: this.processTemplate(rule.titleTemplate, data),
              description: this.processTemplate(rule.descriptionTemplate, data),
              source: 'automatic',
            })
            newAlerts.push(alert)
          }
        }
      } catch (error) {
        console.error(`[AlertEngine] Erro na regra ${rule.id}:`, error)
      }
    }

    return newAlerts
  }

  /**
   * Cria um alerta manualmente
   */
  createAlert(params: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): Alert {
    const alert: Alert = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
      ...params,
    }

    this.alerts.unshift(alert)
    this.saveToStorage()

    console.log(`[AlertEngine] Alerta criado: ${alert.severity.toUpperCase()} - ${alert.title}`)

    return alert
  }

  /**
   * Reconhece um alerta
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) return false

    alert.acknowledged = true
    alert.acknowledgedBy = userId
    alert.acknowledgedAt = new Date().toISOString()

    this.saveToStorage()
    console.log(`[AlertEngine] Alerta reconhecido: ${alertId} por ${userId}`)

    return true
  }

  /**
   * Resolve um alerta
   */
  resolveAlert(alertId: string, note?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) return false

    alert.resolved = true
    alert.resolvedAt = new Date().toISOString()
    if (note) alert.resolutionNote = note

    this.saveToStorage()
    console.log(`[AlertEngine] Alerta resolvido: ${alertId}`)

    return true
  }

  /**
   * Obtém alertas ativos (não resolvidos)
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved)
  }

  /**
   * Obtém alertas por severidade
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return this.alerts.filter(a => a.severity === severity && !a.resolved)
  }

  /**
   * Obtém alertas por medidor
   */
  getAlertsByMeter(meterId: string): Alert[] {
    return this.alerts.filter(a => a.meterId === meterId)
  }

  /**
   * Obtém contagem de alertas por severidade
   */
  getAlertCounts(): Record<AlertSeverity, number> {
    const active = this.getActiveAlerts()
    return {
      critical: active.filter(a => a.severity === 'critical').length,
      warning: active.filter(a => a.severity === 'warning').length,
      info: active.filter(a => a.severity === 'info').length,
    }
  }

  /**
   * Obtém todos os alertas
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts]
  }

  /**
   * Limpa alertas resolvidos (mantém últimos 30 dias)
   */
  cleanupOldAlerts(): number {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const before = this.alerts.length
    
    this.alerts = this.alerts.filter(a => {
      if (!a.resolved) return true
      return new Date(a.timestamp).getTime() > cutoff
    })

    this.saveToStorage()
    return before - this.alerts.length
  }

  /**
   * Subscreve para atualizações de alertas
   */
  subscribe(listener: (alerts: Alert[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Limpa todos os alertas (apenas desenvolvimento)
   */
  clearAll(): void {
    if (import.meta.env.PROD) return
    this.alerts = []
    this.saveToStorage()
  }
}

// Singleton
export const alertEngine = new AlertEngineService()

export default alertEngine
