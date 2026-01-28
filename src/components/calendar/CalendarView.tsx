import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Card, Button, Select } from '@/components/ui'
import { DayCell } from './DayCell'
import { DayDetailModal } from './DayDetailModal'
import { useAppStore } from '@/store/useAppStore'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export interface DayStatus {
  date: string
  hasData: boolean
  status: 'OK' | 'ALERT' | 'FAIL' | 'NO_DATA'
  hcBalance?: number
  totalBalance?: number
}

export function CalendarView() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const monitoringData = useAppStore((state) => state.monitoringData)

  // Gerar dias do mês atual
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startPadding = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days: (DayStatus | null)[] = []

    // Dias vazios no início
    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }

    // Dias do mês
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      
      // Buscar dados de monitoramento para este dia
      const dayData = monitoringData.find(d => d.date === dateStr)
      
      if (dayData) {
        days.push({
          date: dateStr,
          hasData: true,
          status: dayData.hcStatus,
          hcBalance: dayData.hcBalTS,
          totalBalance: dayData.totalBalTS,
        })
      } else {
        days.push({
          date: dateStr,
          hasData: false,
          status: 'NO_DATA',
        })
      }
    }

    return days
  }, [currentMonth, currentYear, monitoringData])

  // Navegação do mês
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  const handleDayClick = (dayStatus: DayStatus) => {
    setSelectedDate(dayStatus.date)
    setShowDetailModal(true)
  }

  // Estatísticas do mês
  const monthStats = useMemo(() => {
    const daysWithData = calendarDays.filter(d => d?.hasData)
    const okDays = daysWithData.filter(d => d?.status === 'OK').length
    const alertDays = daysWithData.filter(d => d?.status === 'ALERT').length
    const failDays = daysWithData.filter(d => d?.status === 'FAIL').length
    
    return { total: daysWithData.length, ok: okDays, alert: alertDays, fail: failDays }
  }, [calendarDays])

  // Anos disponíveis para seleção
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: String(currentYear - 5 + i),
    label: String(currentYear - 5 + i)
  }))

  return (
    <Card className="p-4">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-blue-400" size={24} />
          <h2 className="text-lg font-semibold text-white">
            Calendário de Medições
          </h2>
        </div>

        {/* Estatísticas do mês */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">
            {monthStats.total} dias com dados:
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-emerald-400">{monthStats.ok} OK</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-amber-400">{monthStats.alert} Alert</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-red-400">{monthStats.fail} Fail</span>
          </span>
        </div>
      </div>

      {/* Navegação Mês/Ano */}
      <div className="flex items-center justify-between mb-4 bg-zinc-800/50 rounded-lg p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          className="text-zinc-400 hover:text-white"
        >
          <ChevronLeft size={20} />
        </Button>

        <div className="flex items-center gap-2">
          <Select
            value={String(currentMonth)}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
            options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
            className="w-32"
          />
          <Select
            value={String(currentYear)}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            options={yearOptions}
            className="w-24"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="ml-2"
          >
            Hoje
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          className="text-zinc-400 hover:text-white"
        >
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* Grade do Calendário */}
      <div className="grid grid-cols-7 gap-1">
        {/* Cabeçalho dos dias da semana */}
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-zinc-500 py-2"
          >
            {day}
          </div>
        ))}

        {/* Células dos dias */}
        {calendarDays.map((dayStatus, index) => (
          <DayCell
            key={index}
            dayStatus={dayStatus}
            isToday={dayStatus?.date === today.toISOString().split('T')[0]}
            onClick={dayStatus ? () => handleDayClick(dayStatus) : undefined}
          />
        ))}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" />
          OK (HC ≤ 7%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500" />
          Alert (7% &lt; HC ≤ 10%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500" />
          Fail (HC &gt; 10%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-zinc-700 border border-zinc-600" />
          Sem dados
        </span>
      </div>

      {/* Modal de Detalhes */}
      <DayDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        date={selectedDate}
      />
    </Card>
  )
}
