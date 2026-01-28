import { cn } from '@/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  headerRight?: React.ReactNode
  noPadding?: boolean
}

export function Card({
  children,
  className,
  title,
  subtitle,
  headerRight,
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-zinc-900/80 border border-zinc-800 rounded-xl',
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-zinc-500">{subtitle}</p>
            )}
          </div>
          {headerRight}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </div>
  )
}
