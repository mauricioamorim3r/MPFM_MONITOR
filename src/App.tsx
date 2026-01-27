import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Placeholder components - will be replaced with actual implementations
// based on prototypes in /prototypes folder

const Dashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>
    <p className="text-zinc-400">
      Implemente o dashboard baseado no protótipo em{' '}
      <code className="bg-zinc-800 px-2 py-1 rounded text-blue-400">
        /prototypes/mpfm_sistema_integrado.jsx
      </code>
    </p>
  </div>
)

const Monitoring = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-white mb-4">Monitoramento SGM-FM</h1>
    <p className="text-zinc-400">
      Implemente o módulo de monitoramento baseado no protótipo.
    </p>
  </div>
)

const Calibration = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-white mb-4">Avaliação de Desempenho</h1>
    <p className="text-zinc-400">
      Implemente o workflow de calibração baseado em{' '}
      <code className="bg-zinc-800 px-2 py-1 rounded text-blue-400">
        /prototypes/mpfm_workflow_completo.jsx
      </code>
    </p>
  </div>
)

const Compliance = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-white mb-4">Conformidade ANP</h1>
    <p className="text-zinc-400">
      Implemente o checklist de conformidade RANP 44/2015.
    </p>
  </div>
)

// Main App component
function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* 
        TODO: Implement the full layout with:
        - Sidebar navigation (collapsible)
        - Header with user info, notifications
        - Main content area
        
        Reference: /prototypes/mpfm_sistema_integrado.jsx
      */}
      
      <div className="flex">
        {/* Sidebar placeholder */}
        <aside className="w-56 min-h-screen bg-zinc-900 border-r border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <div>
              <div className="font-bold text-sm">MPFM Monitor</div>
              <div className="text-xs text-zinc-500">FPSO Bacalhau</div>
            </div>
          </div>
          
          <nav className="space-y-1">
            <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm">
              Dashboard
            </a>
            <a href="/monitoring" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-zinc-400 text-sm">
              Monitoramento
            </a>
            <a href="/calibration" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-zinc-400 text-sm">
              Avaliação
            </a>
            <a href="/compliance" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-zinc-400 text-sm">
              Conformidade
            </a>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {/* Header placeholder */}
          <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6">
            <div>
              <h1 className="text-sm font-semibold">MPFM Monitor</h1>
              <p className="text-xs text-zinc-500">Última atualização: --</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-800 rounded-lg">
                <span className="text-zinc-400">🔔</span>
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                U
              </div>
            </div>
          </header>

          {/* Routes */}
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/calibration" element={<Calibration />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
