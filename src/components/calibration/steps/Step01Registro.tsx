import { Clipboard, Database, Gauge, Settings, Calendar, FileText } from 'lucide-react'
import { Card, Input, Select, SectionHeader } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import type { CalibrationEvent } from '@/types'

interface Step01RegistroProps {
  event: CalibrationEvent
}

export function Step01Registro({ event }: Step01RegistroProps) {
  const { calibrationFormData, updateCalibrationFormData, user } = useAppStore()

  const handleChange = (field: string, value: string | number) => {
    updateCalibrationFormData({ [field]: value })
  }

  const formData = calibrationFormData || {
    eventId: event.id,
    status: event.status,
    resultado: '',
    operador: 'Equinor Brasil Energia Ltda.',
    serviceOrder: '-',
    responsavelCalibracao: event.responsible || user.name,
    preenchidoPor: user.name,
    dataEmissao: new Date().toISOString().split('T')[0],
    unidade: 'FPSO Bacalhau',
    baciaCampo: 'Santos / Bacalhau',
    localizacao: `MEDIDOR SUBSEA - Poço ${event.meterName}`,
    referenciaMet: 'Separador de Teste - TAG: 20VA121',
    tagMPFM: event.meterTag,
    serialNumber: '',
    fabricante: 'TechnipFMC',
    modelo: 'MPM High-Performance Flowmeter',
    tamanho: '5"',
    razaoBeta: 'B = 0.7 MPM',
    modoMedicao: 'Dual Mode',
    sistema: event.meterName,
    versaoSoftwareMedidor: '',
    versaoFPM207: '',
    versaoFCS320: '',
    versaoPVTsim: '',
    naturezaAtividade: `${event.type} - ${event.meterName} - ${event.meterTag}`,
    idEventoDesvio: '-',
    inicioEstabilizacao: '',
    inicioTotalizacao: '',
    fimTotalizacao: '',
    duracaoEfetiva: 24,
    observacoesIniciais: '',
    comentariosGerais: '',
  }

  return (
    <div className="space-y-4">
      {/* Identificação do Responsável */}
      <Card className="p-4">
        <SectionHeader
          icon={Clipboard}
          title="Identificação do Responsável e Autoridade"
          color="blue"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input 
            label="ID do Evento/Relatório" 
            value={formData.eventId} 
            readOnly 
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={[
              { value: 'Em Andamento', label: 'Em Andamento' },
              { value: 'Aguardando PVT', label: 'Aguardando PVT' },
              { value: 'Em Totalização', label: 'Em Totalização' },
              { value: 'Concluída', label: 'Concluída' },
            ]}
          />
          <Input 
            label="Operador" 
            value={formData.operador}
            onChange={(e) => handleChange('operador', e.target.value)}
          />
          <Select
            label="Resultado"
            value={formData.resultado}
            onChange={(e) => handleChange('resultado', e.target.value)}
            options={[
              { value: '', label: 'Pendente' },
              { value: 'Aprovado', label: 'Aprovado' },
              { value: 'Reprovado', label: 'Reprovado' },
            ]}
          />
          <Input 
            label="Ordem de Serviço (S.O.)" 
            value={formData.serviceOrder}
            onChange={(e) => handleChange('serviceOrder', e.target.value)}
          />
          <Input 
            label="Responsável Calibração" 
            value={formData.responsavelCalibracao}
            onChange={(e) => handleChange('responsavelCalibracao', e.target.value)}
          />
          <Input 
            label="Preenchido por" 
            value={formData.preenchidoPor}
            onChange={(e) => handleChange('preenchidoPor', e.target.value)}
          />
          <Input 
            label="Data de Emissão" 
            type="date" 
            value={formData.dataEmissao}
            onChange={(e) => handleChange('dataEmissao', e.target.value)}
          />
        </div>
      </Card>

      {/* Dados da Instalação */}
      <Card className="p-4">
        <SectionHeader icon={Database} title="Dados da Instalação" color="purple" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input 
            label="Unidade / FPSO" 
            value={formData.unidade} 
            onChange={(e) => handleChange('unidade', e.target.value)}
          />
          <Input 
            label="Bacia / Campo" 
            value={formData.baciaCampo}
            onChange={(e) => handleChange('baciaCampo', e.target.value)}
          />
          <Input
            label="Localização na Planta"
            value={formData.localizacao}
            onChange={(e) => handleChange('localizacao', e.target.value)}
            className="col-span-2"
          />
          <Input
            label="Referência Metrológica (Autorizada)"
            value={formData.referenciaMet}
            onChange={(e) => handleChange('referenciaMet', e.target.value)}
            className="col-span-2"
          />
        </div>
      </Card>

      {/* Identificação do Instrumento */}
      <Card className="p-4">
        <SectionHeader
          icon={Gauge}
          title="Identificação do Instrumento (MPFM)"
          color="amber"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input 
            label="TAG do MPFM" 
            value={formData.tagMPFM} 
            readOnly 
          />
          <Input 
            label="Número de Série (S/N)" 
            value={formData.serialNumber}
            onChange={(e) => handleChange('serialNumber', e.target.value)}
            placeholder="Ex: 14-100269"
          />
          <Input
            label="Fabricante"
            value={formData.fabricante}
            onChange={(e) => handleChange('fabricante', e.target.value)}
          />
          <Input
            label="Modelo"
            value={formData.modelo}
            onChange={(e) => handleChange('modelo', e.target.value)}
          />
          <Input 
            label="Tamanho" 
            value={formData.tamanho}
            onChange={(e) => handleChange('tamanho', e.target.value)}
          />
          <Input 
            label="Razão Beta" 
            value={formData.razaoBeta}
            onChange={(e) => handleChange('razaoBeta', e.target.value)}
          />
          <Input 
            label="Modo de Medição Ativo" 
            value={formData.modoMedicao}
            onChange={(e) => handleChange('modoMedicao', e.target.value)}
          />
          <Input 
            label="Sistema" 
            value={formData.sistema} 
            readOnly 
          />
        </div>
      </Card>

      {/* Configuração de Software */}
      <Card className="p-4">
        <SectionHeader
          icon={Settings}
          title="Configuração de Software e Integridade"
          color="emerald"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="Versão de Software (Medidor)"
            value={formData.versaoSoftwareMedidor}
            onChange={(e) => handleChange('versaoSoftwareMedidor', e.target.value)}
            placeholder="Ex: FW-MPM-BAC-v1.12.3"
          />
          <Input
            label="Versão do Computador de Vazão FPM207"
            value={formData.versaoFPM207}
            onChange={(e) => handleChange('versaoFPM207', e.target.value)}
            placeholder="Ex: v2.8.5"
          />
          <Input
            label="Versão do Software FCS320"
            value={formData.versaoFCS320}
            onChange={(e) => handleChange('versaoFCS320', e.target.value)}
            placeholder="Ex: v8.4.1 Build 710"
          />
          <Input
            label="Software de Simulação (Calsep PVTsim)"
            value={formData.versaoPVTsim}
            onChange={(e) => handleChange('versaoPVTsim', e.target.value)}
            placeholder="Ex: v23.1.0"
          />
        </div>
      </Card>

      {/* Escopo e Período */}
      <Card className="p-4">
        <SectionHeader
          icon={Calendar}
          title="Escopo e Período do Teste de Calibração"
          color="red"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="Natureza da Atividade"
            value={formData.naturezaAtividade}
            className="col-span-2"
            readOnly
          />
          <Input 
            label="ID do Evento de Desvio (se aplicável)" 
            value={formData.idEventoDesvio}
            onChange={(e) => handleChange('idEventoDesvio', e.target.value)}
          />
          <div></div>
          <Input
            label="Início da Estabilização"
            type="datetime-local"
            value={formData.inicioEstabilizacao}
            onChange={(e) => handleChange('inicioEstabilizacao', e.target.value)}
          />
          <Input
            label="Início da Totalização (24h)"
            type="datetime-local"
            value={formData.inicioTotalizacao}
            onChange={(e) => handleChange('inicioTotalizacao', e.target.value)}
          />
          <Input
            label="Fim da Totalização"
            type="datetime-local"
            value={formData.fimTotalizacao}
            onChange={(e) => handleChange('fimTotalizacao', e.target.value)}
          />
          <Input 
            label="Duração Total Efetiva (h)" 
            value={String(formData.duracaoEfetiva)} 
            unit="h" 
            readOnly 
          />
          <Input
            label="Observações Iniciais"
            className="col-span-2"
            value={formData.observacoesIniciais}
            onChange={(e) => handleChange('observacoesIniciais', e.target.value)}
            placeholder="Observações..."
          />
        </div>
      </Card>

      {/* Comentários Gerais */}
      <Card className="p-4">
        <SectionHeader icon={FileText} title="Comentários Gerais" />
        <textarea
          className="w-full h-24 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          placeholder="Observações adicionais sobre o evento de calibração..."
          value={formData.comentariosGerais}
          onChange={(e) => handleChange('comentariosGerais', e.target.value)}
        />
      </Card>
    </div>
  )
}
