import { Activity, Gauge, FileCheck, Droplets, AlertTriangle, ClipboardList } from 'lucide-react'
import { cn } from '@/utils'

interface Module {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const modules: Module[] = [
  {
    id: 'monitoring',
    label: 'Monitoramento SGM-FM',
    icon: Activity,
    description: 'Variáveis críticas',
  },
  {
    id: 'registro-diario',
    label: 'Registro Diário',
    icon: ClipboardList,
    description: 'Variáveis e gráficos',
  },
  {
    id: 'calibration',
    label: 'Avaliação de Desempenho',
    icon: Gauge,
    description: 'Calibração MPFM',
  },
  {
    id: 'compliance',
    label: 'Conformidade ANP',
    icon: FileCheck,
    description: 'RANP 44/2015',
  },
  {
    id: 'desenquadramento',
    label: 'Desenquadramento',
    icon: AlertTriangle,
    description: 'Seção 10 RANP44',
  },
]

interface SidebarProps {
  activeModule: string
  onModuleChange: (moduleId: string) => void
  collapsed: boolean
}

export function Sidebar({ activeModule, onModuleChange, collapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        'bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold text-sm">MPFM Monitor</div>
              <div className="text-xs text-zinc-500">FPSO Bacalhau</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {modules.map((module) => {
          const Icon = module.icon
          const isActive = activeModule === module.id

          return (
            <button
              key={module.id}
              onClick={() => onModuleChange(module.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-zinc-800 text-zinc-400'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <div className="text-left">
                  <div className="text-xs font-medium">{module.label}</div>
                  <div className="text-[10px] opacity-60">{module.description}</div>
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800">
        {!collapsed && (
          <div className="text-xs text-zinc-500">
            <div>RANP 44/2015 ANP</div>
            <div className="text-zinc-600">v2.1.0</div>
          </div>
        )}
      </div>
    </aside>
  )
}
