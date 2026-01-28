/**
 * Dados reais extraídos dos PDFs de relatórios do FPSO Bacalhau
 * Fontes:
 * - B03_MPFM_Daily (Topside)
 * - B05_MPFM_Daily (Subsea)
 * - PVTCalibration_Bank03_Stream01_211 (Calibração)
 * - Memorial_Descritivo_MPFM_v1.0.docx
 * - PRD_MPFM_Bacalhau_v1.0.docx
 */

import type { Meter } from '@/types'

// ============================================================================
// MEDIDORES MPFM - FPSO BACALHAU
// ============================================================================
export const realMeters: Omit<Meter, 'id'>[] = [
  {
    tag: '13FT0367',
    name: 'Riser P5',
    location: 'TOPSIDE',
    status: 'active',
    serialNumber: 'SLB-VX-2024-0367',
    manufacturer: 'Schlumberger',
    model: 'Vx Spectra',
    lastCalibration: '2026-01-18',
    kOil: 1.0908,
    kGas: 1.09262,
    kWater: 1.0,
    daysToCalibration: 365,
  },
  {
    tag: '13FT0417',
    name: 'Riser P6',
    location: 'TOPSIDE',
    status: 'inactive',
    serialNumber: 'SLB-VX-2024-0417',
    manufacturer: 'Schlumberger',
    model: 'Vx Spectra',
    lastCalibration: '2025-06-15',
    kOil: 1.0,
    kGas: 1.0,
    kWater: 1.0,
    daysToCalibration: 180,
  },
  {
    tag: '18FT1506',
    name: 'PE_4',
    location: 'SUBSEA',
    status: 'active',
    serialNumber: 'TFMC-MPM-2024-1506',
    manufacturer: 'TechnipFMC',
    model: 'MPM',
    lastCalibration: '2025-12-01',
    kOil: 1.0,
    kGas: 1.0,
    kWater: 1.0,
    daysToCalibration: 320,
  },
  {
    tag: '18FT1806',
    name: 'PE_EO4',
    location: 'SUBSEA',
    status: 'inactive',
    serialNumber: 'TFMC-MPM-2024-1806',
    manufacturer: 'TechnipFMC',
    model: 'MPM',
    lastCalibration: '2025-08-20',
    kOil: 1.0,
    kGas: 1.0,
    kWater: 1.0,
    daysToCalibration: 0,
  },
  {
    tag: '18FT1706',
    name: 'PE_EO105',
    location: 'SUBSEA',
    status: 'inactive',
    serialNumber: 'TFMC-MPM-2024-1706',
    manufacturer: 'TechnipFMC',
    model: 'MPM',
    lastCalibration: '2025-07-10',
    kOil: 1.0,
    kGas: 1.0,
    kWater: 1.0,
    daysToCalibration: 0,
  },
  {
    tag: '18FT1406',
    name: 'PE_EO10',
    location: 'SUBSEA',
    status: 'inactive',
    serialNumber: 'TFMC-MPM-2024-1406',
    manufacturer: 'TechnipFMC',
    model: 'MPM',
    lastCalibration: '2025-09-05',
    kOil: 1.0,
    kGas: 1.0,
    kWater: 1.0,
    daysToCalibration: 0,
  },
]

// ============================================================================
// PRODUÇÃO DIÁRIA - DADOS REAIS DOS RELATÓRIOS
// ============================================================================
export interface DailyProductionData {
  date: string
  source: 'SUBSEA' | 'TOPSIDE' | 'SEPARATOR'
  meterTag: string
  oil: number // toneladas
  gas: number // toneladas
  water: number // toneladas
  hc: number // toneladas (oil + gas)
  total: number // toneladas (hc + water)
}

