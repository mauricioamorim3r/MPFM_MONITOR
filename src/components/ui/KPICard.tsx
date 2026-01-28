import { cn } from '@/utils'
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react'

type KPIColor = 'blue' | 'emerald' | 'amber' | 'red' | 'purple'

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  subtitle?: string
  icon: LucideIcon
  color: KPIColor
  trend?: number
  onClick?: () => void
  className?: string
}

const colorStyles: Record<KPIColor, string> = {
  blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
  emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
  amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30',
  red: 'from-red-500/20 to-red-600/5 border-red-500/30',
  purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
}

const iconColors: Record<KPIColor, string> = {
  blue: 'text-blue-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
}

export function KPICard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  color,
  trend,
  onClick,
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-br border rounded-xl p-3',
        colorStyles[color],
        onClick && 'cursor-pointer hover:brightness-110 transition',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400">{title}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-white">{value}</span>
            {unit && <span className="text-xs text-zinc-400">{unit}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && trend !== 0 && (
            <div
              className={cn(
                'flex items-center gap-1 mt-1 text-xs',
                trend > 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {trend > 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className={cn('p-2 rounded-lg bg-zinc-800/50', iconColors[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}
