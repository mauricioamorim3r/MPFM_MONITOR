import { useState, useCallback } from 'react'
import { Info, Eye, Plus, Trash2 } from 'lucide-react'
import { Card, SectionHeader, Button, Badge } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils'

interface MonitorRow {
  id: string
  data: string
  duracao: number
  mpfmOil: number
  mpfmGas: number
  mpfmTotal: number
  refTotal: number
  desvio: number
  alarmes: string
}

const generateId = () => `mon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const migrateRows = (data: unknown[]): MonitorRow[] => {
  if (!data || !Array.isArray(data)) return []
  return data.map((row) => ({
    id: (row as { id?: string }).id || generateId(),
    data: (row as { data?: string }).data || '',
    duracao: (row as { duracao?: number }).duracao || 0,
    mpfmOil: (row as { mpfmOil?: number }).mpfmOil || 0,
    mpfmGas: (row as { mpfmGas?: number }).mpfmGas || 0,
    mpfmTotal: (row as { mpfmTotal?: number }).mpfmTotal || 0,
    refTotal: (row as { refTotal?: number }).refTotal || 0,
    desvio: (row as { desvio?: number }).desvio || 0,
    alarmes: (row as { alarmes?: string }).alarmes || '',
  }))
}

export function Step06Monitoramento() {
  const { calibrationFormData, updateCalibrationFormData } = useAppStore()

  const [rows, setRows] = useState<MonitorRow[]>(() =>
    migrateRows(calibrationFormData?.monitoramentoPosData || [])
  )

  const addRow = useCallback(() => {
    const newRow: MonitorRow = {
      id: generateId(),
      data: new Date().toISOString().split('T')[0],
      duracao: 24,
      mpfmOil: 0,
      mpfmGas: 0,
      mpfmTotal: 0,
      refTotal: 0,
      desvio: 0,
      alarmes: '',
    }
    const updated = [...rows, newRow]
    setRows(updated)
    updateCalibrationFormData({ monitoramentoPosData: updated })
  }, [rows, updateCalibrationFormData])

  const removeRow = useCallback((id: string) => {
    const updated = rows.filter((r) => r.id !== id)
    setRows(updated)
    updateCalibrationFormData({ monitoramentoPosData: updated })
  }, [rows, updateCalibrationFormData])

  const updateRow = useCallback((id: string, field: keyof MonitorRow, value: string | number) => {
    const updated = rows.map((row) => {
      if (row.id !== id) return row
      
      const updatedRow = { ...row, [field]: value }
      
      // Auto-calculate total and deviation
      if (field === 'mpfmOil' || field === 'mpfmGas') {
        const oil = field === 'mpfmOil' ? Number(value) : row.mpfmOil
        const gas = field === 'mpfmGas' ? Number(value) : row.mpfmGas
        updatedRow.mpfmTotal = oil + gas
        
        if (updatedRow.refTotal > 0) {
          updatedRow.desvio = ((updatedRow.mpfmTotal - updatedRow.refTotal) / updatedRow.refTotal) * 100
        }
      }
      
      if (field === 'refTotal' && updatedRow.mpfmTotal > 0) {
        updatedRow.desvio = ((updatedRow.mpfmTotal - Number(value)) / Number(value)) * 100
      }
      
      return updatedRow
    })
    
    setRows(updated)
    updateCalibrationFormData({ monitoramentoPosData: updated })
  }, [rows, updateCalibrationFormData])

  const getDesvioStatus = (desvio: number): 'OK' | 'Alerta' | 'Crítico' => {
    const abs = Math.abs(desvio)
    if (abs <= 7) return 'OK'
    if (abs <= 10) return 'Alerta'
    return 'Crítico'
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-xs text-purple-300">
          <Info className="w-3 h-3 inline mr-1" />
          Registre por período as massas totalizadas e o efeito dos novos K-factors.
          Este monitoramento serve como evidência pós-calibração.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            icon={Eye}
            title="Monitoramento Pós-Aplicação de Novos Fatores"
            color="purple"
          />
          <Button variant="primary" size="sm" icon={Plus} onClick={addRow}>
            Adicionar Período
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum período de monitoramento registrado.</p>
            <p className="text-xs mt-1">Adicione períodos para acompanhar o desempenho pós-calibração.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="py-2 px-2 text-left text-zinc-400">Data</th>
                  <th className="py-2 px-2 text-center text-zinc-400">Duração (h)</th>
                  <th className="py-2 px-2 text-right text-zinc-400">MPFM Óleo</th>
                  <th className="py-2 px-2 text-right text-zinc-400">MPFM Gás</th>
                  <th className="py-2 px-2 text-right text-blue-400">MPFM Total</th>
                  <th className="py-2 px-2 text-right text-emerald-400">REF Total</th>
                  <th className="py-2 px-2 text-center text-zinc-400">Desvio</th>
                  <th className="py-2 px-2 text-left text-zinc-400">Alarmes</th>
                  <th className="py-2 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = getDesvioStatus(row.desvio)
                  return (
                    <tr key={row.id} className="border-b border-zinc-800/50">
                      <td className="py-1.5 px-2">
                        <input
                          type="date"
                          value={row.data}
                          onChange={(e) => updateRow(row.id, 'data', e.target.value)}
                          className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                          title="Data do período"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          value={row.duracao || ''}
                          onChange={(e) => updateRow(row.id, 'duracao', parseFloat(e.target.value) || 0)}
                          className="w-14 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-center"
                          placeholder="24"
                          title="Duração em horas"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          value={row.mpfmOil || ''}
                          onChange={(e) => updateRow(row.id, 'mpfmOil', parseFloat(e.target.value) || 0)}
                          className="w-20 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right"
                          placeholder="0"
                          title="MPFM Óleo"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          value={row.mpfmGas || ''}
                          onChange={(e) => updateRow(row.id, 'mpfmGas', parseFloat(e.target.value) || 0)}
                          className="w-20 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right"
                          placeholder="0"
                          title="MPFM Gás"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right text-blue-400 font-medium">
                        {row.mpfmTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          value={row.refTotal || ''}
                          onChange={(e) => updateRow(row.id, 'refTotal', parseFloat(e.target.value) || 0)}
                          className="w-20 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-emerald-400 text-right"
                          placeholder="0"
                          title="Referência Total"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <Badge
                          variant={status === 'OK' ? 'OK' : status === 'Alerta' ? 'Alerta' : 'Crítico'}
                          size="sm"
                        >
                          {row.desvio.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          value={row.alarmes}
                          onChange={(e) => updateRow(row.id, 'alarmes', e.target.value)}
                          className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                          placeholder="Nenhum"
                          title="Alarmes observados"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Remover período"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Total de períodos: {rows.length}</span>
              <span className={cn(
                rows.filter(r => getDesvioStatus(r.desvio) === 'OK').length === rows.length
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              )}>
                Períodos OK: {rows.filter(r => getDesvioStatus(r.desvio) === 'OK').length} / {rows.length}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
