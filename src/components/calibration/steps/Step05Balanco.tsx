import { useState, useMemo } from 'react'
import { Target, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, Input, Badge, SectionHeader } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils'

interface EnvelopeItem {
  id: string
  item: string
  value: number
  limit: number
  status: 'OK' | 'Fora' | 'Pendente'
}

const defaultEnvelope: EnvelopeItem[] = [
  { id: 'gvf', item: 'GVF (%)', value: 0, limit: 95, status: 'Pendente' },
  { id: 'pressure', item: 'Pressão (bar)', value: 0, limit: 500, status: 'Pendente' },
  { id: 'temperature', item: 'Temperatura (°C)', value: 0, limit: 150, status: 'Pendente' },
  { id: 'flow', item: 'Vazão (m³/h)', value: 0, limit: 1000, status: 'Pendente' },
  { id: 'bsw', item: 'BSW (%)', value: 0, limit: 50, status: 'Pendente' },
]

export function Step05Balanco() {
  const { calibrationFormData, updateCalibrationFormData } = useAppStore()

  const formData = calibrationFormData || {
    balancoTopOil: 0,
    balancoTopGas: 0,
    balancoGasLift: 0,
    balancoDesvio: 0,
  }

  const [envelope, setEnvelope] = useState<EnvelopeItem[]>(defaultEnvelope)

  // Calculate balance deviation
  const balance = useMemo(() => {
    // Get totalizadores totals if available
    const tots = (formData as { totalizadores?: { mpfmOil: number; mpfmGas: number }[] }).totalizadores || []
    const subseaOil = tots.reduce((acc: number, t) => acc + (t.mpfmOil || 0), 0)
    const subseaGas = tots.reduce((acc: number, t) => acc + (t.mpfmGas || 0), 0)
    const subseaTotal = subseaOil + subseaGas

    const topsideTotal = formData.balancoTopOil + formData.balancoTopGas - formData.balancoGasLift

    const desvio = subseaTotal > 0 
      ? ((topsideTotal - subseaTotal) / subseaTotal) * 100 
      : 0

    return {
      subseaTotal,
      topsideTotal,
      desvio,
      status: Math.abs(desvio) <= 10 ? 'Dentro' : 'Fora',
    }
  }, [formData])

  const handleChange = (field: string, value: number) => {
    updateCalibrationFormData({ [field]: value, balancoDesvio: balance.desvio })
  }

  const updateEnvelopeItem = (id: string, field: 'value' | 'limit', value: number) => {
    setEnvelope((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        // Auto-calculate status
        if (updated.value > 0 && updated.limit > 0) {
          updated.status = updated.value <= updated.limit ? 'OK' : 'Fora'
        }
        return updated
      })
    )
  }

  const allEnvelopeOk = envelope.every((e) => e.status === 'OK' || e.status === 'Pendente')

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader
          icon={Target}
          title="Balanço HC Subsea vs Topside (com desconto de Gás Lift)"
          color="blue"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Input
            label="MPFM Topside – Óleo (kg)"
            type="number"
            value={formData.balancoTopOil || ''}
            onChange={(e) => handleChange('balancoTopOil', parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
          <Input
            label="MPFM Topside – Gás (kg)"
            type="number"
            value={formData.balancoTopGas || ''}
            onChange={(e) => handleChange('balancoTopGas', parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
          <Input
            label="Gás Lift – Gás (kg)"
            type="number"
            value={formData.balancoGasLift || ''}
            onChange={(e) => handleChange('balancoGasLift', parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
          <Input
            label="Desvio (%)"
            value={balance.desvio.toFixed(2)}
            readOnly
            className={cn(
              Math.abs(balance.desvio) > 10 && 'text-red-400'
            )}
          />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
            <p className="text-xs text-zinc-500">MPFM Subsea (Total)</p>
            <p className="text-lg font-bold text-blue-400">
              {balance.subseaTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
            <p className="text-xs text-zinc-500">Topside (Corrigido)</p>
            <p className="text-lg font-bold text-emerald-400">
              {balance.topsideTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
            </p>
          </div>
          <div className={cn(
            'p-3 rounded-lg text-center',
            balance.status === 'Dentro' 
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          )}>
            <p className="text-xs text-zinc-500">Desvio</p>
            <p className={cn(
              'text-lg font-bold',
              balance.status === 'Dentro' ? 'text-emerald-400' : 'text-red-400'
            )}>
              {balance.desvio.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className={cn(
          'p-3 rounded-lg flex items-center gap-2',
          balance.status === 'Dentro' 
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        )}>
          {balance.status === 'Dentro' ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-emerald-300">
                Status (±10%): Dentro do limite
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-300">
                Status (±10%): Fora do limite - verificar dados
              </p>
            </>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          icon={CheckCircle}
          title="Checagens de Envelope / Integridade"
          color="emerald"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="py-2 px-3 text-left text-zinc-400">Item</th>
                <th className="py-2 px-3 text-right text-zinc-400">Valor Medido</th>
                <th className="py-2 px-3 text-right text-zinc-400">Limite Máx.</th>
                <th className="py-2 px-3 text-center text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {envelope.map((item) => (
                <tr key={item.id} className="border-b border-zinc-800/50">
                  <td className="py-2 px-3 text-zinc-200">{item.item}</td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.value || ''}
                      onChange={(e) => updateEnvelopeItem(item.id, 'value', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right"
                      placeholder="0"
                      title={`Valor de ${item.item}`}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={item.limit || ''}
                      onChange={(e) => updateEnvelopeItem(item.id, 'limit', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right"
                      placeholder="0"
                      title={`Limite de ${item.item}`}
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant={item.status} size="sm">
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!allEnvelopeOk && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-300">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              Alguns itens estão fora do envelope operacional. Verifique os valores.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
