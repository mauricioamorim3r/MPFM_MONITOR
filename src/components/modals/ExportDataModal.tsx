import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useAppStore } from '@/store/useAppStore'
import {
  exportMonitoringDataToCSV,
  exportMetersToCSV,
  exportCalibrationEventsToCSV,
  exportAllDataToJSON,
  exportCalibrationReport,
} from '@/services/dataExport'

interface ExportDataModalProps {
  isOpen: boolean
  onClose: () => void
}

type ExportType = 'monitoring' | 'meters' | 'calibration' | 'all' | 'report'
type ExportFormat = 'csv' | 'json'

export const ExportDataModal: React.FC<ExportDataModalProps> = ({ isOpen, onClose }) => {
  const { monitoringData, meters, calibrationEvents, selectedEvent } = useAppStore()
  const [exportType, setExportType] = useState<ExportType>('monitoring')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      switch (exportType) {
        case 'monitoring':
          if (format === 'csv') {
            exportMonitoringDataToCSV(monitoringData)
          } else {
            exportAllDataToJSON({ monitoringData }, 'monitoring_data')
          }
          break

        case 'meters':
          if (format === 'csv') {
            exportMetersToCSV(meters)
          } else {
            exportAllDataToJSON({ meters }, 'meters')
          }
          break

        case 'calibration':
          if (format === 'csv') {
            exportCalibrationEventsToCSV(calibrationEvents)
          } else {
            exportAllDataToJSON({ calibrationEvents }, 'calibration_events')
          }
          break

        case 'all':
          exportAllDataToJSON({ monitoringData, meters, calibrationEvents }, 'mpfm_monitor_backup')
          break

        case 'report':
          if (selectedEvent) {
            exportCalibrationReport(selectedEvent)
          }
          break
      }

      onClose()
    } catch (error) {
      console.error('Erro ao exportar:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exportar Dados" size="lg">
      <div className="space-y-6">
        {/* Tipo de Exportação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O que deseja exportar?
          </label>
          <Select
            value={exportType}
            onChange={(e) => setExportType(e.target.value as ExportType)}
            options={[
              { value: 'monitoring', label: 'Dados de Monitoramento' },
              { value: 'meters', label: 'Cadastro de Medidores' },
              { value: 'calibration', label: 'Eventos de Calibração' },
              { value: 'all', label: 'Backup Completo' },
              ...(selectedEvent
                ? [{ value: 'report', label: 'Relatório de Calibração (Evento Selecionado)' }]
                : []),
            ]}
          />
        </div>

        {/* Formato */}
        {exportType !== 'all' && exportType !== 'report' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Formato</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="mr-2"
                />
                CSV (Excel)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="mr-2"
                />
                JSON
              </label>
            </div>
          </div>
        )}

        {/* Resumo */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Resumo</h4>
          <div className="text-sm text-gray-600 space-y-1">
            {exportType === 'monitoring' && (
              <p>📊 {monitoringData.length} registros de monitoramento</p>
            )}
            {exportType === 'meters' && <p>📍 {meters.length} medidores cadastrados</p>}
            {exportType === 'calibration' && (
              <p>🔧 {calibrationEvents.length} eventos de calibração</p>
            )}
            {exportType === 'all' && (
              <>
                <p>📊 {monitoringData.length} registros de monitoramento</p>
                <p>📍 {meters.length} medidores</p>
                <p>🔧 {calibrationEvents.length} eventos de calibração</p>
              </>
            )}
            {exportType === 'report' && selectedEvent && (
              <p>📄 Relatório para evento: {selectedEvent.id}</p>
            )}
          </div>
        </div>

        {/* Aviso */}
        {exportType === 'all' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700">
              ⚠️ O backup completo será exportado em formato JSON. Guarde este arquivo em
              local seguro para restauração futura.
            </p>
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleExport}
            disabled={isExporting || (exportType === 'report' && !selectedEvent)}
          >
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
