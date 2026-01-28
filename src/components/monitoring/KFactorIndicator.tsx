/**
 * Componente de Indicador de K-Factor - MPFM Monitor
 * Exibe status visual do K-Factor com progressão de dias consecutivos
 */

import { useMemo } from 'react'
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/utils'
import { KFACTOR_LIMITS, type MeterKFactorStatus } from '@/services/kFactorTracker'

interface KFactorIndicatorProps {
  status: MeterKFactorStatus
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export function KFactorIndicator({ 
  status, 
  showDetails = true, 
  compact = false,
  className 
}: KFactorIndicatorProps) {
  const progressPercent = useMemo(() => {
    return Math.min(
      (status.consecutiveDaysOutOfRange / KFACTOR_LIMITS.CONSECUTIVE_DAYS_TRIGGER) * 100,
      100
    )
  }, [status.consecutiveDaysOutOfRange])

  const statusConfig = useMemo(() => {
    switch (status.status) {
      case 'critical':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          progressColor: 'bg-red-500',
          label: 'Crítico',
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          progressColor: 'bg-yellow-500',
          label: 'Atenção',
        }
      default:
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          progressColor: 'bg-green-500',
          label: 'Normal',
        }
    }
  }, [status.status])

  const TrendIcon = useMemo(() => {
    switch (status.trend) {
      case 'improving': return TrendingUp
      case 'degrading': return TrendingDown
      default: return Minus
    }
  }, [status.trend])

  const trendColor = useMemo(() => {
    switch (status.trend) {
      case 'improving': return 'text-green-500'
      case 'degrading': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }, [status.trend])

  const StatusIcon = statusConfig.icon

  if (compact) {
    return (
      <div 
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-md',
          statusConfig.bgColor,
          className
        )}
      >
        <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
        <span className={cn('text-xs font-medium', statusConfig.color)}>
          {statusConfig.label}
        </span>
        {status.consecutiveDaysOutOfRange > 0 && (
          <span className="text-xs text-gray-500">
            ({status.consecutiveDaysOutOfRange}d)
          </span>
        )}
      </div>
    )
  }

  return (
    <div 
      className={cn(
        'p-4 rounded-lg border',
        statusConfig.bgColor,
        statusConfig.borderColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('w-5 h-5', statusConfig.color)} />
          <span className={cn('font-semibold', statusConfig.color)}>
            {status.meterTag}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={cn('w-4 h-4', trendColor)} />
          <span className={cn('text-xs', trendColor)}>
            {status.trend === 'improving' ? 'Melhorando' : 
             status.trend === 'degrading' ? 'Degradando' : 'Estável'}
          </span>
        </div>
      </div>

      {/* K-Factors */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-xs text-gray-500">K-Óleo</div>
          <div className={cn(
            'font-mono font-semibold',
            isWithinLimits(status.currentKFactors.oil) ? 'text-gray-900' : 'text-red-600'
          )}>
            {status.currentKFactors.oil.toFixed(4)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">K-Gás</div>
          <div className={cn(
            'font-mono font-semibold',
            isWithinLimits(status.currentKFactors.gas) ? 'text-gray-900' : 'text-red-600'
          )}>
            {status.currentKFactors.gas.toFixed(4)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">K-Água</div>
          <div className={cn(
            'font-mono font-semibold',
            isWithinLimits(status.currentKFactors.water) ? 'text-gray-900' : 'text-red-600'
          )}>
            {status.currentKFactors.water.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Dias consecutivos */}
      {showDetails && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Dias fora do limite</span>
            <span className={cn('font-semibold', statusConfig.color)}>
              {status.consecutiveDaysOutOfRange} / {KFACTOR_LIMITS.CONSECUTIVE_DAYS_TRIGGER}
            </span>
          </div>
          
          {/* Barra de progresso */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                statusConfig.progressColor
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Mensagem de calibração */}
          {status.calibrationReason && (
            <p className={cn(
              'text-xs mt-2 p-2 rounded',
              status.calibrationRequired ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            )}>
              {status.calibrationReason}
            </p>
          )}

          {/* Compliance */}
          <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200">
            <span className="text-gray-600">Conformidade (30d)</span>
            <span className={cn(
              'font-semibold',
              status.complianceRate >= 90 ? 'text-green-600' : 
              status.complianceRate >= 70 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {status.complianceRate.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function isWithinLimits(k: number): boolean {
  return k >= KFACTOR_LIMITS.K_FACTOR_MIN && k <= KFACTOR_LIMITS.K_FACTOR_MAX
}

export default KFactorIndicator
