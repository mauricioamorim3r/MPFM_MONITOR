import { useState, useEffect } from 'react'
import { FlaskConical, Beaker, Database, Layers, CheckCircle, Sparkles } from 'lucide-react'
import { Card, Input, Select, SectionHeader, Badge, Button } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { realCalibrationPVT } from '@/data/realData'
import type { MolarComposition } from '@/types'

const defaultComposition: MolarComposition[] = [
  { component: 'N₂', molecularWeight: 28.01, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'CO₂', molecularWeight: 44.01, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'H₂S', molecularWeight: 34.08, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'C₁', molecularWeight: 16.04, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'C₂', molecularWeight: 30.07, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'C₃', molecularWeight: 44.10, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'i-C₄', molecularWeight: 58.12, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'n-C₄', molecularWeight: 58.12, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'i-C₅', molecularWeight: 72.15, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'n-C₅', molecularWeight: 72.15, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'C₆', molecularWeight: 86.18, molPercent: 0, normalizedMolPercent: 0 },
  { component: 'C₇+', molecularWeight: 97.37, molPercent: 0, normalizedMolPercent: 0 },
]

export function Step02PVT() {
  const { calibrationFormData, updateCalibrationFormData } = useAppStore()

  const [composition, setComposition] = useState<MolarComposition[]>(
    calibrationFormData?.composicao || defaultComposition
  )

  const formData = calibrationFormData || {
    pvtReportId: '',
    dataAmostragem: '',
    pontoAmostragem: 'Separador',
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
    penelouxGas: 1.0,
    penelouxOil: 1.0,
    pvtLoadedFCS320: false,
    pvtLoadedFPM207: false,
    gammaRestarted: false,
    pressureVerified: false,
    temperatureVerified: false,
  }

  const handleChange = (field: string, value: string | number | boolean) => {
    updateCalibrationFormData({ [field]: value })
  }

  const handleCompositionChange = (index: number, value: number) => {
    const newComposition = [...composition]
    newComposition[index] = { ...newComposition[index], molPercent: value }
    setComposition(newComposition)
  }

  // Função para preencher com dados reais da calibração 211
  const handleLoadRealData = () => {
    // Atualiza campos do formulário
    updateCalibrationFormData({
      pvtReportId: `Calibration #${realCalibrationPVT.calibrationNo}`,
      dataAmostragem: realCalibrationPVT.startDate,
      pontoAmostragem: 'Separador de Teste',
      softwareModelagem: 'PVTsim',
      versaoModelo: 'v23.1.0',
      statusAprovacao: 'Aprovado',
      dataAprovacao: realCalibrationPVT.endDate,
      comentariosPVT: `Dados reais do FPSO Bacalhau - ${realCalibrationPVT.meterName}`,
      densidadeOleo: realCalibrationPVT.densities.oil.mpfm,
      densidadeGas: realCalibrationPVT.densities.gas.mpfm,
      densidadeAgua: realCalibrationPVT.densities.water.mpfm,
      gor: 350, // Valor típico
      bsw: 0.02, // ~2%
      fatorEncolhimento: 0.85,
      penelouxGas: realCalibrationPVT.peneloux.gas,
      penelouxOil: realCalibrationPVT.peneloux.oil,
      pvtLoadedFCS320: true,
      pvtLoadedFPM207: true,
      gammaRestarted: true,
      pressureVerified: true,
      temperatureVerified: true,
    })

    // Atualiza composição com dados reais
    const realComp: MolarComposition[] = realCalibrationPVT.composition.map((c) => ({
      component: c.component,
      molecularWeight: c.molecularWeight,
      molPercent: c.molPercent,
      normalizedMolPercent: c.molPercent,
    }))
    setComposition(realComp)
    updateCalibrationFormData({ composicao: realComp })
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateCalibrationFormData({ composicao: composition })
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [composition, updateCalibrationFormData])

  const somaMol = composition.reduce((acc, c) => acc + c.molPercent, 0)
  const mwMistura = somaMol > 0 
    ? composition.reduce((acc, c) => acc + c.molPercent * c.molecularWeight, 0) / somaMol
    : 0

  const controlItems = [
    { key: 'pvtLoadedFCS320', label: 'PVT carregada no FCS320' },
    { key: 'pvtLoadedFPM207', label: 'PVT carregada no FPM207' },
    { key: 'gammaRestarted', label: 'Gamma reiniciado' },
    { key: 'pressureVerified', label: 'Pressão verificada' },
    { key: 'temperatureVerified', label: 'Temperatura verificada' },
  ]

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader
            icon={FlaskConical}
            title="Identificação do Relatório PVT / Amostragem"
            color="purple"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadRealData}
            className="flex items-center gap-2 text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
          >
            <Sparkles size={14} />
            Carregar Dados Reais (Cal. #211)
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="ID do Relatório Laboratorial"
            value={formData.pvtReportId}
            onChange={(e) => handleChange('pvtReportId', e.target.value)}
            className="col-span-2"
            placeholder="Ex: SLB - P.1077663_2025BRRD-P004039"
          />
          <Input 
            label="Data da Amostragem" 
            type="date" 
            value={formData.dataAmostragem}
            onChange={(e) => handleChange('dataAmostragem', e.target.value)}
          />
          <Input 
            label="Ponto de Amostragem" 
            value={formData.pontoAmostragem}
            onChange={(e) => handleChange('pontoAmostragem', e.target.value)}
          />
          <Input
            label="Software de Modelagem"
            value={formData.softwareModelagem}
            onChange={(e) => handleChange('softwareModelagem', e.target.value)}
          />
          <Input
            label="Versão/Arquivo do Modelo"
            value={formData.versaoModelo}
            onChange={(e) => handleChange('versaoModelo', e.target.value)}
            placeholder="Ex: v23.1.0"
          />
          <Select
            label="Status de Aprovação (PVT GROUP)"
            value={formData.statusAprovacao}
            onChange={(e) => handleChange('statusAprovacao', e.target.value)}
            options={[
              { value: 'Pendente', label: 'Pendente' },
              { value: 'Em Análise', label: 'Em Análise' },
              { value: 'Aprovado', label: 'Aprovado' },
              { value: 'Reprovado', label: 'Reprovado' },
            ]}
          />
          <Input 
            label="Data de Aprovação" 
            type="date" 
            value={formData.dataAprovacao}
            onChange={(e) => handleChange('dataAprovacao', e.target.value)}
          />
        </div>
        <div className="mt-3">
          <Input
            label="Comentários"
            value={formData.comentariosPVT}
            onChange={(e) => handleChange('comentariosPVT', e.target.value)}
            placeholder="Observações sobre o relatório PVT..."
          />
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          icon={Beaker}
          title="Propriedades de Referência (@std)"
          color="blue"
        />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Input 
            label="Densidade Óleo" 
            type="number"
            value={formData.densidadeOleo || ''}
            onChange={(e) => handleChange('densidadeOleo', parseFloat(e.target.value) || 0)}
            unit="kg/m³" 
            placeholder="773.41"
          />
          <Input 
            label="Densidade Gás" 
            type="number"
            value={formData.densidadeGas || ''}
            onChange={(e) => handleChange('densidadeGas', parseFloat(e.target.value) || 0)}
            unit="kg/m³" 
            placeholder="0.87"
          />
          <Input 
            label="Densidade Água" 
            type="number"
            value={formData.densidadeAgua || ''}
            onChange={(e) => handleChange('densidadeAgua', parseFloat(e.target.value) || 0)}
            unit="kg/m³" 
            placeholder="1.25"
          />
          <Input 
            label="GOR" 
            type="number"
            value={formData.gor || ''}
            onChange={(e) => handleChange('gor', parseFloat(e.target.value) || 0)}
            unit="Sm³/Sm³" 
            placeholder="216.81"
          />
          <Input 
            label="BSW" 
            type="number"
            value={formData.bsw || ''}
            onChange={(e) => handleChange('bsw', parseFloat(e.target.value) || 0)}
            unit="%" 
            placeholder="5.5"
          />
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          icon={Database}
          title="Composição molar (mol%)"
          color="amber"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="py-2 px-2 text-left text-zinc-400">Componente</th>
                <th className="py-2 px-2 text-right text-zinc-400">Massa Molar</th>
                <th className="py-2 px-2 text-right text-zinc-400">mol% (entrada)</th>
                <th className="py-2 px-2 text-right text-zinc-400">mol% (normalizado)</th>
              </tr>
            </thead>
            <tbody>
              {composition.map((comp, index) => (
                <tr key={comp.component} className="border-b border-zinc-800/50">
                  <td className="py-1.5 px-2 text-zinc-200">{comp.component}</td>
                  <td className="py-1.5 px-2 text-right text-zinc-400">
                    {comp.molecularWeight.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <input
                      type="number"
                      step="0.001"
                      value={comp.molPercent || ''}
                      onChange={(e) => handleCompositionChange(index, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-blue-400 text-right"
                      placeholder="0.000"
                      title={`mol% de ${comp.component}`}
                    />
                  </td>
                  <td className="py-1.5 px-2 text-right text-emerald-400">
                    {somaMol > 0 ? ((comp.molPercent / somaMol) * 100).toFixed(3) : '0.000'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-zinc-800/50">
              <tr>
                <td className="py-2 px-2 text-zinc-200 font-medium">Soma mol%</td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-right text-blue-400 font-medium">{somaMol.toFixed(3)}</td>
                <td className="py-2 px-2 text-right text-emerald-400 font-medium">100.000</td>
              </tr>
              <tr>
                <td className="py-2 px-2 text-zinc-200 font-medium">MW mistura</td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-right text-amber-400 font-medium" colSpan={2}>
                  {mwMistura.toFixed(2)} kg/kmol
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionHeader icon={Layers} title="Fatores Peneloux" color="emerald" />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Peneloux Gas"
              type="number"
              step="0.001"
              value={formData.penelouxGas || ''}
              onChange={(e) => handleChange('penelouxGas', parseFloat(e.target.value) || 1)}
              inputSize="sm"
            />
            <Input
              label="Peneloux Oil"
              type="number"
              step="0.001"
              value={formData.penelouxOil || ''}
              onChange={(e) => handleChange('penelouxOil', parseFloat(e.target.value) || 1)}
              inputSize="sm"
            />
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader icon={CheckCircle} title="Controle de Aplicação PVT" color="emerald" />
          <p className="text-xs text-zinc-500 mb-3">Clique para alternar</p>
          <div className="space-y-2">
            {controlItems.map((item) => {
              const isChecked = formData[item.key as keyof typeof formData] as boolean
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleChange(item.key, !isChecked)}
                  className="w-full flex items-center justify-between p-2 bg-zinc-800/50 rounded hover:bg-zinc-700/50 transition-colors"
                >
                  <span className="text-xs text-zinc-300">{item.label}</span>
                  <Badge variant={isChecked ? 'OK' : 'Pendente'} size="sm">
                    {isChecked ? 'OK' : 'Pendente'}
                  </Badge>
                </button>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
