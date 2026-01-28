import { cn } from '@/utils'

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'danger'
  | 'info'
  | 'purple'
  | 'secondary'
  | 'OK'
  | 'ALERT'
  | 'FAIL'
  | 'ERROR'
  | 'Dentro'
  | 'Fora'
  | 'active'
  | 'inactive'
  | 'TOPSIDE'
  | 'SUBSEA'
  | 'MONITORAR'
  | 'INVESTIGAR'
  | 'Pendente'
  | 'Parcial'
  | 'Crítico'
  | 'Alerta'
  // Desenquadramento status
  | 'Aberto'
  | 'Em Investigação'
  | 'Plano de Ação'
  | 'Aguardando Validação'
  | 'Concluído'
  | 'Enviado ANP'

interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'default'
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-zinc-700 text-zinc-300',
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border border-red-500/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  secondary: 'bg-zinc-600/20 text-zinc-300 border border-zinc-500/30',
  OK: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  ALERT: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  FAIL: 'bg-red-500/20 text-red-400 border border-red-500/30',
  ERROR: 'bg-red-500/20 text-red-400 border border-red-500/30',
  Dentro: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  Fora: 'bg-red-500/20 text-red-400 border border-red-500/30',
  active: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  inactive: 'bg-zinc-600/20 text-zinc-400 border border-zinc-500/30',
  TOPSIDE: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  SUBSEA: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  MONITORAR: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  INVESTIGAR: 'bg-red-500/20 text-red-400 border border-red-500/30',
  Pendente: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  Parcial: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  Crítico: 'bg-red-500/20 text-red-400 border border-red-500/30',
  Alerta: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  // Desenquadramento status styles
  'Aberto': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'Em Investigação': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Plano de Ação': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Aguardando Validação': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  'Concluído': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  'Enviado ANP': 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
}

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  default: 'px-2 py-0.5 text-xs',
}

export function Badge({ 
  variant = 'default', 
  size = 'default', 
  children, 
  className 
}: BadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full font-medium inline-flex items-center',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}