export const realDailyProduction: DailyProductionData[] = [
  // TOPSIDE - 13FT0367 (Riser P5)
  {
    date: '2026-01-02',
    source: 'TOPSIDE',
    meterTag: '13FT0367',
    oil: 4438.862,
    gas: 1014.71,
    water: 1.288,
    hc: 5452.137,
    total: 5454.86,
  },
  {
    date: '2026-01-03',
    source: 'TOPSIDE',
    meterTag: '13FT0367',
    oil: 3019.265,
    gas: 668.533,
    water: 0.26,
    hc: 3687.151,
    total: 3688.058,
  },
  {
    date: '2026-01-04',
    source: 'TOPSIDE',
    meterTag: '13FT0367',
    oil: 3932.623,
    gas: 880.823,
    water: 1.287,
    hc: 4812.451,
    total: 4814.734,
  },
  // SUBSEA - 18FT1506 (PE_4)
  {
    date: '2026-01-02',
    source: 'SUBSEA',
    meterTag: '18FT1506',
    oil: 5612.566,
    gas: 0.0, // Subsea não mede gás separadamente neste config
    water: 5.075,
    hc: 5612.566,
    total: 5617.641,
  },
  {
    date: '2026-01-03',
    source: 'SUBSEA',
    meterTag: '18FT1506',
    oil: 3578.973,
    gas: 0.0,
    water: 3.235,
    hc: 3578.973,
    total: 3582.208,
  },
  {
    date: '2026-01-04',
    source: 'SUBSEA',
    meterTag: '18FT1506',
    oil: 4870.265,
    gas: 0.0,
    water: 4.586,
    hc: 4870.265,
    total: 4874.851,
  },
]

// ============================================================================
// DADOS DE CALIBRAÇÃO PVT - Calibration #211
// ============================================================================
export const realCalibrationPVT = {
  calibrationNo: 211,
  meterTag: '13FT0367',
  meterName: 'N1 - Riser P5',
  startDate: '2026-01-17',
  endDate: '2026-01-18',
  status: 'Completed' as const,
  
  // Condições de operação
  conditions: {
    pressure: { mpfm: 11505.73, separator: 8343.63, unit: 'kPa' },
    temperature: { mpfm: 75.07, separator: 72.18, unit: '°C' },
  },
  
  // Densidades
  densities: {
    oil: { mpfm: 754.033, separator: 831.987, unit: 'kg/m³' },
    gas: { mpfm: 91.842, separator: 81.585, unit: 'kg/m³' },
    water: { mpfm: 999.784, separator: 996.629, unit: 'kg/m³' },
  },
  
  // Composição molar
  composition: [
    { component: 'N₂', molPercent: 0.575, molecularWeight: 28.01 },
    { component: 'CO₂', molPercent: 0.02, molecularWeight: 44.01 },
    { component: 'C₁', molPercent: 62.183, molecularWeight: 16.04 },
    { component: 'C₂', molPercent: 8.069, molecularWeight: 30.07 },
    { component: 'C₃', molPercent: 5.047, molecularWeight: 44.1 },
    { component: 'i-C₄', molPercent: 1.069, molecularWeight: 58.12 },
    { component: 'n-C₄', molPercent: 1.858, molecularWeight: 58.12 },
    { component: 'i-C₅', molPercent: 0.681, molecularWeight: 72.15 },
    { component: 'n-C₅', molPercent: 0.788, molecularWeight: 72.15 },
    { component: 'C₆', molPercent: 1.112, molecularWeight: 86.18 },
    { component: 'C₇', molPercent: 1.138, molecularWeight: 97.37 },
    { component: 'C₈', molPercent: 1.657, molecularWeight: 111.29 },
    { component: 'C₉', molPercent: 1.472, molecularWeight: 125.25 },
    { component: 'C₁₀+', molPercent: 14.331, molecularWeight: 289.64 },
  ],
  
  // Pseudo-componentes
  pseudoComponents: {
    C7: { weight: 97.365, density: 748.787 },
    C8: { weight: 111.286, density: 771.408 },
    C9: { weight: 125.253, density: 788.64 },
    'C10+': { weight: 289.64, density: 890.903 },
  },
  
  // Fatores Peneloux
  peneloux: { gas: 1.0, oil: 1.0 },
  
  // Massas acumuladas durante calibração (24h)
  accumulatedMass: {
    mpfm: { oil: 6365.07, gas: 1476.18, water: 1.46, hc: 7841.25, unit: 't' },
    separator: { oil: 6742.65, gas: 1813.28, water: 24.93, hc: 8555.93, unit: 't' },
  },
  
  // K-Factors calculados
  kFactors: {
    oil: { used: 0.94433, new: 1.0908 },
    gas: { used: 0.96191, new: 1.09262 },
    water: { used: 1.0, new: 17.09393 }, // Valor alto indica pouca água
    hc: { used: 0.9473, new: 1.09114 },
  },
  
  // Volumes PVT calculados
  pvtVolumes: {
    oil: { volume: 7176.047, unit: 'Sm³' },
    gas: { volume: 2479290.899, unit: 'Sm³' },
    water: { volume: 20.023, unit: 'Sm³' },
  },
  
  // Densidades PVT
  pvtDensities: {
    oil: { density: 871.271, unit: 'kg/Sm³' },
    gas: { density: 0.929, unit: 'kg/Sm³' },
    water: { density: 1212.228, unit: 'kg/Sm³' },
  },
}

