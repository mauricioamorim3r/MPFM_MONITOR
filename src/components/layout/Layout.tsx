import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppStore } from '@/store'

const MODULE_TITLES: Record<string, string> = {
  monitoring: 'Monitoramento SGM-FM',
  calibration: 'Avaliação de Desempenho',
  compliance: 'Conformidade ANP',
}

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { alerts, setShowImportModal, setShowExportModal } = useAppStore()
  const unreadCount = alerts.filter((a) => !a.read).length

  // Map path to module
  const pathToModule = (path: string) => {
    if (path.includes('calibration')) return 'calibration'
    if (path.includes('compliance')) return 'compliance'
    return 'monitoring'
  }

  const activeModule = pathToModule(location.pathname)

  const handleModuleChange = (moduleId: string) => {
    navigate(`/${moduleId}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        collapsed={sidebarCollapsed}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title={MODULE_TITLES[activeModule] || 'MPFM Monitor'}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onImport={() => setShowImportModal(true)}
          onExport={() => setShowExportModal(true)}
          alertCount={unreadCount}
        />

        <div className="flex-1 p-4 overflow-auto">{children}</div>
      </main>
    </div>
  )
}
