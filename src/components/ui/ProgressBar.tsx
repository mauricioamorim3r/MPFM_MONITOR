import { cn } from '@/utils'

type ProgressColor = 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'auto'

interface ProgressBarProps {
  value: number
  max?: number
  color?: ProgressColor
  showLabel?: boolean
  size?: 'sm' | 'default'
  className?: string
}

const colorStyles: Record<Exclude<ProgressColor, 'auto'>, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
}

export function ProgressBar({
  value,
  max = 100,
  color = 'blue',
  showLabel = true,
  size = 'default',
  className,
}: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100)

  const getAutoColor = () => {
    if (percent >= 100) return 'bg-red-500'
    if (percent >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const barColor = color === 'auto' ? getAutoColor() : colorStyles[color]

  return (
    <div className={cn('space-y-1', className)}>
      <div
        className={cn(
          'bg-zinc-800 rounded-full overflow-hidden',
          size === 'sm' ? 'h-1.5' : 'h-2'
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}
