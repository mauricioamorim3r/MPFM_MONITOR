/**
 * Serviço de cálculos para MPFM
 * Implementa as fórmulas conforme RANP 44/2015
 */

// Limites ANP
export const ANP_LIMITS = {
  HC_BALANCE_WARNING: 7, // ±7% para alerta
  HC_BALANCE_ERROR: 10, // ±10% para erro
  TOTAL_BALANCE_WARNING: 5, // ±5% para alerta
  TOTAL_BALANCE_ERROR: 7, // ±7% para erro
  CONSECUTIVE_DAYS_LIMIT: 10, // 10 dias consecutivos gatilha calibração
  K_FACTOR_MIN: 0.8, // K mínimo aceitável
  K_FACTOR_MAX: 1.2, // K máximo aceitável
  MIN_TOTALIZATION_HOURS: 24, // Mínimo 24h de totalização
} as const

// Tipos para cálculos
export interface MassData {
  oil: number
  gas: number
  water: number
}

export interface BalanceResult {
  hcBalance: number
  totalBalance: number
  hcStatus: 'OK' | 'ALERT' | 'FAIL'
  totalStatus: 'OK' | 'ALERT' | 'FAIL'
  action: 'MONITORAR' | 'INVESTIGAR'
}

export interface KFactorResult {
  kOil: number
  kGas: number
  kWater: number
  kOilStatus: 'Dentro' | 'Fora'
  kGasStatus: 'Dentro' | 'Fora'
  kWaterStatus: 'Dentro' | 'Fora'
  overallStatus: 'Aprovado' | 'Reprovado'
}

export interface DeviationResult {
  phase: string
  mpfm: number
  ref: number
  delta: number
  deviation: number
  status: 'OK' | 'FAIL'
}

// ============================================================================
// FUNÇÕES DE CÁLCULO DE BALANÇO
// ============================================================================

/**
 * Calcula o desvio percentual entre dois valores
 */
export function calculateDeviation(measured: number, reference: number): number {
  if (reference === 0) {
    if (measured === 0) return 0
    return 100 // Se referência é 0 e medido não, retorna 100%
  }
  return ((measured - reference) / reference) * 100
}

/**
 * Determina o status baseado no desvio e limites
 */
export function getDeviationStatus(
  deviation: number,
  warningLimit: number,
  errorLimit: number
): 'OK' | 'ALERT' | 'FAIL' {
  const absDeviation = Math.abs(deviation)
  if (absDeviation >= errorLimit) return 'FAIL'
  if (absDeviation >= warningLimit) return 'ALERT'
  return 'OK'
}

/**
 * Calcula o balanço de massa entre MPFM e Referência
 */
export function calculateMassBalance(
  mpfmData: MassData,
  refData: MassData
): BalanceResult {
  // HC = Oil + Gas
  const mpfmHC = mpfmData.oil + mpfmData.gas
  const refHC = refData.oil + refData.gas

  // Total = Oil + Gas + Water
  const mpfmTotal = mpfmHC + mpfmData.water
  const refTotal = refHC + refData.water

  // Calcular desvios
  const hcBalance = calculateDeviation(mpfmHC, refHC)
  const totalBalance = calculateDeviation(mpfmTotal, refTotal)

  // Determinar status
  const hcStatus = getDeviationStatus(
    hcBalance,
    ANP_LIMITS.HC_BALANCE_WARNING,
    ANP_LIMITS.HC_BALANCE_ERROR
  )
  const totalStatus = getDeviationStatus(
    totalBalance,
    ANP_LIMITS.TOTAL_BALANCE_WARNING,
    ANP_LIMITS.TOTAL_BALANCE_ERROR
  )

  // Determinar ação
  const action: 'MONITORAR' | 'INVESTIGAR' =
    hcStatus === 'FAIL' || totalStatus === 'FAIL' ? 'INVESTIGAR' : 'MONITORAR'

  return {
    hcBalance,
    totalBalance,
    hcStatus,
    totalStatus,
    action,
  }
}

// ============================================================================
// FUNÇÕES DE CÁLCULO DE K-FACTORS
// ============================================================================

