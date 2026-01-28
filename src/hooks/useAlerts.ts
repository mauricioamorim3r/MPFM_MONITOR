/**
 * Hook useAlerts - MPFM Monitor
 * Facilita o uso do AlertEngine em componentes React
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  alertEngine, 
  type Alert, 
  type AlertSeverity, 
  type AlertCheckData 
} from '@/services/alertEngine'

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    // Carregar alertas iniciais
    setAlerts(alertEngine.getActiveAlerts())

    // Subscrever para atualizações
    const unsubscribe = alertEngine.subscribe((newAlerts) => {
      setAlerts(newAlerts.filter(a => !a.resolved))
    })

    return () => unsubscribe()
  }, [])

  const checkAlerts = useCallback((data: AlertCheckData) => {
    return alertEngine.checkAndGenerateAlerts(data)
  }, [])

  const acknowledgeAlert = useCallback((alertId: string, userId: string) => {
    return alertEngine.acknowledgeAlert(alertId, userId)
  }, [])

  const resolveAlert = useCallback((alertId: string, note?: string) => {
    return alertEngine.resolveAlert(alertId, note)
  }, [])

  const counts = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    total: alerts.length,
  }), [alerts])

  const getAlertsBySeverity = useCallback((severity: AlertSeverity) => {
    return alerts.filter(a => a.severity === severity)
  }, [alerts])

  const getAlertsByMeter = useCallback((meterId: string) => {
    return alerts.filter(a => a.meterId === meterId)
  }, [alerts])

  return {
    alerts,
    counts,
    checkAlerts,
    acknowledgeAlert,
    resolveAlert,
    getAlertsBySeverity,
    getAlertsByMeter,
  }
}

export default useAlerts
