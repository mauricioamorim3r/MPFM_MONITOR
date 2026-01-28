import type { MassBalance } from '@/types'

export interface MonitoringDataRow {
  id: string
  date: string
  subOil: number
  subGas: number
  subWater?: number
  subHC: number
  topOil: number
  topGas: number
  topWater?: number
  topHC: number
  sepOil: number
  sepGas: number
  sepWater?: number
  sepHC: number
  hcBalTS: number
  totalBalTS: number
  hcBalancePercent?: number
  totalBalancePercent?: number
  hcStatus: 'OK' | 'ALERT' | 'FAIL'
  totalStatus?: 'OK' | 'ALERT' | 'FAIL'
  action: 'MONITORAR' | 'INVESTIGAR'
  subVsTS: number
  topVsTS: number
  topVsSub: number
}

// Dados de monitoramento iniciais vazios
// Os dados reais devem ser importados via PDF pelo usuário
export const monitoringData: MonitoringDataRow[] = []

// Convert to MassBalance format if needed
export function toMassBalance(data: MonitoringDataRow): MassBalance {
  return {
    id: `mb-${data.date}`,
    date: data.date,
    comparison: 'TOPSIDE_VS_SEPARATOR',
    subOil: data.subOil,
    subGas: data.subGas,
    subWater: 0,
    subHC: data.subHC,
    topOil: data.topOil,
    topGas: data.topGas,
    topWater: 0,
    topHC: data.topHC,
    sepOil: data.sepOil,
    sepGas: data.sepGas,
    sepWater: 0,
    sepHC: data.sepHC,
    hcBalancePercent: data.hcBalTS,
    totalBalancePercent: data.totalBalTS,
    hcStatus: data.hcStatus,
    totalStatus: Math.abs(data.totalBalTS) > 7 ? 'FAIL' : Math.abs(data.totalBalTS) > 5 ? 'ALERT' : 'OK',
    action: data.action,
    consecutiveDays: {
      subVsSep: data.subVsTS,
      topVsSep: data.topVsTS,
      topVsSub: data.topVsSub,
    },
  }
}
