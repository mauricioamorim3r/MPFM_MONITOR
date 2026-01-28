/**
 * Página de Gestão de Desenquadramento - MPFM Monitor
 * Conforme Resolução ANP nº 44/2015 - Seção 10
 */

import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  ChevronRight,
  Calendar,
  User,
  Activity,
  ClipboardList,
  Send,
} from 'lucide-react'
import { Button, Badge, Card, Input, Select, Modal, Tabs, KPICard } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui/Badge'
import { desenquadramentoService } from '@/services/desenquadramento'
import type { DesenquadramentoEvent, DesenquadramentoStatus } from '@/types'
import { cn } from '@/utils'

export function Desenquadramento() {
  const [events, setEvents] = useState<DesenquadramentoEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<DesenquadramentoEvent | null>(null)
  const [showNewEventModal, setShowNewEventModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<DesenquadramentoStatus | 'all'>('all')
  const [activeTab, setActiveTab] = useState('lista')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = () => {
    setEvents(desenquadramentoService.getAll())
  }

  const stats = useMemo(() => desenquadramentoService.getEstatisticas(), [events])
  const eventosVencidos = useMemo(() => desenquadramentoService.getVencidos(), [events])
  const eventosProximos = useMemo(() => desenquadramentoService.getComPrazoProximo(3), [events])

  const filteredEvents = useMemo(() => {
    if (filterStatus === 'all') return events
    return events.filter(e => e.status === filterStatus)
  }, [events, filterStatus])

  const getStatusConfig = (status: DesenquadramentoStatus) => {
    const configs: Record<DesenquadramentoStatus, { color: string; icon: typeof AlertTriangle; bgColor: string }> = {
      'Aberto': { color: 'text-red-500', icon: XCircle, bgColor: 'bg-red-50' },
      'Em Investigação': { color: 'text-yellow-500', icon: Activity, bgColor: 'bg-yellow-50' },
      'Plano de Ação': { color: 'text-blue-500', icon: ClipboardList, bgColor: 'bg-blue-50' },
      'Aguardando Validação': { color: 'text-purple-500', icon: Clock, bgColor: 'bg-purple-50' },
      'Concluído': { color: 'text-green-500', icon: CheckCircle, bgColor: 'bg-green-50' },
      'Enviado ANP': { color: 'text-emerald-500', icon: Send, bgColor: 'bg-emerald-50' },
    }
    return configs[status]
  }

  const calcularDiasRestantes = (prazo: string) => {
    const hoje = new Date()
    const dataPrazo = new Date(prazo)
    return Math.ceil((dataPrazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-orange-500" />
            Gestão de Desenquadramento
          </h1>
          <p className="text-zinc-400 mt-1">
            Conforme Resolução ANP nº 44/2015 - Seção 10
          </p>
        </div>
        <Button onClick={() => setShowNewEventModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {/* Alertas de Prazo */}
      {(eventosVencidos.length > 0 || eventosProximos.length > 0) && (
        <div className="space-y-2">
          {eventosVencidos.length > 0 && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium">
                  {eventosVencidos.length} evento(s) com prazo vencido!
                </p>
                <p className="text-red-300/80 text-sm">
                  {eventosVencidos.map(e => e.id).join(', ')}
                </p>
              </div>
            </div>
          )}
          {eventosProximos.length > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 font-medium">
                  {eventosProximos.length} evento(s) com prazo nos próximos 3 dias
                </p>
                <p className="text-yellow-300/80 text-sm">
                  {eventosProximos.map(e => `${e.id} (${calcularDiasRestantes(
                    e.tipoRelatorio === 'Parcial' ? e.prazoRelatorioParcial : e.prazoRelatorioFinal
                  )}d)`).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Eventos"
          value={stats.total}
          icon={FileText}
          color="blue"
        />
        <KPICard
          title="Abertos"
          value={stats.abertos}
          icon={XCircle}
          color={stats.abertos > 0 ? 'red' : 'blue'}
        />
        <KPICard
          title="Em Investigação"
          value={stats.emInvestigacao}
          icon={Activity}
          color={stats.emInvestigacao > 0 ? 'amber' : 'blue'}
        />
        <KPICard
          title="Plano de Ação"
          value={stats.planoAcao}
          icon={ClipboardList}
          color="purple"
        />
        <KPICard
          title="Concluídos"
          value={stats.concluidos}
          icon={CheckCircle}
          color="emerald"
        />
        <KPICard
          title="Vencidos"
          value={stats.vencidos}
          icon={Clock}
          color={stats.vencidos > 0 ? 'red' : 'blue'}
        />
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'lista', label: 'Lista de Eventos', icon: FileText },
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'relatorios', label: 'Relatórios ANP', icon: Send },
        ]}
      />

      {/* Filtros */}
      {activeTab === 'lista' && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <label htmlFor="status-filter" className="sr-only">Filtrar por status</label>
            <Select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as DesenquadramentoStatus | 'all')}
              options={[
                { value: 'all', label: 'Todos os Status' },
                { value: 'Aberto', label: 'Aberto' },
                { value: 'Em Investigação', label: 'Em Investigação' },
                { value: 'Plano de Ação', label: 'Plano de Ação' },
                { value: 'Aguardando Validação', label: 'Aguardando Validação' },
                { value: 'Concluído', label: 'Concluído' },
                { value: 'Enviado ANP', label: 'Enviado ANP' },
              ]}
            />
          </div>
          <span className="text-zinc-500 text-sm">
            {filteredEvents.length} evento(s)
          </span>
        </div>
      )}

      {/* Lista de Eventos */}
      {activeTab === 'lista' && (
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg">Nenhum evento de desenquadramento registrado</p>
              <p className="text-zinc-500 text-sm mt-2">
                Eventos são criados automaticamente quando K-Factors ficam fora do limite por 10 dias consecutivos
              </p>
            </Card>
          ) : (
            filteredEvents.map((evento) => {
              const statusConfig = getStatusConfig(evento.status)
              const StatusIcon = statusConfig.icon
              const diasRestantes = calcularDiasRestantes(
                evento.tipoRelatorio === 'Parcial' 
                  ? evento.prazoRelatorioParcial 
                  : evento.prazoRelatorioFinal
              )
              const isVencido = diasRestantes < 0
              const dPlus = desenquadramentoService.calcularDPlus(evento.dataOcorrencia)

              return (
                <div
                  key={evento.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedEvent(evento)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedEvent(evento)}
                >
                  <Card
                    className={cn(
                      'p-4 hover:border-blue-500/50 transition-colors',
                      isVencido && 'border-red-500/50'
                    )}
                  >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn('p-3 rounded-lg', statusConfig.bgColor)}>
                        <StatusIcon className={cn('w-6 h-6', statusConfig.color)} />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{evento.id}</h3>
                          <Badge variant={evento.tipoRelatorio === 'Parcial' ? 'warning' : 'info'}>
                            Relatório {evento.tipoRelatorio}
                          </Badge>
                          <Badge variant={evento.ambiente === 'TOPSIDE' ? 'TOPSIDE' : 'SUBSEA'}>
                            {evento.ambiente}
                          </Badge>
                        </div>

                        <p className="text-zinc-400 mt-1">
                          {evento.equipamentoTag} - {evento.equipamentoNome}
                        </p>

                        <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Ocorrência: {formatDate(evento.dataOcorrencia)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            D+{dPlus}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {evento.responsavelTecnico}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                          <span className={cn(
                            'text-sm font-medium',
                            isVencido ? 'text-red-400' : diasRestantes <= 3 ? 'text-yellow-400' : 'text-zinc-400'
                          )}>
                            {isVencido 
                              ? `Vencido há ${Math.abs(diasRestantes)} dia(s)`
                              : `${diasRestantes} dia(s) restante(s)`
                            }
                          </span>
                          <span className="text-sm text-zinc-500">
                            Desvio HC: {evento.desvioHC.toFixed(1)}%
                          </span>
                          <span className="text-sm text-zinc-500">
                            {evento.diarioBordo.length} entrada(s) no diário
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={evento.status as BadgeVariant}>
                        {evento.status}
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-zinc-500" />
                    </div>
                  </div>
                </Card>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Timeline (placeholder) */}
      {activeTab === 'timeline' && (
        <Card className="p-8 text-center">
          <Clock className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">Timeline de Eventos</p>
          <p className="text-zinc-500 text-sm mt-2">
            Visualização cronológica dos eventos e marcos D+10, D+30
          </p>
        </Card>
      )}

      {/* Relatórios ANP (placeholder) */}
      {activeTab === 'relatorios' && (
        <Card className="p-8 text-center">
          <Send className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">Relatórios para ANP</p>
          <p className="text-zinc-500 text-sm mt-2">
            Geração e controle de relatórios parciais e finais
          </p>
        </Card>
      )}

      {/* Modal de Detalhes do Evento */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={loadEvents}
        />
      )}

      {/* Modal de Novo Evento */}
      {showNewEventModal && (
        <NewEventModal
          onClose={() => setShowNewEventModal(false)}
          onCreate={(evento) => {
            loadEvents()
            setSelectedEvent(evento)
            setShowNewEventModal(false)
          }}
        />
      )}
    </div>
  )
}

// Modal de Detalhes do Evento
function EventDetailModal({
  event,
  onClose,
  onUpdate,
}: {
  event: DesenquadramentoEvent
  onClose: () => void
  onUpdate: () => void
}) {
  const [activeTab, setActiveTab] = useState('geral')
  const prontidao = desenquadramentoService.verificarProntidaoEnvio(event.id)
  const dPlus = desenquadramentoService.calcularDPlus(event.dataOcorrencia)

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Evento ${event.id}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header do Evento */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <Badge variant={event.status as BadgeVariant}>{event.status}</Badge>
            <Badge variant={event.tipoRelatorio === 'Parcial' ? 'warning' : 'info'}>
              Relatório {event.tipoRelatorio}
            </Badge>
            <Badge variant={event.ambiente === 'TOPSIDE' ? 'TOPSIDE' : 'SUBSEA'}>
              {event.ambiente}
            </Badge>
            <span className="text-zinc-400">D+{dPlus}</span>
          </div>
          <div className="flex items-center gap-2">
            {prontidao.pronto ? (
              <Badge variant="success">Pronto para Envio</Badge>
            ) : (
              <Badge variant="warning">{prontidao.itensPendentes} itens pendentes</Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'geral', label: 'Informações Gerais' },
            { id: 'diario', label: `Diário de Bordo (${event.diarioBordo.length})` },
            { id: 'diagnostico', label: 'Diagnóstico' },
            { id: 'acoes', label: `Ações CAPA (${event.planosAcao.length})` },
            { id: 'checklist', label: 'Checklist ANP' },
          ]}
        />

        {/* Conteúdo das Tabs */}
        {activeTab === 'geral' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-white">Identificação</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-zinc-500">Equipamento:</span>
                <span className="text-white">{event.equipamentoTag}</span>
                <span className="text-zinc-500">Nome:</span>
                <span className="text-white">{event.equipamentoNome}</span>
                <span className="text-zinc-500">Responsável:</span>
                <span className="text-white">{event.responsavelTecnico}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-white">Datas</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-zinc-500">Ocorrência:</span>
                <span className="text-white">{new Date(event.dataOcorrencia).toLocaleDateString('pt-BR')}</span>
                <span className="text-zinc-500">Detecção:</span>
                <span className="text-white">{new Date(event.dataDeteccao).toLocaleDateString('pt-BR')}</span>
                <span className="text-zinc-500">Prazo Parcial:</span>
                <span className="text-white">{new Date(event.prazoRelatorioParcial).toLocaleDateString('pt-BR')}</span>
                <span className="text-zinc-500">Prazo Final:</span>
                <span className="text-white">{new Date(event.prazoRelatorioFinal).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            <div className="col-span-2 space-y-4">
              <h4 className="font-medium text-white">Condições Operacionais</h4>
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-zinc-800 p-3 rounded-lg text-center">
                  <p className="text-zinc-500 text-xs">GVF</p>
                  <p className="text-white font-mono">{event.condicoesOperacionais.gvf}%</p>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg text-center">
                  <p className="text-zinc-500 text-xs">BSW</p>
                  <p className="text-white font-mono">{event.condicoesOperacionais.bsw}%</p>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg text-center">
                  <p className="text-zinc-500 text-xs">Pressão</p>
                  <p className="text-white font-mono">{event.condicoesOperacionais.pressao} bar</p>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg text-center">
                  <p className="text-zinc-500 text-xs">Temperatura</p>
                  <p className="text-white font-mono">{event.condicoesOperacionais.temperatura}°C</p>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg text-center">
                  <p className="text-zinc-500 text-xs">Desvio HC</p>
                  <p className="text-white font-mono">{event.desvioHC.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diario' && (
          <div className="space-y-4">
            {event.diarioBordo.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">Nenhuma entrada no diário de bordo</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {event.diarioBordo.map((entrada, index) => (
                  <div key={entrada.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                        D+{entrada.dPlus}
                      </div>
                      {index < event.diarioBordo.length - 1 && (
                        <div className="w-0.5 h-full bg-zinc-700 my-1" />
                      )}
                    </div>
                    <div className="flex-1 bg-zinc-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{entrada.etapa}</span>
                        <Badge variant={entrada.status === 'Concluído' ? 'success' : 'warning'} size="sm">
                          {entrada.status}
                        </Badge>
                      </div>
                      <p className="text-zinc-400 text-sm mt-1">{entrada.detalhe}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        <span>{new Date(entrada.dataHora).toLocaleString('pt-BR')}</span>
                        <span>{entrada.responsavel}</span>
                        {entrada.itemRANP && <span>Ref: {entrada.itemRANP}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Entrada
            </Button>
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {event.checklistANP.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  item.status === 'OK' ? 'bg-green-500/10' :
                  item.status === 'Pendente' ? 'bg-zinc-800' : 'bg-zinc-700'
                )}
              >
                <div className="flex items-center gap-3">
                  {item.status === 'OK' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : item.status === 'N/A' ? (
                    <div className="w-5 h-5 rounded-full bg-zinc-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-500" />
                  )}
                  <div>
                    <span className="text-zinc-400 text-sm font-mono mr-2">{item.itemRANP}</span>
                    <span className="text-white text-sm">{item.descricao}</span>
                    {item.obrigatorio && (
                      <span className="text-red-400 text-xs ml-2">*</span>
                    )}
                  </div>
                </div>
                <Badge variant={item.status === 'OK' ? 'success' : item.status === 'N/A' ? 'secondary' : 'warning'} size="sm">
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'diagnostico' && (
          <div className="space-y-4">
            {event.diagnostico ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-white mb-2">Descrição da Falha</h4>
                  <p className="text-zinc-400">{event.diagnostico.descricaoFalha}</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">Causa Provável</h4>
                  <p className="text-zinc-400">{event.diagnostico.causaProvavel}</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">Metodologia</h4>
                  <Badge>{event.diagnostico.metodologiaAnalise}</Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500">Diagnóstico ainda não preenchido</p>
                <Button variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Iniciar Diagnóstico
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'acoes' && (
          <div className="space-y-4">
            {event.planosAcao.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500">Nenhuma ação CAPA registrada</p>
                <Button variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Ação
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {event.planosAcao.map((acao) => (
                  <div key={acao.id} className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{acao.acao}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={acao.tipo === 'Corretiva' ? 'error' : 'info'} size="sm">
                          {acao.tipo}
                        </Badge>
                        <Badge variant={acao.status === 'Concluído' ? 'success' : 'warning'} size="sm">
                          {acao.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-zinc-400 text-sm mt-2">{acao.descricao}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                      <span>Responsável: {acao.responsavel}</span>
                      <span>Prazo: {new Date(acao.prazo).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {event.tipoRelatorio === 'Parcial' && event.status !== 'Enviado ANP' && (
            <Button
              variant="outline"
              onClick={() => {
                desenquadramentoService.promoverParaFinal(event.id)
                onUpdate()
              }}
            >
              Promover para Final
            </Button>
          )}
          {prontidao.pronto && (
            <Button>
              <Send className="w-4 h-4 mr-2" />
              Gerar Relatório ANP
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// Modal de Novo Evento
function NewEventModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (evento: DesenquadramentoEvent) => void
}) {
  const [formData, setFormData] = useState({
    equipamentoId: '',
    equipamentoTag: '',
    equipamentoNome: '',
    ambiente: 'TOPSIDE' as 'TOPSIDE' | 'SUBSEA',
    dataOcorrencia: new Date().toISOString().split('T')[0],
    dataDeteccao: new Date().toISOString().split('T')[0],
    responsavelTecnico: '',
    diasConsecutivosDesvio: 10,
    desvioHC: 0,
    desvioTotal: 0,
    gvf: 0,
    bsw: 0,
    pressao: 0,
    temperatura: 0,
    vazaoOleo: 0,
    vazaoGas: 0,
    vazaoAgua: 0,
    vazaoTotal: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const evento = desenquadramentoService.criarEvento({
      equipamentoId: formData.equipamentoId,
      equipamentoTag: formData.equipamentoTag,
      equipamentoNome: formData.equipamentoNome,
      ambiente: formData.ambiente,
      dataOcorrencia: formData.dataOcorrencia,
      dataDeteccao: formData.dataDeteccao,
      responsavelTecnico: formData.responsavelTecnico,
      diasConsecutivosDesvio: formData.diasConsecutivosDesvio,
      desvioHC: formData.desvioHC,
      desvioTotal: formData.desvioTotal,
      createdBy: 'Usuário',
      condicoesOperacionais: {
        gvf: formData.gvf,
        bsw: formData.bsw,
        pressao: formData.pressao,
        temperatura: formData.temperatura,
        vazaoOleo: formData.vazaoOleo,
        vazaoGas: formData.vazaoGas,
        vazaoAgua: formData.vazaoAgua,
        vazaoTotal: formData.vazaoTotal,
        salinidade: 0,
      },
    })

    onCreate(evento)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Novo Evento de Desenquadramento" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="TAG do Equipamento"
            value={formData.equipamentoTag}
            onChange={(e) => setFormData(prev => ({ ...prev, equipamentoTag: e.target.value }))}
            placeholder="Ex: 2601.18FT1506"
            required
          />
          <Input
            label="Nome do Equipamento"
            value={formData.equipamentoNome}
            onChange={(e) => setFormData(prev => ({ ...prev, equipamentoNome: e.target.value }))}
            placeholder="Ex: MPFM Bank 05"
            required
          />
          <Select
            label="Ambiente"
            value={formData.ambiente}
            onChange={(e) => setFormData(prev => ({ ...prev, ambiente: e.target.value as 'TOPSIDE' | 'SUBSEA' }))}
            options={[
              { value: 'TOPSIDE', label: 'Topside' },
              { value: 'SUBSEA', label: 'Subsea' },
            ]}
          />
          <Input
            label="Responsável Técnico"
            value={formData.responsavelTecnico}
            onChange={(e) => setFormData(prev => ({ ...prev, responsavelTecnico: e.target.value }))}
            required
          />
          <Input
            label="Data de Ocorrência"
            type="date"
            value={formData.dataOcorrencia}
            onChange={(e) => setFormData(prev => ({ ...prev, dataOcorrencia: e.target.value }))}
            required
          />
          <Input
            label="Data de Detecção"
            type="date"
            value={formData.dataDeteccao}
            onChange={(e) => setFormData(prev => ({ ...prev, dataDeteccao: e.target.value }))}
            required
          />
          <Input
            label="Dias Consecutivos de Desvio"
            type="number"
            value={formData.diasConsecutivosDesvio}
            onChange={(e) => setFormData(prev => ({ ...prev, diasConsecutivosDesvio: Number(e.target.value) }))}
            min={10}
            required
          />
          <Input
            label="Desvio HC (%)"
            type="number"
            step="0.01"
            value={formData.desvioHC}
            onChange={(e) => setFormData(prev => ({ ...prev, desvioHC: Number(e.target.value) }))}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Plus className="w-4 h-4 mr-2" />
            Criar Evento
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default Desenquadramento
