import React, { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store/useAppStore'
import type { Meter } from '@/types'

interface NewMeterModalProps {
  isOpen: boolean
  onClose: () => void
  editingMeter?: Meter | null
}

interface FormData {
  tag: string
  name: string
  location: 'TOPSIDE' | 'SUBSEA'
  status: 'active' | 'inactive'
  serialNumber: string
  manufacturer: string
  model: string
  lastCalibration: string
  kOil: number
  kGas: number
  kWater: number
  daysToCalibration: number
}

const initialFormData: FormData = {
  tag: '',
  name: '',
  location: 'TOPSIDE',
  status: 'active',
  serialNumber: '',
  manufacturer: 'Pietro Fiorentini',
  model: 'Flowtwin',
  lastCalibration: new Date().toISOString().split('T')[0],
  kOil: 1.0,
  kGas: 1.0,
  kWater: 1.0,
  daysToCalibration: 365,
}

export const NewMeterModal: React.FC<NewMeterModalProps> = ({
  isOpen,
  onClose,
  editingMeter,
}) => {
  const { addMeter, updateMeter } = useAppStore()
  const [formData, setFormData] = useState<FormData>(
    editingMeter
      ? {
          tag: editingMeter.tag,
          name: editingMeter.name,
          location: editingMeter.location,
          status: editingMeter.status,
          serialNumber: editingMeter.serialNumber,
          manufacturer: editingMeter.manufacturer,
          model: editingMeter.model,
          lastCalibration: editingMeter.lastCalibration,
          kOil: editingMeter.kOil,
          kGas: editingMeter.kGas,
          kWater: editingMeter.kWater,
          daysToCalibration: editingMeter.daysToCalibration,
        }
      : initialFormData
  )
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const handleChange = useCallback(
    (field: keyof FormData, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    },
    []
  )

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.tag.trim()) {
      newErrors.tag = 'Tag é obrigatório'
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.tag)) {
      newErrors.tag = 'Tag deve conter apenas letras, números, - ou _'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = 'Número de série é obrigatório'
    }

    if (!formData.manufacturer.trim()) {
      newErrors.manufacturer = 'Fabricante é obrigatório'
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Modelo é obrigatório'
    }

    if (formData.kOil < 0.8 || formData.kOil > 1.2) {
      newErrors.kOil = 'K-factor deve estar entre 0.8 e 1.2'
    }

    if (formData.kGas < 0.8 || formData.kGas > 1.2) {
      newErrors.kGas = 'K-factor deve estar entre 0.8 e 1.2'
    }

    if (formData.kWater < 0.8 || formData.kWater > 1.2) {
      newErrors.kWater = 'K-factor deve estar entre 0.8 e 1.2'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    if (editingMeter) {
      updateMeter(editingMeter.id, formData)
    } else {
      addMeter(formData)
    }

    setFormData(initialFormData)
    onClose()
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingMeter ? 'Editar Medidor' : 'Novo Medidor MPFM'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Identificação</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tag do Medidor *"
              placeholder="Ex: MPFM-P55-001"
              value={formData.tag}
              onChange={(e) => handleChange('tag', e.target.value.toUpperCase())}
              error={errors.tag}
            />
            <Input
              label="Nome *"
              placeholder="Nome descritivo"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Select
              label="Localização *"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value as 'TOPSIDE' | 'SUBSEA')}
              options={[
                { value: 'TOPSIDE', label: 'Topside' },
                { value: 'SUBSEA', label: 'Subsea' },
              ]}
            />
            <Select
              label="Status *"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as 'active' | 'inactive')}
              options={[
                { value: 'active', label: 'Ativo' },
                { value: 'inactive', label: 'Inativo' },
              ]}
            />
          </div>
        </div>

        {/* Informações Técnicas */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Informações Técnicas</h3>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Número de Série *"
              placeholder="SN-XXXXXX"
              value={formData.serialNumber}
              onChange={(e) => handleChange('serialNumber', e.target.value)}
              error={errors.serialNumber}
            />
            <Input
              label="Fabricante *"
              placeholder="Pietro Fiorentini"
              value={formData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              error={errors.manufacturer}
            />
            <Input
              label="Modelo *"
              placeholder="Flowtwin"
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              error={errors.model}
            />
          </div>
        </div>

        {/* Calibração */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Calibração</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Última Calibração"
              type="date"
              value={formData.lastCalibration}
              onChange={(e) => handleChange('lastCalibration', e.target.value)}
            />
            <Input
              label="Dias até Próxima Calibração"
              type="number"
              value={formData.daysToCalibration}
              onChange={(e) => handleChange('daysToCalibration', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* K-Factors */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            K-Factors (faixa válida: 0.8 - 1.2)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="K-Factor Óleo"
              type="number"
              step="0.001"
              min="0.8"
              max="1.2"
              value={formData.kOil}
              onChange={(e) => handleChange('kOil', parseFloat(e.target.value) || 1.0)}
              error={errors.kOil}
            />
            <Input
              label="K-Factor Gás"
              type="number"
              step="0.001"
              min="0.8"
              max="1.2"
              value={formData.kGas}
              onChange={(e) => handleChange('kGas', parseFloat(e.target.value) || 1.0)}
              error={errors.kGas}
            />
            <Input
              label="K-Factor Água"
              type="number"
              step="0.001"
              min="0.8"
              max="1.2"
              value={formData.kWater}
              onChange={(e) => handleChange('kWater', parseFloat(e.target.value) || 1.0)}
              error={errors.kWater}
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            {editingMeter ? 'Salvar Alterações' : 'Adicionar Medidor'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
