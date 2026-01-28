import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { MonitoringPage, CalibrationPage, CompliancePage, Desenquadramento, RegistroDiario } from '@/pages'
import {
  NewMeterModal,
  ImportDataModal,
  ExportDataModal,
  NewCalibrationModal,
} from '@/components/modals'
import { useAppStore } from '@/store/useAppStore'
import { useInitializeRealData } from '@/hooks/useInitializeRealData'

function App() {
  // Inicializa dados reais do FPSO Bacalhau
  useInitializeRealData()

  const {
    showMeterModal,
    setShowMeterModal,
    showImportModal,
    setShowImportModal,
    showExportModal,
    setShowExportModal,
    showNewEventModal,
    setShowNewEventModal,
    editingMeter,
    setEditingMeter,
  } = useAppStore()

  const handleCloseMeterModal = () => {
    setShowMeterModal(false)
    setEditingMeter(null)
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/monitoring" replace />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/calibration" element={<CalibrationPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/desenquadramento" element={<Desenquadramento />} />
          <Route path="/registro-diario" element={<RegistroDiario />} />
          <Route path="*" element={<Navigate to="/monitoring" replace />} />
        </Routes>
      </Layout>

      {/* Modais Globais */}
      <NewMeterModal
        isOpen={showMeterModal}
        onClose={handleCloseMeterModal}
        editingMeter={editingMeter}
      />
      <ImportDataModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
      <ExportDataModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
      <NewCalibrationModal
        isOpen={showNewEventModal}
        onClose={() => setShowNewEventModal(false)}
      />
    </>
  )
}

export default App
