import { CheckCircle2, FileCheck, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { Card, Badge, SectionHeader, ProgressBar } from '@/components/ui'
import { cn } from '@/utils'

interface ChecklistItem {
  id: string
  category: string
  description: string
  status: 'compliant' | 'pending' | 'overdue' | 'in-progress'
  dueDate?: string
  notes?: string
}

const checklistData: ChecklistItem[] = [
  {
    id: '1',
    category: 'RTMV',
    description: 'Avaliação de desempenho no comissionamento',
    status: 'compliant',
    dueDate: '2025-12-01',
    notes: 'Concluído - CAL-2025-001',
  },
  {
    id: '2',
    category: 'RTMV',
    description: 'Avaliação periódica (intervalos 6-12 meses)',
    status: 'in-progress',
    dueDate: '2026-06-01',
    notes: 'Próxima avaliação agendada',
  },
  {
    id: '3',
    category: 'RTMV',
    description: 'Investigação por gatilho ANP (±10% HC ou ±7% total)',
    status: 'pending',
    notes: 'Aplicável quando limite excedido',
  },
  {
    id: '4',
    category: 'RTMV',
    description: 'Arquivo PVT atualizado e aprovado',
    status: 'compliant',
    dueDate: '2026-01-10',
    notes: 'PVTsim v23.1.0',
  },
  {
    id: '5',
    category: 'RTMV',
    description: 'Software do medidor atualizado',
    status: 'compliant',
    notes: 'FW-MPM-BAC-v1.12.3',
  },
  {
    id: '6',
    category: 'RTMV',
    description: 'Relatório de calibração arquivado',
    status: 'compliant',
    notes: '3 relatórios gerados',
  },
  {
    id: '7',
    category: 'RTMV',
    description: 'K-factors dentro do range (0.8-1.2)',
    status: 'overdue',
    notes: 'K-Gas fora do limite - investigar',
  },
  {
    id: '8',
    category: 'RTMV',
    description: 'Monitoramento de balanço diário implementado',
    status: 'compliant',
    notes: 'Dashboard operacional',
  },
  {
    id: '9',
    category: 'Manutenção',
    description: 'Verificação de integridade mecânica',
    status: 'pending',
    dueDate: '2026-03-15',
  },
  {
    id: '10',
    category: 'Manutenção',
    description: 'Calibração de sensores P/T',
    status: 'in-progress',
    dueDate: '2026-02-01',
  },
]

const categoryStats = [
  {
    name: 'RTMV',
    total: 8,
    compliant: 5,
    pending: 1,
    overdue: 1,
    inProgress: 1,
  },
  {
    name: 'Manutenção',
    total: 2,
    compliant: 0,
    pending: 1,
    overdue: 0,
    inProgress: 1,
  },
]

export function ComplianceDashboard() {
  const totalItems = checklistData.length
  const compliantItems = checklistData.filter((c) => c.status === 'compliant').length
  const pendingItems = checklistData.filter((c) => c.status === 'pending').length
  const overdueItems = checklistData.filter((c) => c.status === 'overdue').length

  const getStatusBadge = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'compliant':
        return <Badge variant="success">Conforme</Badge>
      case 'pending':
        return <Badge variant="warning">Pendente</Badge>
      case 'overdue':
        return <Badge variant="error">Atrasado</Badge>
      case 'in-progress':
        return <Badge variant="info">Em Andamento</Badge>
    }
  }

  const getStatusIcon = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-400" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-400" />
    }
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total Requisitos</p>
              <p className="text-2xl font-bold text-white">{totalItems}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Conformes</p>
              <p className="text-2xl font-bold text-emerald-400">{compliantItems}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Pendentes</p>
              <p className="text-2xl font-bold text-amber-400">{pendingItems}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Atrasados</p>
              <p className="text-2xl font-bold text-red-400">{overdueItems}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress por Categoria */}
      <Card className="p-4">
        <SectionHeader
          icon={FileCheck}
          title="Conformidade por Categoria"
          color="blue"
        />
        <div className="space-y-4">
          {categoryStats.map((cat) => (
            <div key={cat.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{cat.name}</span>
                <span className="text-xs text-zinc-500">
                  {cat.compliant}/{cat.total} conformes
                </span>
              </div>
              <ProgressBar
                value={(cat.compliant / cat.total) * 100}
                color={cat.overdue > 0 ? 'red' : cat.compliant === cat.total ? 'emerald' : 'amber'}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Checklist */}
      <Card className="p-4">
        <SectionHeader
          icon={CheckCircle2}
          title="Checklist de Requisitos Regulatórios (RTMV)"
          color="emerald"
        />
        <div className="space-y-2">
          {checklistData.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition cursor-pointer hover:bg-zinc-700/50',
                item.status === 'overdue'
                  ? 'bg-red-500/5 border-red-500/20'
                  : item.status === 'compliant'
                  ? 'bg-emerald-500/5 border-emerald-500/10'
                  : 'bg-zinc-800/50 border-zinc-700'
              )}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-zinc-200">{item.description}</span>
                    <Badge variant="secondary" size="sm">
                      {item.category}
                    </Badge>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-zinc-500 mt-0.5">{item.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.dueDate && (
                  <span className="text-xs text-zinc-500">{item.dueDate}</span>
                )}
                {getStatusBadge(item.status)}
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
