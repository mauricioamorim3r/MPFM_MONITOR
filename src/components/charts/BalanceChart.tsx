import {
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
} from 'recharts'
import type { MonitoringDataRow } from '@/data/monitoring'

interface BalanceChartProps {
  data: MonitoringDataRow[]
}

export function BalanceChart({ data }: BalanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          fontSize={10}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis stroke="#71717a" fontSize={10} domain={[-15, 40]} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '8px',
            fontSize: '11px',
          }}
        />
        <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="5 5" />
        <ReferenceLine y={-10} stroke="#ef4444" strokeDasharray="5 5" />
        <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="3 3" />
        <ReferenceLine y={-7} stroke="#f59e0b" strokeDasharray="3 3" />
        <ReferenceLine y={0} stroke="#52525b" />
        <Area
          type="monotone"
          dataKey="hcBalTS"
          stroke="#3b82f6"
          fill="url(#hcGrad)"
          name="HC %"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="totalBalTS"
          stroke="#10b981"
          fill="url(#totalGrad)"
          name="Total %"
          strokeWidth={2}
        />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface ProductionChartProps {
  data: MonitoringDataRow[]
}

export function ProductionChart({ data }: ProductionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          fontSize={10}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis stroke="#71717a" fontSize={10} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '8px',
            fontSize: '11px',
          }}
        />
        <Bar
          dataKey="subHC"
          fill="#3b82f6"
          name="Subsea"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="topHC"
          fill="#8b5cf6"
          name="Topside"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="sepHC"
          fill="#10b981"
          name="Test Sep"
          radius={[4, 4, 0, 0]}
        />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
      </BarChart>
    </ResponsiveContainer>
  )
}
