export { metersData } from './meters'
export { monitoringData, toMassBalance, type MonitoringDataRow } from './monitoring'
export { calibrationEvents, totalizadoresData, composicaoMolar } from './calibration'
export { alertsData, complianceData, getTimeAgo } from './alerts'

// Dados reais extraídos dos PDFs do FPSO Bacalhau
export {
  realMeters,
  realDailyProduction,
  realCalibrationPVT,
  calculateBalances,
  getInitialRealData,
  type DailyProductionData,
  type CalculatedBalance,
} from './realData'
