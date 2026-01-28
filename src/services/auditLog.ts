/**
 * Serviço de Auditoria - MPFM Monitor
 * Registra todas as ações do usuário para rastreabilidade ANP
 */

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'IMPORT'
  | 'EXPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'VIEW'
  | 'LOGIN'
  | 'LOGOUT'

export type AuditEntity =
  | 'METER'
  | 'CALIBRATION_EVENT'
  | 'CALIBRATION_FORM'
  | 'MONITORING_DATA'
  | 'PVT_CONFIG'
  | 'K_FACTOR'
  | 'ALERT'
  | 'REPORT'
  | 'USER'

export interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  userName: string
  action: AuditAction
  entity: AuditEntity
  entityId: string
  entityName?: string
  previousValue?: unknown
  newValue?: unknown
  changes?: Record<string, { old: unknown; new: unknown }>
  reason?: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

const STORAGE_KEY = 'mpfm_audit_log'
const MAX_ENTRIES = 10000

class AuditLogService {
  private logs: AuditLogEntry[] = []
  private initialized = false

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    if (this.initialized) return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch (error) {
      console.error('[AuditLog] Erro ao carregar logs:', error)
      this.logs = []
    }
    
    this.initialized = true
  }

  private saveToStorage(): void {
    try {
      // Manter apenas os últimos MAX_ENTRIES registros
      if (this.logs.length > MAX_ENTRIES) {
        this.logs = this.logs.slice(-MAX_ENTRIES)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs))
    } catch (error) {
      console.error('[AuditLog] Erro ao salvar logs:', error)
    }
  }

  /**
   * Registra uma ação de auditoria
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userAgent'>): Promise<AuditLogEntry> {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    }

    this.logs.push(logEntry)
    this.saveToStorage()

    // Log no console em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('[AuditLog]', {
        action: logEntry.action,
        entity: logEntry.entity,
        entityId: logEntry.entityId,
        user: logEntry.userName,
      })
    }

    // Em produção, enviar para o backend
    if (import.meta.env.PROD) {
      this.sendToServer(logEntry).catch(console.error)
    }

    return logEntry
  }

  /**
   * Envia log para o servidor (produção)
   */
  private async sendToServer(entry: AuditLogEntry): Promise<void> {
    try {
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      console.error('[AuditLog] Erro ao enviar para servidor:', error)
    }
  }

  /**
   * Busca logs recentes
   */
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit).reverse()
  }

  /**
   * Busca logs por entidade
   */
  getLogsByEntity(entity: AuditEntity, entityId?: string): AuditLogEntry[] {
    return this.logs
      .filter((log) => {
        if (log.entity !== entity) return false
        if (entityId && log.entityId !== entityId) return false
        return true
      })
      .reverse()
  }

  /**
   * Busca logs por usuário
   */
  getLogsByUser(userId: string): AuditLogEntry[] {
    return this.logs.filter((log) => log.userId === userId).reverse()
  }

  /**
   * Busca logs por período
   */
  getLogsByPeriod(startDate: Date, endDate: Date): AuditLogEntry[] {
    const start = startDate.getTime()
    const end = endDate.getTime()

    return this.logs
      .filter((log) => {
        const logTime = new Date(log.timestamp).getTime()
        return logTime >= start && logTime <= end
      })
      .reverse()
  }

  /**
   * Busca logs por ação
   */
  getLogsByAction(action: AuditAction): AuditLogEntry[] {
    return this.logs.filter((log) => log.action === action).reverse()
  }

  /**
   * Exporta logs como JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Exporta logs como CSV
   */
  exportLogsAsCSV(): string {
    const headers = [
      'ID',
      'Timestamp',
      'Usuário',
      'Ação',
      'Entidade',
      'ID Entidade',
      'Nome Entidade',
      'Motivo',
    ]

    const rows = this.logs.map((log) => [
      log.id,
      log.timestamp,
      log.userName,
      log.action,
      log.entity,
      log.entityId,
      log.entityName || '',
      log.reason || '',
    ])

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  }

  /**
   * Limpa todos os logs (apenas para desenvolvimento)
   */
  clearLogs(): void {
    if (import.meta.env.PROD) {
      console.warn('[AuditLog] Não é possível limpar logs em produção')
      return
    }
    this.logs = []
    this.saveToStorage()
  }
}

// Singleton
export const auditLog = new AuditLogService()

export default auditLog
