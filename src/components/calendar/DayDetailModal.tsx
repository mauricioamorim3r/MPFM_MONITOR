import { useState } from 'react'
import {
  Calendar,
  BarChart3,
  Droplets,
  Flame,
  Waves,
  Edit3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
} from 'lucide-react'
import { Modal, Button, Badge, Card, Input, useToast } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { useAuditLog } from '@/hooks/useAuditLog'
import { cn } from '@/utils'

interface DayDetailModalProps {
  isOpen: boolean
  onClose: () => void
  date: string | null
}

export function DayDetailModal({ isOpen, onClose, date }: DayDetailModalProps) {
  const monitoringData = useAppStore((state) => state.monitoringData)
  const updateMonitoringData = useAppStore((state) => state.updateMonitoringData)
  const addAlert = useAppStore((state) => state.addAlert)
  
  const { logAction } = useAuditLog()
  const toast = useToast()

  const [isEditing, setIsEditing] = useState(false)
  const [editReason, setEditReason] = useState('')
  const [editValues, setEditValues] = useState<Record<string, number>>({})

  if (!date) return null

  const dayData = monitoringData.find((d) => d.date === date)

  if (!dayData) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Dia" size="md">
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <Calendar size={48} className="mb-4 opacity-50" />
          <p>Sem dados de medição para {date}</p>
        </div>
      </Modal>
    )
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const statusConfig = {
    OK: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ALERT: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    FAIL: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  }

  const status = statusConfig[dayData.hcStatus] || statusConfig.OK
  const StatusIcon = status.icon

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditValues({
      subOil: dayData.subOil,
      subGas: dayData.subGas,
      subWater: dayData.subWater || 0,
      topOil: dayData.topOil,
      topGas: dayData.topGas,
      topWater: dayData.topWater || 0,
    })
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditReason('')
    setEditValues({})
  }

  const handleSaveEdit = () => {
    if (!editReason.trim()) {
      addAlert({
        type: 'error',
        severity: 'warning',
        message: 'É necessário informar o motivo da alteração',
      })
      return
    }

    // Recalcular balanços
    const subHC = editValues.subOil + editValues.subGas
    const topHC = editValues.topOil + editValues.topGas
    const hcBalTS = subHC > 0 ? ((topHC - subHC) / subHC) * 100 : 0
    const subTotal = subHC + (editValues.subWater || 0)
    const topTotal = topHC + (editValues.topWater || 0)
    const totalBalTS = subTotal > 0 ? ((topTotal - subTotal) / subTotal) * 100 : 0

    // Determinar novo status
    const newHcStatus: 'OK' | 'ALERT' | 'FAIL' =
      Math.abs(hcBalTS) > 10 ? 'FAIL' : Math.abs(hcBalTS) > 7 ? 'ALERT' : 'OK'

    const newTotalStatus: 'OK' | 'ALERT' | 'FAIL' =
      Math.abs(totalBalTS) > 7 ? 'FAIL' : Math.abs(totalBalTS) > 5 ? 'ALERT' : 'OK'

    // Atualizar dados
    updateMonitoringData(dayData.id, {
      subOil: editValues.subOil,
      subGas: editValues.subGas,
      subWater: editValues.subWater,
      subHC,
      topOil: editValues.topOil,
      topGas: editValues.topGas,
      topWater: editValues.topWater,
      topHC,
      hcBalTS: parseFloat(hcBalTS.toFixed(2)),
      totalBalTS: parseFloat(totalBalTS.toFixed(2)),
      hcBalancePercent: parseFloat(hcBalTS.toFixed(2)),
      totalBalancePercent: parseFloat(totalBalTS.toFixed(2)),
      hcStatus: newHcStatus,
      totalStatus: newTotalStatus,
      action: newHcStatus === 'FAIL' || newTotalStatus === 'FAIL' ? 'INVESTIGAR' : 'MONITORAR',
    })

    // Registrar auditoria detalhada
    logAction('UPDATE', 'MONITORING_DATA', dayData.id, {
      entityName: `Dados de medição - ${formatDate(date)}`,
      previousValue: {
        subOil: dayData.subOil,
        subGas: dayData.subGas,
        topOil: dayData.topOil,
        topGas: dayData.topGas,
      },
      newValue: {
        subOil: editValues.subOil,
        subGas: editValues.subGas,
        topOil: editValues.topOil,
        topGas: editValues.topGas,
      },
      reason: editReason,
    })

    // Notificar usuário
    toast.success(
      'Dados atualizados',
      `Medição de ${formatDate(date)} atualizada com sucesso`
    )

    addAlert({
      type: 'info',
      severity: 'info',
      message: `Dados de ${formatDate(date)} editados. Motivo: ${editReason}`,
    })

    setIsEditing(false)
    setEditReason('')
    setEditValues({})
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', status.bg)}>
              <StatusIcon className={status.color} size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {formatDate(date)}
              </h2>
              <p className="text-sm text-zinc-400">
                Dados de medição diária
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={dayData.hcStatus === 'OK' ? 'success' : dayData.hcStatus === 'ALERT' ? 'warning' : 'error'}>
              {dayData.hcStatus}
            </Badge>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Edit3 size={14} className="mr-1" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Balanço de Massa */}
        <Card className="p-4 bg-zinc-800/50">
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <BarChart3 size={16} />
            Balanço de Massa
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-zinc-900/50">
              <p className="text-xs text-zinc-500 mb-1">Balanço HC</p>
              <p className={cn('text-2xl font-bold', 
                Math.abs(dayData.hcBalTS) > 10 ? 'text-red-400' :
                Math.abs(dayData.hcBalTS) > 7 ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {dayData.hcBalTS > 0 ? '+' : ''}{dayData.hcBalTS.toFixed(2)}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">Limite: ±10%</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-zinc-900/50">
              <p className="text-xs text-zinc-500 mb-1">Balanço Total</p>
              <p className={cn('text-2xl font-bold',
                Math.abs(dayData.totalBalTS) > 7 ? 'text-red-400' :
                Math.abs(dayData.totalBalTS) > 5 ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {dayData.totalBalTS > 0 ? '+' : ''}{dayData.totalBalTS.toFixed(2)}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">Limite: ±7%</p>
            </div>
          </div>
        </Card>

        {/* Dados de Medição */}
        <div className="grid grid-cols-2 gap-4">
          {/* Subsea */}
          <Card className="p-4 bg-zinc-800/50">
            <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
              <Waves size={16} />
              SUBSEA (MPFM)
            </h3>
            <div className="space-y-2">
              {isEditing ? (
                <>
                  <Input
                    label="Óleo (t)"
                    type="number"
                    value={editValues.subOil}
                    onChange={(e) => setEditValues({...editValues, subOil: parseFloat(e.target.value) || 0})}
                  />
                  <Input
                    label="Gás (t)"
                    type="number"
                    value={editValues.subGas}
                    onChange={(e) => setEditValues({...editValues, subGas: parseFloat(e.target.value) || 0})}
                  />
                  <Input
                    label="Água (t)"
                    type="number"
                    value={editValues.subWater}
                    onChange={(e) => setEditValues({...editValues, subWater: parseFloat(e.target.value) || 0})}
                  />
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Droplets size={12} /> Óleo
                    </span>
                    <span className="text-white font-mono">{dayData.subOil.toFixed(2)} t</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Flame size={12} /> Gás
                    </span>
                    <span className="text-white font-mono">{dayData.subGas.toFixed(2)} t</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Waves size={12} /> Água
                    </span>
                    <span className="text-white font-mono">{(dayData.subWater || 0).toFixed(2)} t</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-700">
                    <span className="text-zinc-300 font-medium">HC Total</span>
                    <span className="text-blue-400 font-mono font-medium">{dayData.subHC.toFixed(2)} t</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Topside */}
          <Card className="p-4 bg-zinc-800/50">
            <h3 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
              <BarChart3 size={16} />
              TOPSIDE (MPFM)
            </h3>
            <div className="space-y-2">
              {isEditing ? (
                <>
                  <Input
                    label="Óleo (t)"
                    type="number"
                    value={editValues.topOil}
                    onChange={(e) => setEditValues({...editValues, topOil: parseFloat(e.target.value) || 0})}
                  />
                  <Input
                    label="Gás (t)"
                    type="number"
                    value={editValues.topGas}
                    onChange={(e) => setEditValues({...editValues, topGas: parseFloat(e.target.value) || 0})}
                  />
                  <Input
                    label="Água (t)"
                    type="number"
                    value={editValues.topWater}
                    onChange={(e) => setEditValues({...editValues, topWater: parseFloat(e.target.value) || 0})}
                  />
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Droplets size={12} /> Óleo
                    </span>
                    <span className="text-white font-mono">{dayData.topOil.toFixed(2)} t</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Flame size={12} /> Gás
                    </span>
                    <span className="text-white font-mono">{dayData.topGas.toFixed(2)} t</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Waves size={12} /> Água
                    </span>
                    <span className="text-white font-mono">{(dayData.topWater || 0).toFixed(2)} t</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-700">
                    <span className="text-zinc-300 font-medium">HC Total</span>
                    <span className="text-purple-400 font-mono font-medium">{dayData.topHC.toFixed(2)} t</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Campo de Justificativa (modo edição) */}
        {isEditing && (
          <Card className="p-4 bg-amber-500/10 border-amber-500/30">
            <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
              <FileText size={16} />
              Justificativa da Alteração (obrigatório)
            </h3>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Descreva o motivo da alteração para registro de auditoria..."
              className="w-full h-20 bg-zinc-900/50 border border-zinc-700 rounded-lg p-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </Card>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSaveEdit}>
                Salvar Alterações
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
