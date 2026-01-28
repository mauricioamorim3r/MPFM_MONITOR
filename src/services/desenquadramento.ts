/**
 * Serviço de Gestão de Desenquadramento - MPFM Monitor
 * Conforme Resolução ANP nº 44/2015 - Seção 10
 */

import type {
  DesenquadramentoEvent,
  DesenquadramentoStatus,
  TipoRelatorioANP,
  AmbienteEquipamento,
  DiarioBordoEntry,
  AcaoCAPA,
  ChecklistItemANP,
  CondicoesOperacionais,
  DiagnosticoData,
  ContingenciaData,
} from '@/types'

// Prazos conforme RANP 44/2015
export const PRAZOS_RANP44 = {
  RELATORIO_PARCIAL_DIAS: 10,      // D+10
  RELATORIO_FINAL_TOPSIDE: 30,     // D+30
  RELATORIO_FINAL_SUBSEA: 60,      // D+60 (pode ser 90 ou 120)
  REPARO_TOPSIDE_DIAS: 60,
  REPARO_SUBSEA_DIAS: 120,
  DIAS_TRIGGER_INVESTIGACAO: 10,   // 10 dias consecutivos
} as const

// Checklist padrão ANP para relatórios
const CHECKLIST_PADRAO_ANP: Omit<ChecklistItemANP, 'id' | 'status' | 'campoPreenchido' | 'observacao'>[] = [
  // Relatório Parcial - 10.4.1
  { itemRANP: '10.4.1.a', descricao: 'Identificação do Agente Autorizado', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.b', descricao: 'Bacia, campo e instalação', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.c', descricao: 'Identificação do sistema de medição', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.d', descricao: 'TAG e nome do equipamento', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.e', descricao: 'Responsável técnico', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.f', descricao: 'Condições operacionais (GVF, BSW, P, T, vazões)', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.g', descricao: 'Data de ocorrência da falha', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.h', descricao: 'Data de detecção da falha', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.i', descricao: 'Data de emissão do relatório', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.j', descricao: 'Descrição da falha ou irregularidade', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.k', descricao: 'Investigação realizada até o momento', obrigatorio: true, tipoRelatorio: ['Parcial'] },
  { itemRANP: '10.4.1.l', descricao: 'Plano de contingência acionado', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  { itemRANP: '10.4.1.m', descricao: 'Medidas mitigadoras', obrigatorio: true, tipoRelatorio: ['Parcial', 'Final'] },
  
  // Relatório Final - 10.4.2 (itens adicionais)
  { itemRANP: '10.4.2.j', descricao: 'Investigação completa', obrigatorio: true, tipoRelatorio: ['Final'] },
  { itemRANP: '10.4.2.k', descricao: 'Cronologia e metodologia da investigação', obrigatorio: true, tipoRelatorio: ['Final'] },
  { itemRANP: '10.4.2.l', descricao: 'Causa provável da falha', obrigatorio: true, tipoRelatorio: ['Final'] },
  { itemRANP: '10.4.2.m', descricao: 'Fato determinante do evento', obrigatorio: true, tipoRelatorio: ['Final'] },
  { itemRANP: '10.4.2.n', descricao: 'Plano de contingência acionado e eficácia', obrigatorio: true, tipoRelatorio: ['Final'] },
  { itemRANP: '10.4.2.o', descricao: 'Recomendações de ações corretivas/preventivas', obrigatorio: true, tipoRelatorio: ['Final'] },
  { itemRANP: '10.4.2.p', descricao: 'Cronograma de execução das recomendações', obrigatorio: true, tipoRelatorio: ['Final'] },
  { itemRANP: '10.4.2.q', descricao: 'Prazo previsto para reparo', obrigatorio: true, tipoRelatorio: ['Final'] },
  { itemRANP: '10.4.2.r', descricao: 'Justificativa se prazo > 60/120 dias', obrigatorio: false, tipoRelatorio: ['Final'] },
]

const STORAGE_KEY = 'mpfm_desenquadramento_events'

class DesenquadramentoService {
  private events: DesenquadramentoEvent[] = []

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.events = JSON.parse(stored)
      }
    } catch (error) {
      console.error('[Desenquadramento] Erro ao carregar eventos:', error)
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events))
    } catch (error) {
      console.error('[Desenquadramento] Erro ao salvar eventos:', error)
    }
  }

  private generateId(): string {
    const year = new Date().getFullYear()
    const sequence = this.events.filter(e => 
      e.id.startsWith(`DES-${year}`)
    ).length + 1
    return `DES-${year}-${String(sequence).padStart(4, '0')}`
  }

  private generateEntryId(): string {
    return `ENT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  }

  /**
   * Calcula os prazos com base no ambiente e data de ocorrência
   */
  private calcularPrazos(dataOcorrencia: string, ambiente: AmbienteEquipamento): {
    prazoRelatorioParcial: string
    prazoRelatorioFinal: string
    prazoReparo: string
  } {
    const dataBase = new Date(dataOcorrencia)
    
    const prazoRelatorioParcial = new Date(dataBase)
    prazoRelatorioParcial.setDate(prazoRelatorioParcial.getDate() + PRAZOS_RANP44.RELATORIO_PARCIAL_DIAS)

    const diasFinal = ambiente === 'TOPSIDE' 
      ? PRAZOS_RANP44.RELATORIO_FINAL_TOPSIDE 
      : PRAZOS_RANP44.RELATORIO_FINAL_SUBSEA

    const prazoRelatorioFinal = new Date(dataBase)
    prazoRelatorioFinal.setDate(prazoRelatorioFinal.getDate() + diasFinal)

    const diasReparo = ambiente === 'TOPSIDE'
      ? PRAZOS_RANP44.REPARO_TOPSIDE_DIAS
      : PRAZOS_RANP44.REPARO_SUBSEA_DIAS

    const prazoReparo = new Date(dataBase)
    prazoReparo.setDate(prazoReparo.getDate() + diasReparo)

    return {
      prazoRelatorioParcial: prazoRelatorioParcial.toISOString().split('T')[0],
      prazoRelatorioFinal: prazoRelatorioFinal.toISOString().split('T')[0],
      prazoReparo: prazoReparo.toISOString().split('T')[0],
    }
  }

  /**
   * Gera o checklist padrão ANP para um evento
   */
  private gerarChecklistANP(tipoRelatorio: TipoRelatorioANP): ChecklistItemANP[] {
    return CHECKLIST_PADRAO_ANP
      .filter(item => item.tipoRelatorio.includes(tipoRelatorio))
      .map((item, index) => ({
        ...item,
        id: `CHK-${index + 1}`,
        status: 'Pendente' as const,
      }))
  }

  /**
   * Cria um novo evento de desenquadramento
   */
  criarEvento(params: {
    equipamentoId: string
    equipamentoTag: string
    equipamentoNome: string
    ambiente: AmbienteEquipamento
    dataOcorrencia: string
    dataDeteccao: string
    responsavelTecnico: string
    condicoesOperacionais: CondicoesOperacionais
    diasConsecutivosDesvio: number
    desvioHC: number
    desvioTotal: number
    createdBy: string
  }): DesenquadramentoEvent {
    const prazos = this.calcularPrazos(params.dataOcorrencia, params.ambiente)
    const now = new Date().toISOString()

    const evento: DesenquadramentoEvent = {
      id: this.generateId(),
      status: 'Aberto',
      tipoRelatorio: 'Parcial',
      ambiente: params.ambiente,
      
      equipamentoId: params.equipamentoId,
      equipamentoTag: params.equipamentoTag,
      equipamentoNome: params.equipamentoNome,
      
      dataOcorrencia: params.dataOcorrencia,
      dataDeteccao: params.dataDeteccao,
      dataRelatorio: now.split('T')[0],
      ...prazos,
      
      responsavelTecnico: params.responsavelTecnico,
      
      condicoesOperacionais: params.condicoesOperacionais,
      diarioBordo: [],
      planosAcao: [],
      anexos: [],
      checklistANP: this.gerarChecklistANP('Parcial'),
      
      diasConsecutivosDesvio: params.diasConsecutivosDesvio,
      desvioHC: params.desvioHC,
      desvioTotal: params.desvioTotal,
      
      createdAt: now,
      updatedAt: now,
      createdBy: params.createdBy,
    }

    // Adicionar entrada inicial no diário de bordo
    const entradaInicial: DiarioBordoEntry = {
      id: this.generateEntryId(),
      eventId: evento.id,
      dataHora: now,
      dPlus: 0,
      etapa: 'Abertura do Evento',
      detalhe: `Evento de desenquadramento aberto automaticamente após ${params.diasConsecutivosDesvio} dias consecutivos de desvio. Desvio HC: ${params.desvioHC.toFixed(2)}%, Desvio Total: ${params.desvioTotal.toFixed(2)}%`,
      responsavel: params.createdBy,
      area: 'Medição',
      status: 'Concluído',
      itemRANP: '10.4.1.g',
    }
    evento.diarioBordo.push(entradaInicial)

    this.events.push(evento)
    this.saveToStorage()

    console.log(`[Desenquadramento] Evento criado: ${evento.id}`)
    return evento
  }

  /**
   * Adiciona entrada no diário de bordo
   */
  adicionarEntradaDiario(
    eventId: string,
    entrada: Omit<DiarioBordoEntry, 'id' | 'eventId' | 'dataHora'>
  ): DiarioBordoEntry | null {
    const evento = this.events.find(e => e.id === eventId)
    if (!evento) return null

    const novaEntrada: DiarioBordoEntry = {
      id: this.generateEntryId(),
      eventId,
      dataHora: new Date().toISOString(),
      ...entrada,
    }

    evento.diarioBordo.push(novaEntrada)
    evento.updatedAt = new Date().toISOString()
    this.saveToStorage()

    console.log(`[Desenquadramento] Entrada adicionada ao diário: ${novaEntrada.id}`)
    return novaEntrada
  }

  /**
   * Atualiza o diagnóstico do evento
   */
  atualizarDiagnostico(eventId: string, diagnostico: DiagnosticoData): boolean {
    const evento = this.events.find(e => e.id === eventId)
    if (!evento) return false

    evento.diagnostico = diagnostico
    evento.updatedAt = new Date().toISOString()
    
    // Avançar status se apropriado
    if (evento.status === 'Aberto' || evento.status === 'Em Investigação') {
      evento.status = 'Em Investigação'
    }

    this.saveToStorage()
    return true
  }

  /**
   * Atualiza a contingência do evento
   */
  atualizarContingencia(eventId: string, contingencia: ContingenciaData): boolean {
    const evento = this.events.find(e => e.id === eventId)
    if (!evento) return false

    evento.contingencia = contingencia
    evento.updatedAt = new Date().toISOString()
    this.saveToStorage()
    return true
  }

  /**
   * Adiciona ação CAPA (corretiva/preventiva)
   */
  adicionarAcaoCAPA(
    eventId: string,
    acao: Omit<AcaoCAPA, 'id' | 'eventId'>
  ): AcaoCAPA | null {
    const evento = this.events.find(e => e.id === eventId)
    if (!evento) return null

    const novaAcao: AcaoCAPA = {
      id: `CAPA-${Date.now()}`,
      eventId,
      ...acao,
    }

    evento.planosAcao.push(novaAcao)
    evento.updatedAt = new Date().toISOString()

    // Avançar status para Plano de Ação
    if (evento.status === 'Em Investigação') {
      evento.status = 'Plano de Ação'
    }

    this.saveToStorage()
    return novaAcao
  }

  /**
   * Atualiza status de uma ação CAPA
   */
  atualizarAcaoCAPA(
    eventId: string,
    acaoId: string,
    updates: Partial<AcaoCAPA>
  ): boolean {
    const evento = this.events.find(e => e.id === eventId)
    if (!evento) return false

    const acao = evento.planosAcao.find(a => a.id === acaoId)
    if (!acao) return false

    Object.assign(acao, updates)
    evento.updatedAt = new Date().toISOString()
    this.saveToStorage()
    return true
  }

  /**
   * Atualiza status de item do checklist ANP
   */
  atualizarChecklistItem(
    eventId: string,
    itemId: string,
    status: ChecklistItemANP['status'],
    observacao?: string
  ): boolean {
    const evento = this.events.find(e => e.id === eventId)
    if (!evento) return false

    const item = evento.checklistANP.find(i => i.id === itemId)
    if (!item) return false

    item.status = status
    if (observacao) item.observacao = observacao
    evento.updatedAt = new Date().toISOString()
    this.saveToStorage()
    return true
  }

  /**
   * Verifica se o evento está pronto para envio à ANP
   */
  verificarProntidaoEnvio(eventId: string): {
    pronto: boolean
    itensOK: number
    itensPendentes: number
    itensObrigatoriosPendentes: string[]
  } {
    const evento = this.events.find(e => e.id === eventId)
    if (!evento) {
      return { pronto: false, itensOK: 0, itensPendentes: 0, itensObrigatoriosPendentes: [] }
    }

    const itensOK = evento.checklistANP.filter(i => i.status === 'OK').length
    const itensPendentes = evento.checklistANP.filter(i => i.status === 'Pendente').length
    const itensObrigatoriosPendentes = evento.checklistANP
      .filter(i => i.obrigatorio && i.status === 'Pendente')
      .map(i => i.itemRANP)

    return {
      pronto: itensObrigatoriosPendentes.length === 0,
      itensOK,
      itensPendentes,
      itensObrigatoriosPendentes,
    }
  }

  /**
   * Atualiza o status do evento
   */
  atualizarStatus(eventId: string, novoStatus: DesenquadramentoStatus): boolean {
    const evento = this.events.find(e => e.id === eventId)
    if (!evento) return false

    const statusAnterior = evento.status
    evento.status = novoStatus
    evento.updatedAt = new Date().toISOString()

    // Adicionar entrada no diário de bordo
    this.adicionarEntradaDiario(eventId, {
      dPlus: this.calcularDPlus(evento.dataOcorrencia),
      etapa: 'Alteração de Status',
      detalhe: `Status alterado de "${statusAnterior}" para "${novoStatus}"`,
      responsavel: 'Sistema',
      area: 'Medição',
      status: 'Concluído',
    })

    this.saveToStorage()
    return true
  }

  /**
   * Promove para relatório final
   */
  promoverParaFinal(eventId: string): boolean {
    const evento = this.events.find(e => e.id === eventId)
    if (!evento) return false

    evento.tipoRelatorio = 'Final'
    evento.checklistANP = this.gerarChecklistANP('Final')
    evento.updatedAt = new Date().toISOString()

    this.adicionarEntradaDiario(eventId, {
      dPlus: this.calcularDPlus(evento.dataOcorrencia),
      etapa: 'Promoção para Relatório Final',
      detalhe: 'Evento promovido de Relatório Parcial para Relatório Final',
      responsavel: 'Sistema',
      area: 'Medição',
      status: 'Concluído',
      itemRANP: '10.4.2',
    })

    this.saveToStorage()
    return true
  }

  /**
   * Calcula D+ (dias desde a ocorrência)
   */
  calcularDPlus(dataOcorrencia: string): number {
    const ocorrencia = new Date(dataOcorrencia)
    const hoje = new Date()
    const diffMs = hoje.getTime() - ocorrencia.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  /**
   * Obtém todos os eventos
   */
  getAll(): DesenquadramentoEvent[] {
    return [...this.events]
  }

  /**
   * Obtém evento por ID
   */
  getById(id: string): DesenquadramentoEvent | undefined {
    return this.events.find(e => e.id === id)
  }

  /**
   * Obtém eventos ativos (não concluídos/enviados)
   */
  getAtivos(): DesenquadramentoEvent[] {
    return this.events.filter(e => 
      e.status !== 'Concluído' && e.status !== 'Enviado ANP'
    )
  }

  /**
   * Obtém eventos com prazo próximo de vencer
   */
  getComPrazoProximo(diasAntecedencia: number = 3): DesenquadramentoEvent[] {
    const hoje = new Date()
    
    return this.events.filter(e => {
      if (e.status === 'Concluído' || e.status === 'Enviado ANP') return false

      const prazo = e.tipoRelatorio === 'Parcial' 
        ? new Date(e.prazoRelatorioParcial)
        : new Date(e.prazoRelatorioFinal)

      const diffDias = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      return diffDias <= diasAntecedencia && diffDias >= 0
    })
  }

  /**
   * Obtém eventos vencidos
   */
  getVencidos(): DesenquadramentoEvent[] {
    const hoje = new Date()
    
    return this.events.filter(e => {
      if (e.status === 'Concluído' || e.status === 'Enviado ANP') return false

      const prazo = e.tipoRelatorio === 'Parcial'
        ? new Date(e.prazoRelatorioParcial)
        : new Date(e.prazoRelatorioFinal)

      return prazo < hoje
    })
  }

  /**
   * Obtém estatísticas
   */
  getEstatisticas(): {
    total: number
    abertos: number
    emInvestigacao: number
    planoAcao: number
    concluidos: number
    vencidos: number
    proximos3Dias: number
  } {
    const vencidos = this.getVencidos().length
    const proximos = this.getComPrazoProximo(3).length

    return {
      total: this.events.length,
      abertos: this.events.filter(e => e.status === 'Aberto').length,
      emInvestigacao: this.events.filter(e => e.status === 'Em Investigação').length,
      planoAcao: this.events.filter(e => e.status === 'Plano de Ação').length,
      concluidos: this.events.filter(e => e.status === 'Concluído' || e.status === 'Enviado ANP').length,
      vencidos,
      proximos3Dias: proximos,
    }
  }

  /**
   * Limpa dados (desenvolvimento)
   */
  clearAll(): void {
    if (import.meta.env.PROD) return
    this.events = []
    this.saveToStorage()
  }
}

// Singleton
export const desenquadramentoService = new DesenquadramentoService()

export default desenquadramentoService
