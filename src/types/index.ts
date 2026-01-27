// ============================================================================
// TIPOS PRINCIPAIS - MPFM Monitor
// ============================================================================

// Medidores MPFM
export interface Meter {
  id: string;
  tag: string;
  name: string;
  location: 'TOPSIDE' | 'SUBSEA';
  status: 'active' | 'inactive';
  serialNumber: string;
  manufacturer: string;
  model: string;
  lastCalibration: string;
  kOil: number;
  kGas: number;
  kWater: number;
  daysToCalibration: number;
}

// Dados de produção diária
export interface DailyProduction {
  id: string;
  date: string;
  meterId: string;
  oil: number;
  gas: number;
  water: number;
  hc: number;
  total: number;
  source: 'SUBSEA' | 'TOPSIDE' | 'SEPARATOR';
}

// Balanço de massa
export interface MassBalance {
  id: string;
  date: string;
  comparison: 'SUBSEA_VS_SEPARATOR' | 'TOPSIDE_VS_SEPARATOR' | 'TOPSIDE_VS_SUBSEA';
  subOil: number;
  subGas: number;
  subWater: number;
  subHC: number;
  topOil: number;
  topGas: number;
  topWater: number;
  topHC: number;
  sepOil: number;
  sepGas: number;
  sepWater: number;
  sepHC: number;
  hcBalancePercent: number;
  totalBalancePercent: number;
  hcStatus: 'OK' | 'ALERT' | 'FAIL';
  totalStatus: 'OK' | 'ALERT' | 'FAIL';
  action: 'MONITORAR' | 'INVESTIGAR';
  consecutiveDays: {
    subVsSep: number;
    topVsSep: number;
    topVsSub: number;
  };
}

// Tipos de avaliação de calibração
export type CalibrationType = 
  | 'Comissionamento' 
  | 'Periódica' 
  | 'Especial' 
  | 'Investigação';

export type CalibrationStatus = 
  | 'Pendente' 
  | 'Em Andamento' 
  | 'Aguardando PVT' 
  | 'Em Totalização' 
  | 'Concluída';

// Evento de calibração
export interface CalibrationEvent {
  id: string;
  meterId: string;
  meterTag: string;
  meterName: string;
  type: CalibrationType;
  status: CalibrationStatus;
  result?: 'Aprovado' | 'Reprovado';
  startDate: string;
  endDate?: string;
  currentStep: number;
  progress: number;
  responsible: string;
  createdAt: string;
  updatedAt: string;
}

// Dados do formulário de calibração por etapa
export interface CalibrationStep01Data {
  eventId: string;
  status: CalibrationStatus;
  resultado?: 'Aprovado' | 'Reprovado';
  operador: string;
  serviceOrder: string;
  responsavelCalibracao: string;
  preenchidoPor: string;
  dataEmissao: string;
  unidade: string;
  baciaCampo: string;
  localizacao: string;
  referenciaMet: string;
  tagMPFM: string;
  serialNumber: string;
  fabricante: string;
  modelo: string;
  tamanho: string;
  razaoBeta: string;
  modoMedicao: string;
  sistema: string;
  versaoSoftwareMedidor: string;
  versaoFPM207: string;
  versaoFCS320: string;
  versaoPVTsim: string;
  naturezaAtividade: string;
  idEventoDesvio?: string;
  inicioEstabilizacao: string;
  inicioTotalizacao: string;
  fimTotalizacao: string;
  duracaoEfetiva: number;
  observacoesIniciais?: string;
  comentariosGerais?: string;
}

// Composição molar (PVT)
export interface MolarComposition {
  component: string;
  molecularWeight: number;
  molPercent: number;
  normalizedMolPercent: number;
}

export interface CalibrationStep02Data {
  pvtReportId: string;
  dataAmostragem: string;
  pontoAmostragem: string;
  softwareModelagem: string;
  versaoModelo: string;
  statusAprovacao: 'Aprovado' | 'Pendente' | 'Rejeitado';
  dataAprovacao?: string;
  comentariosPVT?: string;
  densidadeOleo: number;
  densidadeGas: number;
  densidadeAgua: number;
  gor: number;
  bsw: number;
  fatorEncolhimento?: number;
  composicao: MolarComposition[];
  penelouxGas: number;
  penelouxOil: number;
  pvtC7MoleWeight: number;
  pvtC7RefDensity: number;
  pvtC8MoleWeight: number;
  pvtC8RefDensity: number;
  pvtC9MoleWeight: number;
  pvtC9RefDensity: number;
  pvtC10MoleWeight: number;
  pvtLoadedFCS320: boolean;
  pvtLoadedFPM207: boolean;
  gammaRestarted: boolean;
  pressureVerified: boolean;
  temperatureVerified: boolean;
}

