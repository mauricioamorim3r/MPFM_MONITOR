/**
 * Hook de Auditoria - MPFM Monitor
 * Facilita o uso do serviço de auditoria em componentes React
 */

import { useCallback } from 'react'
import { auditLog, type AuditAction, type AuditEntity } from '@/services/auditLog'
import { useAppStore } from '@/store/useAppStore'

export function useAuditLog() {
  const user = useAppStore((state) => state.user)

  const logAction = useCallback(
    async (
      action: AuditAction,
      entity: AuditEntity,
      entityId: string,
      options?: {
        entityName?: string
        previousValue?: unknown
        newValue?: unknown
        changes?: Record<string, { old: unknown; new: unknown }>
        reason?: string
      }
    ) => {
      return auditLog.log({
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Operador',
        action,
        entity,
        entityId,
        ...options,
      })
    },
    [user]
  )

  return {
    logAction,
    getRecentLogs: auditLog.getRecentLogs.bind(auditLog),
    getLogsByEntity: auditLog.getLogsByEntity.bind(auditLog),
    getLogsByUser: auditLog.getLogsByUser.bind(auditLog),
    getLogsByPeriod: auditLog.getLogsByPeriod.bind(auditLog),
    exportLogs: auditLog.exportLogs.bind(auditLog),
    exportLogsAsCSV: auditLog.exportLogsAsCSV.bind(auditLog),
  }
}

export default useAuditLog
