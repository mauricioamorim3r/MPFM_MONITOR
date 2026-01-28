import { Plus, Edit, Trash2 } from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui'
import { useAppStore } from '@/store'
import { cn } from '@/utils'

export function MetersList() {
  const { meters, setShowMeterModal, setEditingMeter, deleteMeter } = useAppStore()

  const handleEdit = (meter: typeof meters[0]) => {
    setEditingMeter(meter)
  }

  const handleDelete = (meterId: string) => {
    if (confirm('Tem certeza que deseja remover este medidor?')) {
      deleteMeter(meterId)
    }
  }

  return (
    <Card
      title="Medidores MPFM"
      subtitle="Status e próximas calibrações"
      headerRight={
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setShowMeterModal(true)}
        >
          Adicionar
        </Button>
      }
      noPadding
    >
      {meters.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          <p className="mb-4">Nenhum medidor cadastrado.</p>
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => setShowMeterModal(true)}
          >
            Adicionar Primeiro Medidor
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-800/50">
                <th className="py-2 px-3 text-left text-zinc-400">TAG</th>
                <th className="py-2 px-3 text-left text-zinc-400">Nome</th>
                <th className="py-2 px-3 text-center text-zinc-400">Localização</th>
                <th className="py-2 px-3 text-center text-zinc-400">Status</th>
                <th className="py-2 px-3 text-center text-zinc-400">Última Calib.</th>
                <th className="py-2 px-3 text-right text-zinc-400">K-Oil</th>
                <th className="py-2 px-3 text-right text-zinc-400">K-Gas</th>
                <th className="py-2 px-3 text-center text-zinc-400">Próx. Calib.</th>
                <th className="py-2 px-3 text-center text-zinc-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {meters.map((meter) => (
                <tr
                  key={meter.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                >
                  <td className="py-2 px-3 font-mono text-blue-400">{meter.tag}</td>
                  <td className="py-2 px-3 text-zinc-200">{meter.name}</td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant={meter.location} size="sm">
                      {meter.location}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant={meter.status} size="sm">
                      {meter.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-center text-zinc-400">
                    {meter.lastCalibration}
                  </td>
                  <td
                    className={cn(
                      'py-2 px-3 text-right font-mono',
                      meter.kOil < 0.8 || meter.kOil > 1.2
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    )}
                  >
                    {meter.kOil.toFixed(4)}
                  </td>
                  <td
                    className={cn(
                      'py-2 px-3 text-right font-mono',
                      meter.kGas < 0.8 || meter.kGas > 1.2
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    )}
                  >
                    {meter.kGas.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Badge
                      variant={
                        meter.daysToCalibration < 30
                          ? 'error'
                          : meter.daysToCalibration < 60
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    >
                      {meter.daysToCalibration}d
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(meter)}
                        className="p-1 hover:bg-zinc-700 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5 text-zinc-400 hover:text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(meter.id)}
                        className="p-1 hover:bg-zinc-700 rounded transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
