import { useState, useCallback } from 'react'
import { AlertTriangle, Bell, Plus, Trash2, CheckCircle } from 'lucide-react'
import { Card, SectionHeader, Button } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils'

interface AlarmRow {
  id: string
  dataHora: string
  tag: string
  codigo: string
  descricao: string
  gravidade: 'Info' | 'Warning' | 'Critical'
  acaoTomada: string
}

const generateId = () => `alm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const migrateAlarmRows = (data: unknown[]): AlarmRow[] => {
  if (!data || !Array.isArray(data)) return []
  return data.map((row) => ({
    id: (row as { id?: string }).id || generateId(),
    dataHora: (row as { dataHora?: string }).dataHora || '',
    tag: (row as { tag?: string }).tag || '',
    codigo: (row as { codigo?: string }).codigo || '',
    descricao: (row as { descricao?: string }).descricao || '',
    gravidade: ((row as { gravidade?: string }).gravidade as AlarmRow['gravidade']) || 'Info',
    acaoTomada: (row as { acaoTomada?: string }).acaoTomada || '',
  }))
}

export function Step07Alarmes() {
  const { calibrationFormData, updateCalibrationFormData, selectedEvent } = useAppStore()

  const [rows, setRows] = useState<AlarmRow[]>(() =>
    migrateAlarmRows(calibrationFormData?.alarmes || [])
  )

  const addRow = useCallback(() => {
    const newRow: AlarmRow = {
      id: generateId(),
      dataHora: new Date().toISOString().slice(0, 16),
      tag: selectedEvent?.meterTag || '',
      codigo: '',
      descricao: '',
      gravidade: 'Info',
      acaoTomada: '',
    }
    const updated = [...rows, newRow]
    setRows(updated)
    updateCalibrationFormData({ alarmes: updated })
  }, [rows, updateCalibrationFormData, selectedEvent])

  const removeRow = useCallback((id: string) => {
    const updated = rows.filter((r) => r.id !== id)
    setRows(updated)
    updateCalibrationFormData({ alarmes: updated })
  }, [rows, updateCalibrationFormData])

  const updateRow = useCallback((id: string, field: keyof AlarmRow, value: string) => {
    const updated = rows.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    )
    setRows(updated)
    updateCalibrationFormData({ alarmes: updated })
  }, [rows, updateCalibrationFormData])

  const getGravidadeColor = (gravidade: AlarmRow['gravidade']) => {
    switch (gravidade) {
      case 'Critical':
        return 'bg-red-500/10 border-red-500/20'
      case 'Warning':
        return 'bg-amber-500/10 border-amber-500/20'
      default:
        return 'bg-blue-500/10 border-blue-500/20'
    }
  }

  const criticalCount = rows.filter((r) => r.gravidade === 'Critical').length
  const warningCount = rows.filter((r) => r.gravidade === 'Warning').length

  return (
    <div className="space-y-4">
      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-xs text-red-300">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          Use este log para rastreabilidade: alarmes críticos devem estar inativos no
          início do teste e investigados quando ocorrerem.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className={cn(
          'p-3 rounded-lg border text-center',
          rows.length === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-800/50 border-zinc-700'
        )}>
          <p className="text-xs text-zinc-500">Total de Alarmes</p>
          <p className="text-2xl font-bold text-white">{rows.length}</p>
        </div>
        <div className={cn(
          'p-3 rounded-lg border text-center',
          criticalCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
        )}>
          <p className="text-xs text-zinc-500">Críticos</p>
          <p className={cn('text-2xl font-bold', criticalCount > 0 ? 'text-red-400' : 'text-emerald-400')}>
            {criticalCount}
          </p>
        </div>
        <div className={cn(
          'p-3 rounded-lg border text-center',
          warningCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
        )}>
          <p className="text-xs text-zinc-500">Warnings</p>
          <p className={cn('text-2xl font-bold', warningCount > 0 ? 'text-amber-400' : 'text-emerald-400')}>
            {warningCount}
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            icon={Bell}
            title="Registro de Alarmes / Eventos (HMI/MPM/FCS320)"
            color="red"
          />
          <Button variant="secondary" size="sm" icon={Plus} onClick={addRow}>
            Adicionar Alarme
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-50" />
            <p className="text-emerald-400">Nenhum alarme registrado durante o período.</p>
            <p className="text-xs mt-1">Isso é um bom sinal para a calibração.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="py-2 px-2 text-left text-zinc-400">Data/Hora</th>
                  <th className="py-2 px-2 text-left text-zinc-400">TAG</th>
                  <th className="py-2 px-2 text-left text-zinc-400">Código</th>
                  <th className="py-2 px-2 text-left text-zinc-400">Descrição</th>
                  <th className="py-2 px-2 text-center text-zinc-400">Gravidade</th>
                  <th className="py-2 px-2 text-left text-zinc-400">Ação Tomada</th>
                  <th className="py-2 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((alarm) => (
                  <tr
                    key={alarm.id}
                    className={cn('border-b border-zinc-800/50', getGravidadeColor(alarm.gravidade))}
                  >
                    <td className="py-1.5 px-2">
                      <input
                        type="datetime-local"
                        value={alarm.dataHora}
                        onChange={(e) => updateRow(alarm.id, 'dataHora', e.target.value)}
                        className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                        title="Data e hora do alarme"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        value={alarm.tag}
                        onChange={(e) => updateRow(alarm.id, 'tag', e.target.value)}
                        className="w-24 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-blue-400"
                        placeholder="TAG"
                        title="TAG do equipamento"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        value={alarm.codigo}
                        onChange={(e) => updateRow(alarm.id, 'codigo', e.target.value)}
                        className="w-20 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                        placeholder="Código"
                        title="Código do alarme"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        value={alarm.descricao}
                        onChange={(e) => updateRow(alarm.id, 'descricao', e.target.value)}
                        className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                        placeholder="Descrição do alarme"
                        title="Descrição detalhada"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={alarm.gravidade}
                        onChange={(e) => updateRow(alarm.id, 'gravidade', e.target.value as AlarmRow['gravidade'])}
                        className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                        title="Gravidade do alarme"
                      >
                        <option value="Info">Info</option>
                        <option value="Warning">Warning</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        value={alarm.acaoTomada}
                        onChange={(e) => updateRow(alarm.id, 'acaoTomada', e.target.value)}
                        className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                        placeholder="Ação tomada"
                        title="Ação tomada para resolver"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <button
                        type="button"
                        onClick={() => removeRow(alarm.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Remover alarme"
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

      {criticalCount > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Atenção</span>
          </div>
          <p className="text-xs text-red-300">
            Há {criticalCount} alarme(s) crítico(s) registrado(s). Certifique-se de que todos 
            foram investigados e as ações corretivas foram tomadas antes de finalizar a calibração.
          </p>
        </div>
      )}
    </div>
  )
}