// Totalizadores
export interface TotalizerRow {
  id: string;
  startTime: string;
  endTime: string;
  deltaHours: number;
  mpfmOil: number;
  mpfmGas: number;
  mpfmWater: number;
  mpfmHC: number;
  mpfmTotal: number;
  refOilVolume: number;
  refOilDensity: number;
  refOilMassCalc: number;
  refOilMassPI: number;
  refGas: number;
  refWater: number;
  status: 'OK' | 'ERROR';
}

export interface CalibrationStep03Data {
  totalizadores: TotalizerRow[];
  totalDuration: number;
  totalMPFMOil: number;
  totalMPFMGas: number;
  totalMPFMWater: number;
  totalMPFMHC: number;
  totalMPFMTotal: number;
  totalRefOil: number;
  totalRefGas: number;
  totalRefWater: number;
}

// K-Factors
export interface KFactorData {
  kMin: number;
  kMax: number;
  limitHC: number;
  limitTotal: number;
  masses: {
    phase: 'Óleo' | 'Gás' | 'Água' | 'HC' | 'Total';
    mpfm: number;
    ref: number;
    delta: number;
    deviation: number;
  }[];
  kFactors: {
    kOil: number;
    kGas: number;
    kWater: number;
    kOilStatus: 'Dentro' | 'Fora';
    kGasStatus: 'Dentro' | 'Fora';
    kWaterStatus: 'Dentro' | 'Fora';
  };
  correctedMasses: {
    phase: 'Óleo' | 'Gás' | 'Água' | 'HC' | 'Total';
    raw: number;
    kFactor: number;
    corrected: number;
    ref: number;
    deviation: number;
    limit: number;
    status: 'OK' | 'FAIL';
  }[];
}

// Alertas
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  severity: AlertSeverity;
  message: string;
  meterId?: string;
  meterTag?: string;
  timestamp: string;
  read: boolean;
  actionRequired?: string;
}

// Alarmes do sistema (Step 07)
export interface SystemAlarm {
  id: string;
  timestamp: string;
  equipmentTag: string;
  alarmCode: string;
  description: string;
  severity: AlertSeverity;
  actionTaken?: string;
}

export interface MonitoredParameter {
  name: string;
  value: number;
  lowLimit: number;
  highLimit: number;
  status: 'OK' | 'LOW' | 'HIGH';
}

// Conformidade ANP
export interface ComplianceItem {
  id: string;
  item: string;
  description: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  evidence: string;
  lastCheck: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  ipAddress: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filtros
export interface MonitoringFilters {
  startDate?: string;
  endDate?: string;
  comparison?: MassBalance['comparison'];
  meterId?: string;
  status?: MassBalance['hcStatus'];
}

export interface CalibrationFilters {
  status?: CalibrationStatus;
  type?: CalibrationType;
  meterId?: string;
  responsible?: string;
  startDate?: string;
  endDate?: string;
}

// Estado da aplicação (Zustand store)
export interface AppState {
  // User
  user: {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Operador' | 'Visualizador';
  } | null;
  
  // Meters
  meters: Meter[];
  selectedMeter: Meter | null;
  
  // Monitoring
  dailyData: MassBalance[];
  monitoringFilters: MonitoringFilters;
  
  // Calibration
  calibrationEvents: CalibrationEvent[];
  selectedEvent: CalibrationEvent | null;
  calibrationFilters: CalibrationFilters;
  
  // Alerts
  alerts: Alert[];
  unreadAlertsCount: number;
  
  // UI
  sidebarCollapsed: boolean;
  activeModule: 'monitoring' | 'calibration' | 'compliance';
  
  // Actions
  setUser: (user: AppState['user']) => void;
  setMeters: (meters: Meter[]) => void;
  setDailyData: (data: MassBalance[]) => void;
  setCalibrationEvents: (events: CalibrationEvent[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  toggleSidebar: () => void;
  setActiveModule: (module: AppState['activeModule']) => void;
}
