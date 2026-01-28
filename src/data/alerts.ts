import type { Alert, ComplianceItem } from '@/types'

export const alertsData: Alert[] = [
  {
    id: 'alert-1',
    type: 'error',
    severity: 'critical',
    message: 'Balanço HC > 10% detectado em 20/01',
    meterId: 'meter-1',
    meterTag: '13FT0367',
    timestamp: '2026-01-23T12:00:00Z',
    read: false,
    actionRequired: 'Investigar causa do desvio',
  },
  {
    id: 'alert-2',
    type: 'warning',
    severity: 'warning',
    message: 'K-Factor de gás fora do range normal',
    meterId: 'meter-3',
    meterTag: '18FT1506',
    timestamp: '2026-01-23T09:00:00Z',
    read: false,
    actionRequired: 'Verificar calibração',
  },
  {
    id: 'alert-3',
    type: 'info',
    severity: 'info',
    message: 'Calibração CAL-MPFM_SUB-COM-01-26 em andamento',
    meterId: 'meter-3',
    meterTag: '18FT1506',
    timestamp: '2026-01-22T08:00:00Z',
    read: true,
  },
  {
    id: 'alert-4',
    type: 'success',
    severity: 'info',
    message: 'Calibração CAL-MPFM_TOP-PER-07-25 concluída',
    meterId: 'meter-1',
    meterTag: '13FT0367',
    timestamp: '2026-01-20T16:00:00Z',
    read: true,
  },
]

export const complianceData: ComplianceItem[] = [
  {
    id: 'comp-1',
    item: '4.5',
    description: 'Monitoramento de variáveis críticas',
    status: 'OK',
    evidence: 'Planilha diária atualizada',
    lastCheck: '2026-01-23',
  },
  {
    id: 'comp-2',
    item: '7.3',
    description: 'RAD a cada 180 dias',
    status: 'OK',
    evidence: 'Último RAD em 15/10/2025',
    lastCheck: '2026-01-23',
  },
  {
    id: 'comp-3',
    item: '8.6.3',
    description: 'Totalização mínima 24h',
    status: 'OK',
    evidence: 'Duração registrada: 24.0h',
    lastCheck: '2026-01-23',
  },
  {
    id: 'comp-4',
    item: '10.3',
    description: 'Relatório final em 30 dias',
    status: 'WARNING',
    evidence: 'Prazo: 16/02/2026 (21 dias)',
    lastCheck: '2026-01-23',
  },
  {
    id: 'comp-5',
    item: '10.4',
    description: 'Parciais a cada 10 dias',
    status: 'OK',
    evidence: 'Última parcial: 20/01/2026',
    lastCheck: '2026-01-23',
  },
  {
    id: 'comp-6',
    item: '10.5',
    description: 'Plano de contingência',
    status: 'OK',
    evidence: 'PC-MPFM-001 aprovado',
    lastCheck: '2026-01-23',
  },
]

// Helper function to get time ago string
export function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  return `${diffDays}d atrás`
}