/**
 * Calcula o K-Factor (fator de correção)
 * K = Massa Referência / Massa MPFM
 */
export function calculateKFactor(mpfmMass: number, refMass: number): number {
  if (mpfmMass === 0) {
    if (refMass === 0) return 1 // Ambos zero = fator 1
    return 0 // MPFM zero e ref não = fator 0
  }
  return refMass / mpfmMass
}

/**
 * Verifica se K-Factor está dentro dos limites
 */
export function getKFactorStatus(
  k: number,
  min: number = ANP_LIMITS.K_FACTOR_MIN,
  max: number = ANP_LIMITS.K_FACTOR_MAX
): 'Dentro' | 'Fora' {
  return k >= min && k <= max ? 'Dentro' : 'Fora'
}

/**
 * Calcula todos os K-Factors
 */
export function calculateAllKFactors(
  mpfmData: MassData,
  refData: MassData,
  kMin: number = ANP_LIMITS.K_FACTOR_MIN,
  kMax: number = ANP_LIMITS.K_FACTOR_MAX
): KFactorResult {
  const kOil = calculateKFactor(mpfmData.oil, refData.oil)
  const kGas = calculateKFactor(mpfmData.gas, refData.gas)
  const kWater = calculateKFactor(mpfmData.water, refData.water)

  const kOilStatus = getKFactorStatus(kOil, kMin, kMax)
  const kGasStatus = getKFactorStatus(kGas, kMin, kMax)
  const kWaterStatus = getKFactorStatus(kWater, kMin, kMax)

  // Status geral: Aprovado se todos estão dentro dos limites
  const overallStatus: 'Aprovado' | 'Reprovado' =
    kOilStatus === 'Dentro' && kGasStatus === 'Dentro' && kWaterStatus === 'Dentro'
      ? 'Aprovado'
      : 'Reprovado'

  return {
    kOil,
    kGas,
    kWater,
    kOilStatus,
    kGasStatus,
    kWaterStatus,
    overallStatus,
  }
}

/**
 * Aplica K-Factor para corrigir massa
 */
export function applyCorrectionFactor(mass: number, kFactor: number): number {
  return mass * kFactor
}

/**
 * Calcula desvio corrigido após aplicação de K-Factor
 */
export function calculateCorrectedDeviation(
  mpfmMass: number,
  refMass: number,
  kFactor: number
): DeviationResult {
  const correctedMass = applyCorrectionFactor(mpfmMass, kFactor)
  const deviation = calculateDeviation(correctedMass, refMass)
  const status = Math.abs(deviation) <= ANP_LIMITS.HC_BALANCE_ERROR ? 'OK' : 'FAIL'

  return {
    phase: '',
    mpfm: mpfmMass,
    ref: refMass,
    delta: correctedMass - refMass,
    deviation,
    status,
  }
}

// ============================================================================
// FUNÇÕES DE TOTALIZAÇÃO
// ============================================================================

export interface TotalizationEntry {
  startTime: string
  endTime: string
  mpfmOil: number
  mpfmGas: number
  mpfmWater: number
  refOilVolume: number
  refOilDensity: number
  refGas: number
  refWater: number
}

export interface TotalizationResult {
  totalHours: number
  totalMpfmOil: number
  totalMpfmGas: number
  totalMpfmWater: number
  totalMpfmHC: number
  totalMpfmTotal: number
  totalRefOil: number
  totalRefGas: number
  totalRefWater: number
  totalRefHC: number
  totalRefTotal: number
  isValid: boolean // >= 24h
}

/**
 * Calcula a duração em horas entre dois timestamps
 */
export function calculateDurationHours(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  return (end - start) / (1000 * 60 * 60)
}

/**
 * Converte volume de óleo para massa usando densidade
 * Massa (kg) = Volume (m³) * Densidade (kg/m³)
 */
export function volumeToMass(volumeM3: number, densityKgM3: number): number {
  return volumeM3 * densityKgM3
}

/**
 * Calcula totais de um período de totalização
 */
