import { useEffect, useMemo } from 'react'
import { Settings, Database, Calculator, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, Input, Badge, SectionHeader } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils'
import { calculateKFactor, ANP_LIMITS } from '@/services/calculations'

export function Step04KFactors() {
  const { calibrationFormData, updateCalibrationFormData } = useAppStore()

  const formData = calibrationFormData || {
    kMin: ANP_LIMITS.K_FACTOR_MIN,
    kMax: ANP_LIMITS.K_FACTOR_MAX,
    limiteHC: ANP_LIMITS.HC_BALANCE_ERROR,
    limiteTotal: ANP_LIMITS.TOTAL_BALANCE_ERROR,
    massas: {
      oleo: { mpfm: 0, ref: 0 },
      gas: { mpfm: 0, ref: 0 },
      agua: { mpfm: 0, ref: 0 },
    },
    kFactors: {
      kOil: 1.0,
      kGas: 1.0,
      kWater: 1.0,
      kOilStatus: 'Dentro' as const,
      kGasStatus: 'Dentro' as const,
      kWaterStatus: 'Dentro' as const,
    },
    totalizadores: [],
  }

  // Calculate totals from totalizadores
  const totals = useMemo(() => {
    const tots = formData.totalizadores || []
    return {
      mpfmOil: tots.reduce((acc: number, t: { mpfmOil: number }) => acc + t.mpfmOil, 0),
      mpfmGas: tots.reduce((acc: number, t: { mpfmGas: number }) => acc + t.mpfmGas, 0),
      refOil: tots.reduce((acc: number, t: { refOilMassCalc: number }) => acc + t.refOilMassCalc, 0),
      refGas: tots.reduce((acc: number, t: { refGas: number }) => acc + t.refGas, 0),
    }
  }, [formData.totalizadores])

  // Helper function to check if K-factor is in range
  const isKFactorInRange = (k: number, min: number, max: number) => k >= min && k <= max

  // Calculate K-factors based on totals
  const kFactors = useMemo(() => {
    const kOil = calculateKFactor(totals.refOil, totals.mpfmOil)
    const kGas = calculateKFactor(totals.refGas, totals.mpfmGas)
    // For water, use stored values or default
    const kWater = formData.massas?.agua?.mpfm > 0 
      ? calculateKFactor(formData.massas.agua.ref, formData.massas.agua.mpfm)
      : 1.0

    return {
      kOil,
      kGas,
      kWater,
      kOilStatus: isKFactorInRange(kOil, formData.kMin, formData.kMax) ? 'Dentro' as const : 'Fora' as const,
      kGasStatus: isKFactorInRange(kGas, formData.kMin, formData.kMax) ? 'Dentro' as const : 'Fora' as const,
      kWaterStatus: isKFactorInRange(kWater, formData.kMin, formData.kMax) ? 'Dentro' as const : 'Fora' as const,
    }
  }, [totals, formData.kMin, formData.kMax, formData.massas])

  // Calculate deviations
  const massasData = useMemo(() => {
    const calcDesvio = (mpfm: number, ref: number) => {
      if (ref === 0) return 0
      return ((mpfm - ref) / ref) * 100
    }

    const mpfmHC = totals.mpfmOil + totals.mpfmGas
    const refHC = totals.refOil + totals.refGas

    return [
      { fase: 'Óleo', mpfm: totals.mpfmOil, ref: totals.refOil, desvio: calcDesvio(totals.mpfmOil, totals.refOil) },
      { fase: 'Gás', mpfm: totals.mpfmGas, ref: totals.refGas, desvio: calcDesvio(totals.mpfmGas, totals.refGas) },
      { fase: 'Água', mpfm: formData.massas?.agua?.mpfm || 0, ref: formData.massas?.agua?.ref || 0, desvio: calcDesvio(formData.massas?.agua?.mpfm || 0, formData.massas?.agua?.ref || 0) },
      { fase: 'HC (Total)', mpfm: mpfmHC, ref: refHC, desvio: calcDesvio(mpfmHC, refHC), isTotal: true },
    ]
  }, [totals, formData.massas])

  // Update store when K-factors change
  useEffect(() => {
    updateCalibrationFormData({
      kFactors,
      massas: {
        oleo: { mpfm: totals.mpfmOil, ref: totals.refOil },
        gas: { mpfm: totals.mpfmGas, ref: totals.refGas },
        agua: formData.massas?.agua || { mpfm: 0, ref: 0 },
      },
    })
  }, [kFactors, totals, updateCalibrationFormData, formData.massas?.agua])

  const handleChange = (field: string, value: number) => {
    updateCalibrationFormData({ [field]: value })
  }

  const allKFactorsOk = kFactors.kOilStatus === 'Dentro' && kFactors.kGasStatus === 'Dentro'
  const hcDesvio = massasData.find((m) => m.fase === 'HC (Total)')?.desvio || 0

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      {totals.mpfmOil > 0 && totals.refOil > 0 && (
        <div className={cn(
          'p-4 rounded-lg flex items-center gap-3',
          allKFactorsOk && Math.abs(hcDesvio) <= formData.limiteHC
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        )}>
          {allKFactorsOk && Math.abs(hcDesvio) <= formData.limiteHC ? (
            <>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-400">K-Factors dentro do limite</p>
                <p className="text-xs text-zinc-400">Todos os fatores estão entre {formData.kMin} e {formData.kMax}</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">K-Factors fora do limite</p>
                <p className="text-xs text-zinc-400">Um ou mais fatores estão fora do intervalo permitido</p>
              </div>
            </>
          )}
        </div>
      )}

      <Card className="p-4">
        <SectionHeader icon={Settings} title="Parâmetros de Aceitação (ANP 44/2015)" color="amber" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="K mínimo"
            type="number"
            step="0.01"
            value={formData.kMin}
            onChange={(e) => handleChange('kMin', parseFloat(e.target.value) || 0.8)}
          />
          <Input
            label="K máximo"
            type="number"
            step="0.01"
            value={formData.kMax}
            onChange={(e) => handleChange('kMax', parseFloat(e.target.value) || 1.2)}
          />
          <Input
            label="Limite desvio HC (±)"
            type="number"
            step="0.1"
            value={formData.limiteHC}
            onChange={(e) => handleChange('limiteHC', parseFloat(e.target.value) || 10)}
            unit="%"
          />
          <Input
            label="Limite desvio Total (±)"
            type="number"
            step="0.1"
            value={formData.limiteTotal}
            onChange={(e) => handleChange('limiteTotal', parseFloat(e.target.value) || 7)}
            unit="%"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionHeader icon={Database} title="Massas Totalizadas (24h)" color="blue" />
          {totals.mpfmOil === 0 && totals.refOil === 0 ? (
            <div className="text-center py-6 text-zinc-500">
              <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum dado de totalização</p>
              <p className="text-xs">Preencha os totalizadores no passo anterior</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="py-2 px-2 text-left text-zinc-400">Fase</th>
                  <th className="py-2 px-2 text-right text-blue-400">MPFM (kg)</th>
                  <th className="py-2 px-2 text-right text-emerald-400">Ref (kg)</th>
                  <th className="py-2 px-2 text-right text-zinc-400">Desvio</th>
                </tr>
              </thead>
              <tbody>
                {massasData.map((r) => (
                  <tr
                    key={r.fase}
                    className={cn(
                      'border-b border-zinc-800/50',
                      r.isTotal && 'bg-zinc-800/30 font-medium'
                    )}
                  >
                    <td className="py-2 px-2 text-zinc-200">{r.fase}</td>
                    <td className="py-2 px-2 text-right text-blue-400">
                      {r.mpfm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 px-2 text-right text-emerald-400">
                      {r.ref.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      className={cn(
                        'py-2 px-2 text-right',
                        r.isTotal
                          ? Math.abs(r.desvio) > formData.limiteHC ? 'text-red-400' : 'text-emerald-400'
                          : Math.abs(r.desvio) > 20 ? 'text-red-400' : 'text-zinc-300'
                      )}
                    >
                      {r.desvio.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeader icon={Calculator} title="K-Factors Calculados" color="purple" />
          {totals.mpfmOil === 0 && totals.refOil === 0 ? (
            <div className="text-center py-6 text-zinc-500">
              <Calculator className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">K-Factors serão calculados</p>
              <p className="text-xs">após preenchimento dos totalizadores</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { fase: 'K-Oil (Óleo)', k: kFactors.kOil, status: kFactors.kOilStatus },
                { fase: 'K-Gas (Gás)', k: kFactors.kGas, status: kFactors.kGasStatus },
                { fase: 'K-Water (Água)', k: kFactors.kWater, status: kFactors.kWaterStatus },
              ].map((item) => (
                <div
                  key={item.fase}
                  className={cn(
                    'p-3 rounded-lg flex items-center justify-between',
                    item.status === 'Fora'
                      ? 'bg-red-500/10 border border-red-500/20'
                      : 'bg-emerald-500/10 border border-emerald-500/20'
                  )}
                >
                  <div>
                    <span className="text-xs text-zinc-400">{item.fase}</span>
                    <p
                      className={cn(
                        'text-xl font-bold font-mono',
                        item.status === 'Fora' ? 'text-red-400' : 'text-emerald-400'
                      )}
                    >
                      {item.k.toFixed(4)}
                    </p>
                  </div>
                  <Badge variant={item.status === 'Dentro' ? 'OK' : 'Fora'}>
                    {item.status === 'Dentro' ? `${formData.kMin} - ${formData.kMax}` : 'Fora'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 mb-2">Fórmula ANP 44/2015:</p>
            <p className="text-xs text-zinc-400 font-mono">
              K = Massa<sub>REF</sub> / Massa<sub>MPFM</sub>
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Intervalo válido: {formData.kMin} ≤ K ≤ {formData.kMax}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
