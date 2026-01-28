import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { useAppStore } from '@/store'
import { getTimeAgo } from '@/data'
import { cn } from '@/utils'

interface AlertsListProps {
  limit?: number
}

export function AlertsList({ limit }: AlertsListProps) {
  const alerts = useAppStore((state) => state.alerts)
  const displayAlerts = limit ? alerts.slice(0, limit) : alerts

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return AlertCircle
      case 'warning':
        return AlertTriangle
      case 'success':
        return CheckCircle
      default:
        return Info
    }
  }

  const getIconStyle = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-500/20 text-red-400'
      case 'warning':
        return 'bg-amber-500/20 text-amber-400'
      case 'success':
        return 'bg-emerald-500/20 text-emerald-400'
      default:
        return 'bg-blue-500/20 text-blue-400'
    }
  }

  return (
    <div className="divide-y divide-zinc-800">
      {displayAlerts.map((alert) => {
        const Icon = getIcon(alert.type)
        return (
          <div
            key={alert.id}
            className={cn('p-3', !alert.read && 'bg-zinc-800/30')}
          >
            <div className="flex items-start gap-2">
              <div className={cn('mt-0.5 p-1 rounded', getIconStyle(alert.type))}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-200 truncate">{alert.message}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {alert.meterTag} • {getTimeAgo(alert.timestamp)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
