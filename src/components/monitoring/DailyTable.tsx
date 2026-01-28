import { Badge } from '@/components/ui'
import type { MonitoringDataRow } from '@/data/monitoring'
import { cn } from '@/utils'

interface DailyTableProps {
  data: MonitoringDataRow[]
}

export function DailyTable({ data }: DailyTableProps) {
  const reversedData = [...data].reverse().slice(0, 5)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800/50">
            <th className="py-2 px-3 text-left text-zinc-400">Data</th>
            <th className="py-2 px-3 text-right text-blue-400">Subsea HC</th>
            <th className="py-2 px-3 text-right text-purple-400">Topside HC</th>
            <th className="py-2 px-3 text-right text-emerald-400">Test Sep HC</th>
            <th className="py-2 px-3 text-center text-zinc-400">Bal HC%</th>
            <th className="py-2 px-3 text-center text-zinc-400">Status</th>
            <th className="py-2 px-3 text-center text-zinc-400">Ação</th>
          </tr>
        </thead>
        <tbody>
          {reversedData.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
            >
              <td className="py-2 px-3 text-zinc-200">{row.date}</td>
              <td className="py-2 px-3 text-right text-blue-400">
                {row.subHC.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </td>
              <td className="py-2 px-3 text-right text-purple-400">
                {row.topHC.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </td>
              <td className="py-2 px-3 text-right text-emerald-400">
                {row.sepHC.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </td>
              <td
                className={cn(
                  'py-2 px-3 text-center font-mono',
                  Math.abs(row.hcBalTS) > 10 ? 'text-red-400' : 'text-zinc-300'
                )}
              >
                {row.hcBalTS > 0 ? '+' : ''}
                {row.hcBalTS.toFixed(2)}%
              </td>
              <td className="py-2 px-3 text-center">
                <Badge variant={row.hcStatus} size="sm">
                  {row.hcStatus}
                </Badge>
              </td>
              <td className="py-2 px-3 text-center">
                <Badge variant={row.action} size="sm">
                  {row.action}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
