import { Target, Activity, Calendar, Gauge, Bell, Plus, Database } from 'lucide-react'
import { KPICard, Card, Badge, Button } from '@/components/ui'
import { BalanceChart, ProductionChart } from '@/components/charts'
import { CalendarView } from '@/components/calendar'
import { useAppStore } from '@/store'
import { AlertsList } from './AlertsList'
import { DailyTable } from './DailyTable'
import { MetersList } from './MetersList'

export function MonitoringDashboard() {
  const { 
    monitoringData, 
    meters, 
    getUnreadAlertsCount, 
    getActiveMetersCount,
    setShowMeterModal,
    setShowImportModal,
  } = useAppStore()

  const hasData = monitoringData.length > 0
  const hasMeters = meters.length > 0

  const latestData = hasData ? monitoringData[monitoringData.length - 1] : null
  const maxConsecDays = hasData
    ? Math.max(...monitoringData.map((d) => Math.max(d.subVsTS || 0, d.topVsTS || 0, d.topVsSub || 0)))
    : 0
  const alertCount = getUnreadAlertsCount()
  const activeMeters = getActiveMetersCount()

  // Empty state
  if (!hasData && !hasMeters) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="text-center">
          <Database className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Bem-vindo ao MPFM Monitor</h2>
          <p className="text-zinc-400 max-w-md">
            Comece adicionando medidores MPFM e importando dados de monitoramento para visualizar os balanços de massa.
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowMeterModal(true)}
          >
            Adicionar Medidor
          </Button>
          <Button
            variant="secondary"
            icon={Database}
            onClick={() => setShowImportModal(true)}
          >
            Importar Dados
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard
          title="Balanço HC Atual"
          value={latestData ? latestData.hcBalTS?.toFixed(2) || '0.00' : '--'}
          unit="%"
          subtitle={
            latestData && Math.abs(latestData.hcBalTS || 0) > 10
              ? 'FORA DO LIMITE'
              : 'Dentro do limite'
          }
          icon={Target}
          color={latestData && Math.abs(latestData.hcBalTS || 0) > 10 ? 'red' : 'emerald'}
        />
        <KPICard
          title="Balanço Total"
          value={latestData ? latestData.totalBalTS?.toFixed(2) || '0.00' : '--'}
          unit="%"
          subtitle="Limite: ±7%"
          icon={Activity}
          color={latestData && Math.abs(latestData.totalBalTS || 0) > 7 ? 'red' : 'emerald'}
        />
        <KPICard
          title="Dias Consecutivos"
          value={maxConsecDays}
          unit="/10"
          subtitle="Gatilho calibração"
          icon={Calendar}
          color={
            maxConsecDays >= 10 ? 'red' : maxConsecDays >= 7 ? 'amber' : 'emerald'
          }
        />
        <KPICard
          title="Medidores Ativos"
          value={activeMeters}
          unit={`/${meters.length}`}
          icon={Gauge}
          color="purple"
        />
        <KPICard
          title="Alertas Pendentes"
          value={alertCount}
          icon={Bell}
          color={alertCount > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Charts */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card
            title="Histórico de Balanço de Massa"
            subtitle="Últimos 7 dias - Limites ANP: HC ±10%, Total ±7%"
          >
            <BalanceChart data={monitoringData} />
          </Card>

          <Card title="Produção HC por Sistema" subtitle="Últimos 7 dias (t)">
            <ProductionChart data={monitoringData} />
          </Card>
        </div>
      )}

      {/* Table and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          title="Monitoramento Diário"
          subtitle={hasData ? 'Últimos registros' : 'Nenhum dado importado'}
          className="lg:col-span-2"
          noPadding
        >
          {hasData ? (
            <DailyTable data={monitoringData} />
          ) : (
            <div className="p-8 text-center text-zinc-500">
              <p>Importe dados de monitoramento para visualizar a tabela.</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setShowImportModal(true)}
              >
                Importar Dados
              </Button>
            </div>
          )}
        </Card>

        <Card
          title="Alertas Recentes"
          headerRight={
            <Badge variant={alertCount > 0 ? 'warning' : 'success'}>
              {alertCount} novos
            </Badge>
          }
          noPadding
        >
          <AlertsList limit={4} />
        </Card>
      </div>

      {/* Meters */}
      <MetersList />

      {/* Calendário Interativo */}
      <CalendarView />
    </div>
  )
}
