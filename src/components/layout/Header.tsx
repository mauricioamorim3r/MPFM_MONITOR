import { Menu, Bell, Upload, Download } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatDateTime } from '@/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  onToggleSidebar: () => void
  onImport?: () => void
  onExport?: () => void
  alertCount?: number
}

export function Header({
  title,
  subtitle,
  onToggleSidebar,
  onImport,
  onExport,
  alertCount = 0,
}: HeaderProps) {
  return (
    <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          title="Menu"
          className="p-2 hover:bg-zinc-800 rounded-lg transition"
        >
          <Menu className="w-5 h-5 text-zinc-400" />
        </button>
        <div>
          <h1 className="text-sm font-semibold">{title}</h1>
          <p className="text-xs text-zinc-500">
            {subtitle || `Última atualização: ${formatDateTime(new Date())}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onImport && (
          <Button variant="secondary" size="sm" icon={Upload} onClick={onImport}>
            Importar
          </Button>
        )}
        {onExport && (
          <Button variant="secondary" size="sm" icon={Download} onClick={onExport}>
            Exportar
          </Button>
        )}

        {/* Notifications */}
        <button 
          title="Notificações"
          className="relative p-2 hover:bg-zinc-800 rounded-lg transition"
        >
          <Bell className="w-5 h-5 text-zinc-400" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
          MA
        </div>
      </div>
    </header>
  )
}
