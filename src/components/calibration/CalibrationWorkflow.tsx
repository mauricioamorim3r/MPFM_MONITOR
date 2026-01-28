import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Save, FileText, Check } from 'lucide-react'
import { Button, Card, Badge, StepIndicator } from '@/components/ui'
import type { CalibrationEvent } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { Step01Registro } from './steps/Step01Registro'
import { Step02PVT } from './steps/Step02PVT'
import { Step03Totalizadores } from './steps/Step03Totalizadores'
import { Step04KFactors } from './steps/Step04KFactors'
import { Step05Balanco } from './steps/Step05Balanco'
import { Step06Monitoramento } from './steps/Step06Monitoramento'
import { Step07Alarmes } from './steps/Step07Alarmes'

const STEPS = [
  'Registro',
  'PVT',
  'Totalizadores',
  'K-Fatores',
  'Balanços',
  'Pós-Monit.',
  'Alarmes',
]

interface CalibrationWorkflowProps {
  event: CalibrationEvent
  onBack: () => void
}

export function CalibrationWorkflow({ event, onBack }: CalibrationWorkflowProps) {
  const { 
    setSelectedEvent, 
    setCalibrationFormData,
    calibrationFormData,
    completeCalibrationStep,
    finalizeCalibration,
  } = useAppStore()
  
  const [currentStep, setCurrentStep] = useState(event.currentStep)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form data when event is selected
  useEffect(() => {
    setSelectedEvent(event)
    if (!calibrationFormData || calibrationFormData.eventId !== event.id) {
      setCalibrationFormData({
        eventId: event.id,
        status: event.status,
        resultado: event.result || '',
        operador: '',
        serviceOrder: '',
        responsavelCalibracao: event.responsible,
        preenchidoPor: '',
        dataEmissao: new Date().toISOString().split('T')[0],
        unidade: '',
        baciaCampo: '',
        localizacao: '',
        referenciaMet: '',
        tagMPFM: event.meterTag,
        serialNumber: '',
        fabricante: '',
        modelo: '',
        tamanho: '',
        razaoBeta: '',
        modoMedicao: '',
        sistema: '',
        versaoSoftwareMedidor: '',
        versaoFPM207: '',
        versaoFCS320: '',
        versaoPVTsim: '',
        naturezaAtividade: event.type,
        idEventoDesvio: '',
        inicioEstabilizacao: event.startDate,
        inicioTotalizacao: '',
        fimTotalizacao: '',
        duracaoEfetiva: 0,
        observacoesIniciais: '',
        comentariosGerais: '',
        pvtReportId: '',
        dataAmostragem: '',
        pontoAmostragem: '',
        softwareModelagem: 'PVTsim',
        versaoModelo: '',
        statusAprovacao: 'Pendente',
        dataAprovacao: '',
        comentariosPVT: '',
        densidadeOleo: 0,
        densidadeGas: 0,
        densidadeAgua: 0,
        gor: 0,
        bsw: 0,
        fatorEncolhimento: 0,
        composicao: [],
        penelouxGas: 1.0,
        penelouxOil: 1.0,
        pvtLoadedFCS320: false,
        pvtLoadedFPM207: false,
        gammaRestarted: false,
        pressureVerified: false,
        temperatureVerified: false,
        totalizadores: [],
        kMin: 0.8,
        kMax: 1.2,
        limiteHC: 10,
        limiteTotal: 7,
        massas: {
          oleo: { mpfm: 0, ref: 0 },
          gas: { mpfm: 0, ref: 0 },
          agua: { mpfm: 0, ref: 0 },
        },
        kFactors: {
          kOil: 1.0,
          kGas: 1.0,
          kWater: 1.0,
          kOilStatus: 'Dentro',
          kGasStatus: 'Dentro',
          kWaterStatus: 'Dentro',
        },
        balancoTopOil: 0,
        balancoTopGas: 0,
        balancoGasLift: 0,
        balancoDesvio: 0,
        monitoramentoPosData: [],
        alarmes: [],
      })
    }
  }, [event, setSelectedEvent, setCalibrationFormData, calibrationFormData])

  const handleSave = async () => {
    setIsSaving(true)
    // Data is auto-saved via Zustand persist
    setTimeout(() => {
      setIsSaving(false)
      alert('Dados salvos com sucesso!')
    }, 500)
  }

  const handleNextStep = () => {
    completeCalibrationStep(event.id, currentStep)
    setCurrentStep(Math.min(7, currentStep + 1))
  }

  const handleFinalize = () => {
    const result = confirm('Deseja aprovar ou reprovar a calibração?\n\nOK = Aprovado\nCancelar = Reprovado')
    finalizeCalibration(event.id, result ? 'Aprovado' : 'Reprovado')
    alert(`Calibração ${result ? 'aprovada' : 'reprovada'} com sucesso!`)
    onBack()
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step01Registro event={event} />
      case 2:
        return <Step02PVT />
      case 3:
        return <Step03Totalizadores />
      case 4:
        return <Step04KFactors />
      case 5:
        return <Step05Balanco />
      case 6:
        return <Step06Monitoramento />
      case 7:
        return <Step07Alarmes />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} icon={ChevronLeft}>
            Voltar
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-white">{event.id}</h2>
            <p className="text-xs text-zinc-500">
              {event.meterTag} - {event.meterName} | {event.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">{event.status}</Badge>
          <Button 
            variant="secondary" 
            size="sm" 
            icon={Save} 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="secondary" size="sm" icon={FileText}>
            Relatório
          </Button>
        </div>
      </div>

      {/* Step Navigator */}
      <Card className="p-3">
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />
      </Card>

      {/* Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="secondary"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          icon={ChevronLeft}
        >
          Anterior
        </Button>
        <div className="flex gap-2">
          {currentStep < 7 ? (
            <Button onClick={handleNextStep}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button variant="success" icon={Check} onClick={handleFinalize}>
              Concluir Avaliação
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
