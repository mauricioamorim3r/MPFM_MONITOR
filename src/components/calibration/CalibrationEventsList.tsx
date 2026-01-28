import { useState } from 'react'
import { Plus, Play, Clock, CheckCircle, ChevronRight, Trash2 } from 'lucide-react'
import { Button, Card, Badge, Tabs, ProgressBar } from '@/components/ui'
import { useAppStore } from '@/store'
import type { CalibrationEvent } from '@/types'

interface CalibrationEventsListProps {
  onSelectEvent: (event: CalibrationEvent) => void
}

export function CalibrationEventsList({ onSelectEvent }: CalibrationEventsListProps) {
  const { calibrationEvents, setShowNewEventModal, deleteCalibrationEvent } = useAppStore()
  const [activeTab, setActiveTab] = useState('all')

  const filteredEvents = calibrationEvents.filter((event) => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return event.status === 'Em Andamento'
    if (activeTab === 'pending') return event.status === 'Pendente'
    if (activeTab === 'completed') return event.status === 'Concluída'
    return true
  })

  const handleDelete = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation()
    if (confirm('Tem certeza que deseja remover este evento de calibração?')) {
      deleteCalibrationEvent(eventId)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Concluída':
        return CheckCircle
      case 'Em Andamento':
        return Play
      default:
        return Clock
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Concluída':
        return 'bg-emerald-500/20'
      case 'Em Andamento':
        return 'bg-blue-500/20'
      default:
        return 'bg-zinc-700'
    }
  }

  const getIconColor = (status: string) => {
    switch (status) {
      case 'Concluída':
        return 'text-emerald-400'
      case 'Em Andamento':
        return 'text-blue-400'
      default:
        return 'text-zinc-400'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Eventos de Calibração</h2>
          <p className="text-xs text-zinc-500">
            Avaliações de desempenho MPFM - Comissionamento, Periódica, Investigação
          </p>
        </div>
        <Button onClick={() => setShowNewEventModal(true)} icon={Plus}>
          Nova Avaliação
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'all', label: 'Todos', count: calibrationEvents.length },
          {
            id: 'active',
            label: 'Em Andamento',
            count: calibrationEvents.filter((e) => e.status === 'Em Andamento').length,
          },
          {
            id: 'pending',
            label: 'Pendentes',
            count: calibrationEvents.filter((e) => e.status === 'Pendente').length,
          },
          {
            id: 'completed',
            label: 'Concluídas',
            count: calibrationEvents.filter((e) => e.status === 'Concluída').length,
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {filteredEvents.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-zinc-500 mb-4">
            {activeTab === 'all'
              ? 'Nenhum evento de calibração cadastrado.'
              : `Nenhum evento com status "${activeTab === 'active' ? 'Em Andamento' : activeTab === 'pending' ? 'Pendente' : 'Concluída'}".`}
          </p>
          {activeTab === 'all' && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowNewEventModal(true)}
            >
              Criar Primeira Avaliação
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredEvents.map((event) => {
            const StatusIcon = getStatusIcon(event.status)
            return (
              <Card
                key={event.id}
                className="hover:ring-1 hover:ring-blue-500/50 cursor-pointer transition"
                noPadding
              >
                <div className="p-4" onClick={() => onSelectEvent(event)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusStyle(
                          event.status
                        )}`}
                      >
                        <StatusIcon className={`w-6 h-6 ${getIconColor(event.status)}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            {event.id}
                          </span>
                          <Badge
                            variant={
                              event.status === 'Concluída'
                                ? 'success'
                                : event.status === 'Em Andamento'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {event.status}
                          </Badge>
                          <Badge variant="purple">{event.type}</Badge>
                          {event.result && (
                            <Badge variant={event.result === 'Aprovado' ? 'success' : 'error'}>
                              {event.result}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          <span className="text-blue-400">{event.meterTag}</span> -{' '}
                          {event.meterName} | Início: {event.startDate} | Resp:{' '}
                          {event.responsible}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 max-w-xs">
                            <ProgressBar
                              value={event.progress}
                              color={event.status === 'Concluída' ? 'emerald' : 'blue'}
                              showLabel={false}
                              size="sm"
                            />
                          </div>
                          <span className="text-xs text-zinc-400">
                            Etapa {event.currentStep}/7
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(e, event.id)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Remover evento"
                      >
                        <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-zinc-500" />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
