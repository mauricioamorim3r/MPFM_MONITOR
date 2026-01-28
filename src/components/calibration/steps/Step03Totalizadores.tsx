import { useState, useCallback } from 'react'
import { Info, Database, Calculator, Plus, Trash2 } from 'lucide-react'
import { Card, Badge, SectionHeader, Button } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { formatNumber } from '@/utils'
import type { TotalizerRow } from '@/types'

const generateRowId = () => `tot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function Step03Totalizadores() {
  const { calibrationFormData, updateCalibrationFormData } = useAppStore()

  const [rows, setRows] = useState<TotalizerRow[]>(
    calibrationFormData?.totalizadores || []
  )

  const calculateDeltaHours = (start: string, end: string): number => {
    if (!start || !end) return 0
    const startDate = new Date(start)
    const endDate = new Date(end)
    return Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
  }

  const calculateHC = (oil: number, gas: number): number => oil + gas

  const addRow = useCallback(() => {
    const newRow: TotalizerRow = {
      id: generateRowId(),
      startTime: '',
      endTime: '',
      deltaHours: 0,
      mpfmOil: 0,
      mpfmGas: 0,
      mpfmWater: 0,
      mpfmHC: 0,
      mpfmTotal: 0,
      refOilVolume: 0,
      refOilDensity: 0,
      refOilMassCalc: 0,
      refOilMassPI: 0,
      refGas: 0,
      refWater: 0,
      refHC: 0,
      status: 'Pendente',
    }
    const updated = [...rows, newRow]
    setRows(updated)
    updateCalibrationFormData({ totalizadores: updated })
  }, [rows, updateCalibrationFormData])

  const removeRow = useCallback((id: string) => {
    const updated = rows.filter((r) => r.id !== id)
    setRows(updated)
    updateCalibrationFormData({ totalizadores: updated })
  }, [rows, updateCalibrationFormData])

  const updateRow = useCallback((id: string, field: keyof TotalizerRow, value: string | number) => {
    const updated = rows.map((row) => {
      if (row.id !== id) return row

      const updatedRow = { ...row, [field]: value }

      // Recalculate derived fields
      if (field === 'startTime' || field === 'endTime') {
        updatedRow.deltaHours = calculateDeltaHours(
          field === 'startTime' ? String(value) : row.startTime,
          field === 'endTime' ? String(value) : row.endTime
        )
      }

      if (field === 'mpfmOil' || field === 'mpfmGas') {
        const oil = field === 'mpfmOil' ? Number(value) : row.mpfmOil
        const gas = field === 'mpfmGas' ? Number(value) : row.mpfmGas
        updatedRow.mpfmHC = calculateHC(oil, gas)
      }

      if (field === 'refOilMassCalc' || field === 'refGas') {
        const oil = field === 'refOilMassCalc' ? Number(value) : row.refOilMassCalc
        const gas = field === 'refGas' ? Number(value) : row.refGas
        updatedRow.refHC = calculateHC(oil, gas)
      }

      // Update status based on data completeness
      if (updatedRow.deltaHours >= 24 && updatedRow.mpfmOil > 0 && updatedRow.refOilMassCalc > 0) {
        updatedRow.status = 'OK'
      } else if (updatedRow.startTime && updatedRow.endTime) {
        updatedRow.status = 'Parcial'
      }

      return updatedRow
    })

    setRows(updated)
    updateCalibrationFormData({ totalizadores: updated })
  }, [rows, updateCalibrationFormData])

  // Calculate totals
  const totalMPFMOil = rows.reduce((acc, t) => acc + t.mpfmOil, 0)
  const totalMPFMGas = rows.reduce((acc, t) => acc + t.mpfmGas, 0)
  const totalMPFMHC = rows.reduce((acc, t) => acc + t.mpfmHC, 0)
  const totalRefOil = rows.reduce((acc, t) => acc + t.refOilMassCalc, 0)
  const totalRefGas = rows.reduce((acc, t) => acc + t.refGas, 0)
  const totalDuration = rows.reduce((acc, t) => acc + t.deltaHours, 0)

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-xs text-blue-300">
          <Info className="w-3 h-3 inline mr-1" />
          Adicione períodos de totalização. As deltas e totais são calculados automaticamente.
          O período total deve ser de no mínimo 24 horas.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            icon={Database}
            title="Totalizadores / Horário (mínimo 24h)"
            color="blue"
          />
          <Button variant="primary" size="sm" icon={Plus} onClick={addRow}>
            Adicionar Período
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum período de totalização adicionado.</p>
            <p className="text-xs mt-1">Clique em "Adicionar Período" para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="py-2 px-1 text-left text-zinc-400">Início</th>
                  <th className="py-2 px-1 text-left text-zinc-400">Fim</th>
                  <th className="py-2 px-1 text-center text-zinc-400">Δt (h)</th>
                  <th className="py-2 px-1 text-right text-blue-400">MPFM Óleo (kg)</th>
                  <th className="py-2 px-1 text-right text-blue-400">MPFM Gás (kg)</th>
                  <th className="py-2 px-1 text-right text-blue-400">HC (kg)</th>
                  <th className="py-2 px-1 text-right text-emerald-400">REF Óleo (kg)</th>
                  <th className="py-2 px-1 text-right text-emerald-400">REF Gás (kg)</th>
                  <th className="py-2 px-1 text-center text-zinc-400">Status</th>
                  <th className="py-2 px-1 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-800/50">
                    <td className="py-1.5 px-1">
                      <input
                        type="datetime-local"
                        value={row.startTime}
                        onChange={(e) => updateRow(row.id, 'startTime', e.target.value)}
                        className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                        title="Início do período"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="datetime-local"
                        value={row.endTime}
                        onChange={(e) => updateRow(row.id, 'endTime', e.target.value)}
                        className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                        title="Fim do período"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center text-zinc-400">
                      {row.deltaHours.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        value={row.mpfmOil || ''}
                        onChange={(e) => updateRow(row.id, 'mpfmOil', parseFloat(e.target.value) || 0)}
                        className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-blue-400 text-right"
                        placeholder="0"
                        title="MPFM Óleo"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        value={row.mpfmGas || ''}
                        onChange={(e) => updateRow(row.id, 'mpfmGas', parseFloat(e.target.value) || 0)}
                        className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-blue-400 text-right"
                        placeholder="0"
                        title="MPFM Gás"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-right text-blue-400 font-medium">
                      {formatNumber(row.mpfmHC)}
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        value={row.refOilMassCalc || ''}
                        onChange={(e) => updateRow(row.id, 'refOilMassCalc', parseFloat(e.target.value) || 0)}
                        className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-emerald-400 text-right"
                        placeholder="0"
                        title="Referência Óleo"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        value={row.refGas || ''}
                        onChange={(e) => updateRow(row.id, 'refGas', parseFloat(e.target.value) || 0)}
                        className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-emerald-400 text-right"
                        placeholder="0"
                        title="Referência Gás"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <Badge variant={row.status as 'OK' | 'Parcial' | 'Pendente'} size="sm">
                        {row.status}
                      </Badge>
                    </td>
                    <td className="py-1.5 px-1">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <SectionHeader icon={Calculator} title="Total - Somatório" color="amber" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className={`p-3 rounded-lg ${totalDuration >= 24 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-zinc-800/50'}`}>
            <p className="text-xs text-zinc-500">Duração Total</p>
            <p className={`text-lg font-bold ${totalDuration >= 24 ? 'text-emerald-400' : 'text-white'}`}>
              {totalDuration.toFixed(1)}h
            </p>
            {totalDuration < 24 && (
              <p className="text-xs text-amber-400">Mínimo 24h</p>
            )}
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-xs text-zinc-500">MPFM Óleo</p>
            <p className="text-lg font-bold text-blue-400">{formatNumber(totalMPFMOil)}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-xs text-zinc-500">MPFM Gás</p>
            <p className="text-lg font-bold text-blue-400">{formatNumber(totalMPFMGas)}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-xs text-zinc-500">MPFM HC</p>
            <p className="text-lg font-bold text-blue-400">{formatNumber(totalMPFMHC)}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-xs text-zinc-500">REF Óleo</p>
            <p className="text-lg font-bold text-emerald-400">{formatNumber(totalRefOil)}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-xs text-zinc-500">REF Gás</p>
            <p className="text-lg font-bold text-emerald-400">{formatNumber(totalRefGas)}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
