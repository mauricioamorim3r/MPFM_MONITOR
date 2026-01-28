/**
 * Componente de Painel de Alertas Ativos - MPFM Monitor
 * Exibe alertas em tempo real com ações de reconhecimento e resolução
 */

import { useState, useEffect, useMemo } from 'react'
import { 
  AlertTriangle, 
  XCircle, 
  Info, 
  Check, 
  CheckCheck, 
  Clock,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react'
import { cn } from '@/utils'
import { alertEngine, type Alert, type AlertSeverity } from '@/services/alertEngine'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface AlertsPanelProps {
  maxAlerts?: number
  showFilters?: boolean
  className?: string
}

export function AlertsPanel({ 
  maxAlerts = 10, 
  showFilters = true,
  className 
}: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all')
  const [showAcknowledged, setShowAcknowledged] = useState(false)

  useEffect(() => {
    // Carregar alertas iniciais
    setAlerts(alertEngine.getActiveAlerts())

    // Subscrever para atualizações
    const unsubscribe = alertEngine.subscribe((newAlerts) => {
      setAlerts(newAlerts.filter(a => !a.resolved))
    })

    return () => unsubscribe()
  }, [])

  const filteredAlerts = useMemo(() => {
    let result = alerts

    // Filtrar por severidade
    if (filterSeverity !== 'all') {
      result = result.filter(a => a.severity === filterSeverity)
    }

    // Filtrar reconhecidos
    if (!showAcknowledged) {
      result = result.filter(a => !a.acknowledged)
    }

    // Ordenar: críticos primeiro, depois por data
    result.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return result.slice(0, maxAlerts)
  }, [alerts, filterSeverity, showAcknowledged, maxAlerts])

  const counts = useMemo(() => alertEngine.getAlertCounts(), [alerts])

  const handleAcknowledge = (alertId: string) => {
    alertEngine.acknowledgeAlert(alertId, 'current-user') // TODO: usar usuário real
  }

  const handleResolve = (alertId: string) => {
    alertEngine.resolveAlert(alertId, 'Resolvido manualmente')
  }

  const getSeverityConfig = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'danger' as const,
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          badgeVariant: 'warning' as const,
        }
      default:
        return {
          icon: Info,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badgeVariant: 'info' as const,
        }
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}m atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    return `${diffDays}d atrás`
  }

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Alertas Ativos</h3>
          </div>
          
          {/* Contadores */}
          <div className="flex items-center gap-2">
            {counts.critical > 0 && (
              <Badge variant="danger">{counts.critical} críticos</Badge>
            )}
            {counts.warning > 0 && (
              <Badge variant="warning">{counts.warning} avisos</Badge>
            )}
            {counts.info > 0 && (
              <Badge variant="info">{counts.info} info</Badge>
            )}
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <label htmlFor="severity-filter" className="sr-only">Filtrar por severidade</label>
              <select
                id="severity-filter"
                className="text-sm border-gray-300 rounded-md"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | 'all')}
                title="Filtrar por severidade"
              >
                <option value="all">Todos</option>
                <option value="critical">Críticos</option>
                <option value="warning">Avisos</option>
                <option value="info">Info</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className="rounded text-blue-600"
              />
              Mostrar reconhecidos
            </label>
          </div>
        )}
      </div>

      {/* Lista de alertas */}
      <div className="divide-y max-h-[500px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Check className="w-12 h-12 mx-auto mb-2 text-green-400" />
            <p className="font-medium">Nenhum alerta ativo</p>
            <p className="text-sm">Sistema operando normalmente</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const config = getSeverityConfig(alert.severity)
            const Icon = config.icon
            const isExpanded = expandedId === alert.id

            return (
              <div
                key={alert.id}
                className={cn(
                  'p-4 transition-colors',
                  config.bgColor,
                  alert.acknowledged && 'opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.color)} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {alert.title}
                      </span>
                      {alert.acknowledged && (
                        <CheckCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {alert.meterTag && (
                        <Badge variant={config.badgeVariant}>{alert.meterTag}</Badge>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>

                    {/* Detalhes expandidos */}
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-white rounded-md border text-sm text-gray-700">
                        <p>{alert.description}</p>
                        {alert.acknowledgedBy && (
                          <p className="mt-2 text-xs text-gray-500">
                            Reconhecido por: {alert.acknowledgedBy} em {new Date(alert.acknowledgedAt!).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAcknowledge(alert.id)}
                        title="Reconhecer"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResolve(alert.id)}
                      title="Resolver"
                    >
                      <CheckCheck className="w-4 h-4 text-green-600" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer com total */}
      {alerts.length > maxAlerts && (
        <div className="p-3 text-center border-t bg-gray-50">
          <span className="text-sm text-gray-500">
            Mostrando {filteredAlerts.length} de {alerts.length} alertas
          </span>
        </div>
      )}
    </div>
  )
}

export default AlertsPanel
