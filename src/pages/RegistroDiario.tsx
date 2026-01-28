/**
 * Página de Registro Diário de Variáveis - MPFM Monitor
 * Visualização de variáveis com gráficos interativos e filtros
 */

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts'
import {
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  TrendingUp,
  Droplets,
  Flame,
  Activity,
  Database,
  FileSpreadsheet,
} from 'lucide-react'
import { Button, Card, Badge, Select, Input, Tabs } from '@/components/ui'
import { useAppStore } from '@/store'
import { downloadMonitoringExcelTemplate } from '@/services/excelExport'

// Definição das variáveis disponíveis
interface VariableConfig {
  id: string
  name: string
  unit: string
  color: string
  category: 'production' | 'balance' | 'kfactor' | 'operational'
  dataKey: string
  icon: typeof TrendingUp
}

const AVAILABLE_VARIABLES: VariableConfig[] = [
  // Produção
  { id: 'subOil', name: 'Óleo Subsea', unit: 't', color: '#3b82f6', category: 'production', dataKey: 'subOil', icon: Droplets },
  { id: 'subGas', name: 'Gás Subsea', unit: 't', color: '#60a5fa', category: 'production', dataKey: 'subGas', icon: Flame },
  { id: 'subWater', name: 'Água Subsea', unit: 't', color: '#93c5fd', category: 'production', dataKey: 'subWater', icon: Droplets },
  { id: 'subHC', name: 'HC Subsea', unit: 't', color: '#2563eb', category: 'production', dataKey: 'subHC', icon: Activity },
  { id: 'topOil', name: 'Óleo Topside', unit: 't', color: '#8b5cf6', category: 'production', dataKey: 'topOil', icon: Droplets },
  { id: 'topGas', name: 'Gás Topside', unit: 't', color: '#a78bfa', category: 'production', dataKey: 'topGas', icon: Flame },
  { id: 'topWater', name: 'Água Topside', unit: 't', color: '#c4b5fd', category: 'production', dataKey: 'topWater', icon: Droplets },
  { id: 'topHC', name: 'HC Topside', unit: 't', color: '#7c3aed', category: 'production', dataKey: 'topHC', icon: Activity },
  { id: 'sepOil', name: 'Óleo Separador', unit: 't', color: '#10b981', category: 'production', dataKey: 'sepOil', icon: Droplets },
  { id: 'sepGas', name: 'Gás Separador', unit: 't', color: '#34d399', category: 'production', dataKey: 'sepGas', icon: Flame },
  { id: 'sepWater', name: 'Água Separador', unit: 't', color: '#6ee7b7', category: 'production', dataKey: 'sepWater', icon: Droplets },
  { id: 'sepHC', name: 'HC Separador', unit: 't', color: '#059669', category: 'production', dataKey: 'sepHC', icon: Activity },
  // Balanços
  { id: 'hcBalTS', name: 'Balanço HC Top vs Sep', unit: '%', color: '#f59e0b', category: 'balance', dataKey: 'hcBalTS', icon: TrendingUp },
  { id: 'totalBalTS', name: 'Balanço Total Top vs Sep', unit: '%', color: '#f97316', category: 'balance', dataKey: 'totalBalTS', icon: TrendingUp },
  { id: 'hcBalSS', name: 'Balanço HC Sub vs Sep', unit: '%', color: '#eab308', category: 'balance', dataKey: 'hcBalSS', icon: TrendingUp },
  // Dias consecutivos
  { id: 'subVsTS', name: 'Dias Consec. Sub vs TS', unit: 'd', color: '#ef4444', category: 'operational', dataKey: 'subVsTS', icon: Calendar },
  { id: 'topVsTS', name: 'Dias Consec. Top vs TS', unit: 'd', color: '#dc2626', category: 'operational', dataKey: 'topVsTS', icon: Calendar },
  { id: 'topVsSub', name: 'Dias Consec. Top vs Sub', unit: 'd', color: '#b91c1c', category: 'operational', dataKey: 'topVsSub', icon: Calendar },
]

