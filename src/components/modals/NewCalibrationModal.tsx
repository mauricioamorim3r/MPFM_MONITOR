import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { useAppStore } from '@/store/useAppStore'
import type { CalibrationType } from '@/types'

interface NewCalibrationModalProps {
  isOpen: boolean
  onClose: () => void
}

export const NewCalibrationModal: React.FC<NewCalibrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { meters, addCalibrationEvent, setSelectedEvent } = useAppStore()
  const [selectedMeterId, setSelectedMeterId] = useState('')
  const [calibrationType, setCalibrationType] = useState<CalibrationType>('Periódica')
  const [serviceOrder, setServiceOrder] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const activeMeters = meters.filter((m) => m.status === 'active')

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedMeterId) {
      newErrors.meterId = 'Selecione um medidor'
    }

    if (!calibrationType) {
      newErrors.type = 'Selecione o tipo de avaliação'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const meter = meters.find((m) => m.id === selectedMeterId)
    if (!meter) return

    const event = addCalibrationEvent(meter, calibrationType)
    setSelectedEvent(event)

    // Reset form
    setSelectedMeterId('')
    setCalibrationType('Periódica')
    setServiceOrder('')
    setErrors({})
    onClose()
  }

  const handleClose = () => {
    setSelectedMeterId('')
    setCalibrationType('Periódica')
    setServiceOrder('')
    setErrors({})
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nova Avaliação de Calibração" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Aviso se não há medidores */}
        {activeMeters.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700">
              ⚠️ Nenhum medidor ativo cadastrado. Adicione um medidor antes de criar uma
              avaliação de calibração.
            </p>
          </div>
        )}

        {/* Seleção de Medidor */}
        <div>
          <Select
            label="Medidor MPFM *"
            value={selectedMeterId}
            onChange={(e) => {
              setSelectedMeterId(e.target.value)
              setErrors((prev) => ({ ...prev, meterId: '' }))
            }}
            options={[
              { value: '', label: 'Selecione um medidor...' },
              ...activeMeters.map((m) => ({
                value: m.id,
                label: `${m.tag} - ${m.name} (${m.location})`,
              })),
            ]}
            error={errors.meterId}
          />
        </div>

        {/* Tipo de Avaliação */}
        <div>
          <Select
            label="Tipo de Avaliação *"
            value={calibrationType}
            onChange={(e) => {
              setCalibrationType(e.target.value as CalibrationType)
              setErrors((prev) => ({ ...prev, type: '' }))
            }}
            options={[
              { value: 'Comissionamento', label: 'Comissionamento - Primeira calibração do medidor' },
              { value: 'Periódica', label: 'Periódica - Calibração regular (anual)' },
              { value: 'Especial', label: 'Especial - Após manutenção ou alteração' },
              { value: 'Investigação', label: 'Investigação - Desvio detectado no monitoramento' },
            ]}
            error={errors.type}
          />
        </div>

        {/* Ordem de Serviço (Opcional) */}
        <div>
          <Input
            label="Ordem de Serviço (Opcional)"
            placeholder="Ex: OS-2024-001"
            value={serviceOrder}
            onChange={(e) => setServiceOrder(e.target.value)}
          />
        </div>

        {/* Informações */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Etapas da Avaliação</h4>
          <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
            <li>Registro e Identificação</li>
            <li>Configuração PVT</li>
            <li>Totalizadores</li>
            <li>Cálculo K-Factors</li>
            <li>Balanço de Massas</li>
            <li>Monitoramento Pós</li>
            <li>Registro de Alarmes</li>
          </ol>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={activeMeters.length === 0}>
            Iniciar Avaliação
          </Button>
        </div>
      </form>
    </Modal>
  )
}