export function calculateTotalization(entries: TotalizationEntry[]): TotalizationResult {
  let totalHours = 0
  let totalMpfmOil = 0
  let totalMpfmGas = 0
  let totalMpfmWater = 0
  let totalRefOil = 0
  let totalRefGas = 0
  let totalRefWater = 0

  for (const entry of entries) {
    const hours = calculateDurationHours(entry.startTime, entry.endTime)
    totalHours += hours

    totalMpfmOil += entry.mpfmOil
    totalMpfmGas += entry.mpfmGas
    totalMpfmWater += entry.mpfmWater

    // Converter volume para massa
    const refOilMass = volumeToMass(entry.refOilVolume, entry.refOilDensity)
    totalRefOil += refOilMass
    totalRefGas += entry.refGas
    totalRefWater += entry.refWater
  }

  const totalMpfmHC = totalMpfmOil + totalMpfmGas
  const totalMpfmTotal = totalMpfmHC + totalMpfmWater
  const totalRefHC = totalRefOil + totalRefGas
  const totalRefTotal = totalRefHC + totalRefWater

  return {
    totalHours,
    totalMpfmOil,
    totalMpfmGas,
    totalMpfmWater,
    totalMpfmHC,
    totalMpfmTotal,
    totalRefOil,
    totalRefGas,
    totalRefWater,
    totalRefHC,
    totalRefTotal,
    isValid: totalHours >= ANP_LIMITS.MIN_TOTALIZATION_HOURS,
  }
}

// ============================================================================
// FUNÇÕES DE COMPOSIÇÃO MOLAR
// ============================================================================

export interface MolarComponent {
  component: string
  molecularWeight: number
  molPercent: number
}

export interface NormalizedComposition extends MolarComponent {
  normalizedMolPercent: number
}

/**
 * Normaliza composição molar para 100%
 */
export function normalizeMolarComposition(
  components: MolarComponent[]
): NormalizedComposition[] {
  const totalMol = components.reduce((sum, c) => sum + c.molPercent, 0)

  return components.map((c) => ({
    ...c,
    normalizedMolPercent: totalMol > 0 ? (c.molPercent / totalMol) * 100 : 0,
  }))
}

/**
 * Calcula peso molecular médio da mistura
 */
export function calculateMixtureMolecularWeight(
  components: NormalizedComposition[]
): number {
  return components.reduce(
    (sum, c) => sum + (c.normalizedMolPercent / 100) * c.molecularWeight,
    0
  )
}

// ============================================================================
// FUNÇÕES DE DIAS CONSECUTIVOS
// ============================================================================

export interface DailyBalanceData {
  date: string
  hcStatus: 'OK' | 'ALERT' | 'FAIL'
  totalStatus: 'OK' | 'ALERT' | 'FAIL'
}

/**
 * Calcula dias consecutivos com desvio
 */
export function calculateConsecutiveDays(
  data: DailyBalanceData[],
  statusToCheck: 'ALERT' | 'FAIL' = 'FAIL'
): number {
  // Ordenar por data decrescente
  const sorted = [...data].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  let consecutiveDays = 0

  for (const entry of sorted) {
    if (entry.hcStatus === statusToCheck || entry.totalStatus === statusToCheck) {
      consecutiveDays++
    } else {
      break // Interrompe ao encontrar um dia OK
    }
  }

  return consecutiveDays
}

/**
 * Verifica se deve acionar calibração baseado nos dias consecutivos
 */
export function shouldTriggerCalibration(consecutiveDays: number): boolean {
  return consecutiveDays >= ANP_LIMITS.CONSECUTIVE_DAYS_LIMIT
}

// ============================================================================
// GERAÇÃO DE IDs
// ============================================================================

/**
 * Gera ID único para evento de calibração
 */
export function generateCalibrationEventId(
  meterTag: string,
  type: string,
  date: Date = new Date()
): string {
  const location = meterTag.startsWith('13') ? 'TOP' : 'SUB'
  const typeCode = type.substring(0, 3).toUpperCase()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `CAL-MPFM_${location}-${typeCode}-${month}-${year}`
}

/**
 * Gera ID único com timestamp
 */
export function generateUniqueId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
}
