import { cn } from '@/utils'
import type { DayStatus } from './CalendarView'

interface DayCellProps {
  dayStatus: DayStatus | null
  isToday?: boolean
  onClick?: () => void
}

export function DayCell({ dayStatus, isToday, onClick }: DayCellProps) {
  // Célula vazia (padding do mês anterior)
  if (!dayStatus) {
    return <div className="h-16 bg-zinc-900/30 rounded" />
  }

  const day = parseInt(dayStatus.date.split('-')[2], 10)

  const statusStyles = {
    OK: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20',
    ALERT: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
    FAIL: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
    NO_DATA: 'bg-zinc-800/50 border-zinc-700/30 hover:bg-zinc-700/50',
  }

  const statusDotStyles = {
    OK: 'bg-emerald-500',
    ALERT: 'bg-amber-500',
    FAIL: 'bg-red-500',
    NO_DATA: 'bg-zinc-600',
  }

  const statusTextStyles = {
    OK: 'text-emerald-400',
    ALERT: 'text-amber-400',
    FAIL: 'text-red-400',
    NO_DATA: 'text-zinc-500',
  }

  return (
    <button
      onClick={onClick}
      disabled={!dayStatus.hasData}
      className={cn(
        'h-16 rounded border transition-all duration-200 flex flex-col items-center justify-center gap-1',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        statusStyles[dayStatus.status],
        isToday && 'ring-2 ring-blue-500',
        dayStatus.hasData ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {/* Número do dia */}
      <span
        className={cn(
          'text-sm font-medium',
          dayStatus.hasData ? 'text-white' : 'text-zinc-600',
          isToday && 'text-blue-400'
        )}
      >
        {day}
      </span>

      {/* Indicador de status */}
      {dayStatus.hasData && (
        <div className="flex items-center gap-1">
          <span className={cn('w-2 h-2 rounded-full', statusDotStyles[dayStatus.status])} />
          <span className={cn('text-[10px] font-medium', statusTextStyles[dayStatus.status])}>
            {dayStatus.status}
          </span>
        </div>
      )}

      {/* Valor do balanço HC */}
      {dayStatus.hasData && dayStatus.hcBalance !== undefined && (
        <span className={cn('text-[9px]', statusTextStyles[dayStatus.status])}>
          HC: {dayStatus.hcBalance > 0 ? '+' : ''}{dayStatus.hcBalance.toFixed(1)}%
        </span>
      )}
    </button>
  )
}