export function RegistroDiario() {
  const { monitoringData, setShowImportModal } = useAppStore()
  
  // Estados de filtro
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedVariables, setSelectedVariables] = useState<string[]>(['subHC', 'topHC', 'sepHC', 'hcBalTS'])
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line')
  const [activeTab, setActiveTab] = useState('grafico')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Dados filtrados
  const filteredData = useMemo(() => {
    let data = [...monitoringData]
    
    if (startDate) {
      data = data.filter(d => d.date >= startDate)
    }
    if (endDate) {
      data = data.filter(d => d.date <= endDate)
    }
    
    // Ordenar por data
    data.sort((a, b) => a.date.localeCompare(b.date))
    
    return data
  }, [monitoringData, startDate, endDate])

  // Variáveis filtradas por categoria
  const filteredVariables = useMemo(() => {
    if (categoryFilter === 'all') return AVAILABLE_VARIABLES
    return AVAILABLE_VARIABLES.filter(v => v.category === categoryFilter)
  }, [categoryFilter])

  // Toggle variável selecionada
  const toggleVariable = (varId: string) => {
    setSelectedVariables(prev => 
      prev.includes(varId) 
        ? prev.filter(v => v !== varId)
        : [...prev, varId]
    )
  }

  // Estatísticas das variáveis selecionadas
  const statistics = useMemo(() => {
    const stats: Record<string, { min: number; max: number; avg: number; last: number }> = {}
    
    selectedVariables.forEach(varId => {
      const values = filteredData
        .map(d => (d as unknown as Record<string, number>)[varId])
        .filter(v => v !== undefined && v !== null && !isNaN(v))
      
      if (values.length > 0) {
        stats[varId] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          last: values[values.length - 1],
        }
      }
    })
    
    return stats
  }, [filteredData, selectedVariables])

  // Exportar dados
  const handleExport = () => {
    downloadMonitoringExcelTemplate(filteredData)
  }

  // Renderizar gráfico baseado no tipo
  const renderChart = () => {
    if (filteredData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-80 text-zinc-500">
          <Database className="w-12 h-12 mb-4" />
          <p>Nenhum dado disponível para visualização</p>
          <Button 
            variant="secondary" 
            className="mt-4"
            onClick={() => setShowImportModal(true)}
          >
            Importar Dados
          </Button>
        </div>
      )
    }

    const selectedConfigs = AVAILABLE_VARIABLES.filter(v => selectedVariables.includes(v.id))
    
    const commonProps = {
      data: filteredData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    }

    const ChartComponent = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis 
            dataKey="date" 
            stroke="#71717a" 
            fontSize={11}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis stroke="#71717a" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(label) => `Data: ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          
          {/* Linhas de referência para balanços */}
          {selectedVariables.some(v => v.includes('Bal')) && (
            <>
              <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="5 5" label="±10%" />
              <ReferenceLine y={-10} stroke="#ef4444" strokeDasharray="5 5" />
              <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="3 3" label="±7%" />
              <ReferenceLine y={-7} stroke="#f59e0b" strokeDasharray="3 3" />
            </>
          )}
          
          {selectedConfigs.map(config => {
            if (chartType === 'line') {
              return (
                <Line
                  key={config.id}
                  type="monotone"
                  dataKey={config.dataKey}
                  stroke={config.color}
                  name={config.name}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )
            } else if (chartType === 'area') {
              return (
                <Area
                  key={config.id}
                  type="monotone"
                  dataKey={config.dataKey}
                  stroke={config.color}
                  fill={config.color}
                  fillOpacity={0.3}
                  name={config.name}
                  strokeWidth={2}
                />
              )
            } else {
              return (
                <Bar
                  key={config.id}
                  dataKey={config.dataKey}
                  fill={config.color}
                  name={config.name}
                  radius={[4, 4, 0, 0]}
                />
              )
            }
          })}
          
          <Brush 
            dataKey="date" 
            height={30} 
            stroke="#3b82f6"
            fill="#18181b"
            tickFormatter={(v) => v.slice(5)}
          />
        </ChartComponent>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" />
            Registro Diário de Variáveis
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Visualização e análise de variáveis operacionais com gráficos interativos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            <Database className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button onClick={handleExport} disabled={filteredData.length === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
              placeholder="Data inicial"
            />
            <span className="text-zinc-500">até</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
              placeholder="Data final"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todas Categorias' },
                { value: 'production', label: 'Produção' },
                { value: 'balance', label: 'Balanços' },
                { value: 'operational', label: 'Operacional' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as 'line' | 'area' | 'bar')}
              options={[
                { value: 'line', label: '📈 Linha' },
                { value: 'area', label: '📊 Área' },
                { value: 'bar', label: '📶 Barras' },
              ]}
            />
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setStartDate('')
              setEndDate('')
              setCategoryFilter('all')
            }}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Limpar
          </Button>

          <Badge variant="info">
            {filteredData.length} registros
          </Badge>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'grafico', label: 'Gráfico', icon: TrendingUp },
          { id: 'tabela', label: 'Tabela de Dados', icon: Database },
          { id: 'estatisticas', label: 'Estatísticas', icon: Activity },
        ]}
      />

      {/* Seleção de Variáveis */}
      {activeTab === 'grafico' && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Variáveis no Gráfico
            </h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVariables(filteredVariables.map(v => v.id))}
              >
                Selecionar Todas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVariables([])}
              >
                <EyeOff className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredVariables.map(variable => {
              const isSelected = selectedVariables.includes(variable.id)
              const Icon = variable.icon
              return (
                <button
                  key={variable.id}
                  onClick={() => toggleVariable(variable.id)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                    ${isSelected 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'}
                  `}
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: isSelected ? variable.color : '#52525b' }}
                  />
                  <Icon className="w-3 h-3" />
                  {variable.name}
                  <span className="text-xs opacity-60">({variable.unit})</span>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* Gráfico */}
      {activeTab === 'grafico' && (
        <Card className="p-4">
          {renderChart()}
        </Card>
      )}

      {/* Tabela de Dados */}
      {activeTab === 'tabela' && (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-zinc-400 font-medium">Data</th>
                  {selectedVariables.map(varId => {
                    const config = AVAILABLE_VARIABLES.find(v => v.id === varId)
                    return (
                      <th key={varId} className="text-right p-3 text-zinc-400 font-medium">
                        {config?.name} ({config?.unit})
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredData.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-zinc-800/50">
                    <td className="p-3 text-white font-mono">{row.date}</td>
                    {selectedVariables.map(varId => {
                      const value = (row as unknown as Record<string, number>)[varId]
                      const isBalance = varId.includes('Bal')
                      const isOutOfLimit = isBalance && Math.abs(value || 0) > 10
                      
                      return (
                        <td 
                          key={varId} 
                          className={`p-3 text-right font-mono ${
                            isOutOfLimit ? 'text-red-400' : 'text-zinc-300'
                          }`}
                        >
                          {value !== undefined ? value.toFixed(2) : '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              Nenhum dado disponível
            </div>
          )}
        </Card>
      )}

      {/* Estatísticas */}
      {activeTab === 'estatisticas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedVariables.map(varId => {
            const config = AVAILABLE_VARIABLES.find(v => v.id === varId)
            const stats = statistics[varId]
            const Icon = config?.icon || Activity
            
            if (!stats || !config) return null
            
            return (
              <Card key={varId} className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{config.name}</h4>
                    <p className="text-xs text-zinc-500">{config.unit}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">Mínimo</p>
                    <p className="text-lg font-mono text-white">{stats.min.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Máximo</p>
                    <p className="text-lg font-mono text-white">{stats.max.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Média</p>
                    <p className="text-lg font-mono text-white">{stats.avg.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Último Valor</p>
                    <p className="text-lg font-mono text-blue-400">{stats.last.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            )
          })}
          
          {selectedVariables.length === 0 && (
            <Card className="col-span-full p-8 text-center text-zinc-500">
              Selecione variáveis no gráfico para ver as estatísticas
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default RegistroDiario