// ============================================================================
// DADOS DE BALANÇO DE MASSA CALCULADOS
// ============================================================================
export interface CalculatedBalance {
  date: string
  subseaHC: number
  topsideHC: number
  hcBalancePercent: number
  hcStatus: 'OK' | 'ALERT' | 'FAIL'
  subseaTotal: number
  topsideTotal: number
  totalBalancePercent: number
  totalStatus: 'OK' | 'ALERT' | 'FAIL'
  action: 'MONITORAR' | 'INVESTIGAR'
}

export function calculateBalances(): CalculatedBalance[] {
  const balances: CalculatedBalance[] = []
  const dates = [...new Set(realDailyProduction.map((d) => d.date))]

  for (const date of dates) {
    const subsea = realDailyProduction.find(
      (d) => d.date === date && d.source === 'SUBSEA'
    )
    const topside = realDailyProduction.find(
      (d) => d.date === date && d.source === 'TOPSIDE'
    )

    if (subsea && topside) {
      const hcBalance = subsea.hc > 0 
        ? ((topside.hc - subsea.hc) / subsea.hc) * 100 
        : 0
      const totalBalance = subsea.total > 0 
        ? ((topside.total - subsea.total) / subsea.total) * 100 
        : 0

      const hcStatus: 'OK' | 'ALERT' | 'FAIL' = 
        Math.abs(hcBalance) > 10 ? 'FAIL' : 
        Math.abs(hcBalance) > 7 ? 'ALERT' : 'OK'
      
      const totalStatus: 'OK' | 'ALERT' | 'FAIL' = 
        Math.abs(totalBalance) > 7 ? 'FAIL' : 
        Math.abs(totalBalance) > 5 ? 'ALERT' : 'OK'

      balances.push({
        date,
        subseaHC: subsea.hc,
        topsideHC: topside.hc,
        hcBalancePercent: hcBalance,
        hcStatus,
        subseaTotal: subsea.total,
        topsideTotal: topside.total,
        totalBalancePercent: totalBalance,
        totalStatus,
        action: hcStatus === 'FAIL' || totalStatus === 'FAIL' ? 'INVESTIGAR' : 'MONITORAR',
      })
    }
  }

  return balances
}

// ============================================================================
// HELPER PARA INICIALIZAR STORE COM DADOS REAIS
// ============================================================================
export function getInitialRealData() {
  return {
    meters: realMeters,
    dailyProduction: realDailyProduction,
    calibrationPVT: realCalibrationPVT,
    balances: calculateBalances(),
  }
}
