import { cn } from '@/utils'
import { LucideIcon } from 'lucide-react'

type SectionColor = 'blue' | 'purple' | 'amber' | 'emerald' | 'red'

interface SectionHeaderProps {
  icon: LucideIcon
  title: string
  color?: SectionColor
  action?: React.ReactNode
  className?: string
}

const colorStyles: Record<SectionColor, string> = {
  blue: 'text-blue-400 bg-blue-500/10',
  purple: 'text-purple-400 bg-purple-500/10',
  amber: 'text-amber-400 bg-amber-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
  red: 'text-red-400 bg-red-500/10',
}

export function SectionHeader({
  icon: Icon,
  title,
  color = 'blue',
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg mb-3',
        colorStyles[color],
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {action}
    </div>
  )
}
