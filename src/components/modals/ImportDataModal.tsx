import React, { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  FileUp,
  Database,
} from 'lucide-react'
import { Modal, Button, Badge, Card } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { parsePDFBatch, type ParseResult, type ParsedDailyData } from '@/services/pdfParser'
import type { MonitoringDataRow } from '@/data/monitoring'
import { cn } from '@/utils'

interface ImportDataModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ImportDataModal: React.FC<ImportDataModalProps> = ({ isOpen, onClose }) => {
  const { importMonitoringData, addAlert, updateMeter, meters } = useAppStore()
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<ParseResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    )
    
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles])
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(
      (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    )
    
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles])
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setResults((prev) => prev.filter((_, i) => i !== index))
  }

  const processFiles = async () => {
    if (files.length === 0) return
    
    setIsProcessing(true)
    setResults([])
    
    try {
      const parseResults = await parsePDFBatch(files)
      setResults(parseResults)
    } catch (error) {
      addAlert({
        type: 'error',
        severity: 'critical',
        message: 'Erro ao processar arquivos PDF',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const importData = () => {
    const successResults = results.filter((r) => r.success)
    
    if (successResults.length === 0) {
      addAlert({
        type: 'error',
        severity: 'warning',
        message: 'Nenhum dado válido para importar',
      })
      return
    }
    
    // Agrupar dados por data para calcular balanços
    const dailyDataByDate = new Map<string, { topside?: ParsedDailyData; subsea?: ParsedDailyData }>()
    
    successResults.forEach((result) => {
      if (result.dailyData) {
        const date = result.dailyData.date
        const existing = dailyDataByDate.get(date) || {}
        
        if (result.dailyData.source === 'TOPSIDE') {
          existing.topside = result.dailyData
        } else {
          existing.subsea = result.dailyData
        }
        
        dailyDataByDate.set(date, existing)
      }
      
      // Atualizar K-factors do medidor se for calibração
      if (result.calibrationData) {
        const meter = meters.find((m) => m.tag === result.calibrationData!.meterTag)
        if (meter) {
          updateMeter(meter.id, {
            kOil: result.calibrationData.kFactors.oil.new,
            kGas: result.calibrationData.kFactors.gas.new,
            kWater: result.calibrationData.kFactors.water.new,
            lastCalibration: result.calibrationData.endDate,
          })
          
          addAlert({
            type: 'success',
            severity: 'info',
            message: `K-factors do medidor ${meter.tag} atualizados pela calibração`,
            meterId: meter.id,
            meterTag: meter.tag,
          })
        }
      }
    })
    
    // Criar registros de monitoramento
    const monitoringRows: MonitoringDataRow[] = []
    
    dailyDataByDate.forEach((data, date) => {
      const subsea = data.subsea
      const topside = data.topside
      
      // Subsea data
      const subOil = subsea?.oil || 0
      const subGas = subsea?.gas || 0
      const subWater = subsea?.water || 0
      const subHC = subOil + subGas
      
      // Topside data
      const topOil = topside?.oil || 0
      const topGas = topside?.gas || 0
      const topWater = topside?.water || 0
      const topHC = topOil + topGas
      
      // Separator (estimado do topside)
      const sepOil = topOil * 0.98
      const sepGas = topGas * 0.99
      const sepWater = topWater
      const sepHC = sepOil + sepGas
      
      // Calcular balanços
      const hcBalTS = subHC > 0 ? ((topHC - subHC) / subHC) * 100 : 0
      const subTotal = subHC + subWater
      const topTotal = topHC + topWater
      const totalBalTS = subTotal > 0 ? ((topTotal - subTotal) / subTotal) * 100 : 0
      
      // Status ANP 44/2015
      const hcStatus: 'OK' | 'ALERT' | 'FAIL' =
        Math.abs(hcBalTS) > 10 ? 'FAIL' : Math.abs(hcBalTS) > 7 ? 'ALERT' : 'OK'
      const totalStatus: 'OK' | 'ALERT' | 'FAIL' =
        Math.abs(totalBalTS) > 7 ? 'FAIL' : Math.abs(totalBalTS) > 5 ? 'ALERT' : 'OK'
      
      monitoringRows.push({
        id: `mon-${date}-${Date.now()}`,
        date,
        subOil,
        subGas,
        subWater,
        subHC,
        topOil,
        topGas,
        topWater,
        topHC,
        sepOil,
        sepGas,
        sepWater,
        sepHC,
        hcBalTS: parseFloat(hcBalTS.toFixed(2)),
        totalBalTS: parseFloat(totalBalTS.toFixed(2)),
        hcBalancePercent: parseFloat(hcBalTS.toFixed(2)),
        totalBalancePercent: parseFloat(totalBalTS.toFixed(2)),
        hcStatus,
        totalStatus,
        action: hcStatus === 'FAIL' || totalStatus === 'FAIL' ? 'INVESTIGAR' : 'MONITORAR',
        subVsTS: parseFloat(hcBalTS.toFixed(2)),
        topVsTS: 0,
        topVsSub: parseFloat(((topHC - subHC) / (subHC || 1) * 100).toFixed(2)),
      })
    })
    
    if (monitoringRows.length > 0) {
      importMonitoringData(monitoringRows)
      
      addAlert({
        type: 'success',
        severity: 'info',
        message: `${monitoringRows.length} registro(s) de produção importado(s) com sucesso`,
      })
    }
    
    // Fechar modal
    handleClose()
  }

  const handleClose = () => {
    setFiles([])
    setResults([])
    setIsProcessing(false)
    onClose()
  }

  const successCount = results.filter((r) => r.success).length
  const errorCount = results.filter((r) => !r.success).length

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Relatórios PDF" size="lg">
      <div className="space-y-4">
        {/* Instruções */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-sm text-blue-300">
            Arraste e solte arquivos PDF ou clique para selecionar. São aceitos:
          </p>
          <ul className="text-xs text-blue-300/80 mt-2 space-y-1 ml-4">
            <li>• <strong>B03_MPFM_Daily</strong> - Relatórios Topside (Riser P5/P6)</li>
            <li>• <strong>B05_MPFM_Daily</strong> - Relatórios Subsea (PE_4, PE_EO)</li>
            <li>• <strong>PVTCalibration</strong> - Relatórios de Calibração PVT</li>
          </ul>
        </div>

        {/* Área de Drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
            isDragOver
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <FileUp
            size={48}
            className={cn(
              'mx-auto mb-3',
              isDragOver ? 'text-blue-400' : 'text-zinc-500'
            )}
          />
          <p className="text-zinc-300 font-medium">
            {isDragOver ? 'Solte os arquivos aqui' : 'Arraste PDFs ou clique para selecionar'}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Suporta múltiplos arquivos (importação em lote)
          </p>
        </div>

        {/* Lista de Arquivos */}
        {files.length > 0 && (
          <Card className="p-3 bg-zinc-800/50 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-300">
                {files.length} arquivo(s) selecionado(s)
              </span>
              {results.length > 0 && (
                <div className="flex items-center gap-2">
                  {successCount > 0 && (
                    <Badge variant="success">{successCount} OK</Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="error">{errorCount} Erro</Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {files.map((file, index) => {
                const result = results[index]
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-zinc-900/50 rounded"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={16} className="text-zinc-400 flex-shrink-0" />
                      <span className="text-sm text-zinc-300 truncate">
                        {file.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-2">
                      {result && (
                        <>
                          {result.success ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle size={14} className="text-emerald-400" />
                              <span className="text-xs text-emerald-400">
                                {result.type.replace('_', ' ')}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle size={14} className="text-red-400" />
                              <span className="text-xs text-red-400 max-w-32 truncate">
                                {result.error}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Resumo dos Dados Extraídos */}
        {results.length > 0 && successCount > 0 && (
          <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
            <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
              <Database size={16} />
              Dados Prontos para Importação
            </h4>
            <div className="text-xs text-emerald-300/80 space-y-1">
              {results.filter((r) => r.success && r.dailyData).length > 0 && (
                <p>
                  • {results.filter((r) => r.dailyData).length} registro(s) de produção diária
                </p>
              )}
              {results.filter((r) => r.success && r.calibrationData).length > 0 && (
                <p>
                  • {results.filter((r) => r.calibrationData).length} relatório(s) de calibração
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          
          {results.length === 0 ? (
            <Button
              variant="primary"
              onClick={processFiles}
              disabled={files.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Processar PDFs
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={importData}
              disabled={successCount === 0}
            >
              <Database size={16} className="mr-2" />
              Importar {successCount} Registro(s)
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
