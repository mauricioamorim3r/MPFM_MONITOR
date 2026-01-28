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
  refHC?: number;
  status: 'OK' | 'ERROR' | 'Pendente' | 'Parcial';
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
  
  // Desenquadramento
  desenquadramentoEvents: DesenquadramentoEvent[];
  
  // UI
  sidebarCollapsed: boolean;
  activeModule: 'monitoring' | 'calibration' | 'compliance' | 'desenquadramento';
  
  // Actions
  setUser: (user: AppState['user']) => void;
  setMeters: (meters: Meter[]) => void;
  setDailyData: (data: MassBalance[]) => void;
  setCalibrationEvents: (events: CalibrationEvent[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  setDesenquadramentoEvents: (events: DesenquadramentoEvent[]) => void;
  toggleSidebar: () => void;
  setActiveModule: (module: AppState['activeModule']) => void;
}

// ============================================================================
// TIPOS DE DESENQUADRAMENTO - RANP 44/2015 Item 10
// ============================================================================

// Status do evento de desenquadramento
export type DesenquadramentoStatus = 
  | 'Aberto' 
  | 'Em Investigação' 
  | 'Plano de Ação' 
  | 'Aguardando Validação'
  | 'Concluído' 
  | 'Enviado ANP';

// Tipo de relatório conforme RANP 44
export type TipoRelatorioANP = 'Parcial' | 'Final';

// Ambiente do equipamento
export type AmbienteEquipamento = 'TOPSIDE' | 'SUBSEA';

// Condições operacionais no momento da falha
export interface CondicoesOperacionais {
  gvf: number;           // Gas Void Fraction (%)
  bsw: number;           // Basic Sediment and Water (%)
  salinidade: number;    // Salinidade (mg/L)
  pressao: number;       // Pressão (bar)
  temperatura: number;   // Temperatura (°C)
  vazaoOleo: number;     // Vazão de óleo (m³/d)
  vazaoGas: number;      // Vazão de gás (MSm³/d)
  vazaoAgua: number;     // Vazão de água (m³/d)
  vazaoTotal: number;    // Vazão total (m³/d)
  dpVenturi?: number;    // Delta P Venturi (mbar)
}

// Entrada do Diário de Bordo
export interface DiarioBordoEntry {
  id: string;
  eventId: string;
  dataHora: string;
  dPlus: number;         // Dias desde o evento (D+0, D+3, D+10...)
  etapa: string;
  detalhe: string;
  proximoPasso?: string;
  responsavel: string;
  area: string;
  evidenciaId?: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
  itemRANP?: string;     // Referência ao item da RANP 44
}

// Dados do diagnóstico
export interface DiagnosticoData {
  descricaoFalha: string;
  causaProvavel: string;
  fatoDeterminante?: string;
  fatoresExternos?: string;
  metodologiaAnalise: 'Ishikawa' | '5 Porquês' | 'FMEA' | 'Outro';
  analise5Porques?: {
    porque1: string;
    porque2: string;
    porque3: string;
    porque4: string;
    porque5: string;
  };
  categoriasFalha: {
    hardware: boolean;
    pvt: boolean;
    processo: boolean;
    comunicacao: boolean;
    configuracao: boolean;
    calibracao: boolean;
    outro: boolean;
  };
  conclusaoTecnica: string;
}

// Dados de contingência
export interface ContingenciaData {
  planoAcionado: boolean;
  medidaMitigadora: string;
  metodologiaContingencia?: string;
  dataInicioContingencia?: string;
  dataFimContingencia?: string;
  responsavelContingencia: string;
  efetividadeContingencia?: 'Alta' | 'Média' | 'Baixa';
}

// Ação Corretiva/Preventiva (CAPA)
export interface AcaoCAPA {
  id: string;
  eventId: string;
  acao: string;
  descricao: string;
  tipo: 'Corretiva' | 'Preventiva';
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  responsavel: string;
  prazo: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado';
  evidenciaId?: string;
  criterioEficacia?: string;
  dataVerificacao?: string;
  resultadoVerificacao?: string;
  observacoes?: string;
}

// Anexo/Evidência
export interface AnexoEvidencia {
  id: string;
  eventId: string;
  tipo: 'PDF' | 'Imagem' | 'Log' | 'Relatório' | 'Email' | 'Outro';
  nome: string;
  descricao: string;
  origem: string;
  dataUpload: string;
  uploadedBy: string;
  tamanhoBytes: number;
  url?: string;
  referenciaDiario?: string;  // ID da entrada do diário relacionada
}

// Item do checklist ANP
export interface ChecklistItemANP {
  id: string;
  itemRANP: string;           // Ex: "10.4.1.a"
  descricao: string;
  obrigatorio: boolean;
  tipoRelatorio: TipoRelatorioANP[];
  status: 'Pendente' | 'OK' | 'N/A';
  campoPreenchido?: string;
  observacao?: string;
}

// Evento de Desenquadramento (principal)
export interface DesenquadramentoEvent {
  id: string;
  status: DesenquadramentoStatus;
  tipoRelatorio: TipoRelatorioANP;
  ambiente: AmbienteEquipamento;
  
  // Identificação
  equipamentoId: string;
  equipamentoTag: string;
  equipamentoNome: string;
  
  // Datas importantes
  dataOcorrencia: string;         // Data do início do desvio
  dataDeteccao: string;           // Data que foi detectado
  dataRelatorio: string;          // Data de emissão do relatório
  dataEnvioANP?: string;          // Data de envio à ANP
  prazoRelatorioParcial: string;  // D+10
  prazoRelatorioFinal: string;    // D+30 (topside) ou D+60/90/120 (subsea)
  prazoReparo: string;            // 60d (topside) ou 120d (subsea)
  
  // Responsáveis
  responsavelTecnico: string;
  gerenteSGMFM?: string;
  
  // Dados do evento
  condicoesOperacionais: CondicoesOperacionais;
  diarioBordo: DiarioBordoEntry[];
  diagnostico?: DiagnosticoData;
  contingencia?: ContingenciaData;
  planosAcao: AcaoCAPA[];
  anexos: AnexoEvidencia[];
  checklistANP: ChecklistItemANP[];
  
  // Controle
  diasConsecutivosDesvio: number;
  desvioHC: number;
  desvioTotal: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// TIPOS DE PVT EXPANDIDOS
// ============================================================================

// Composição molar detalhada
export interface ComposicaoMolarComponente {
  componente: string;         // N2, CO2, H2S, C1, C2, C3, iC4, nC4, iC5, nC5, C6, C7, C8, C9, C10+
  massaMolar: number;         // g/mol
  molPercent: number;         // % molar original
  molPercentNormalizado: number;  // % molar normalizado
}

// Dados PVT completos
export interface PVTDataCompleto {
  id: string;
  reportId: string;
  tipo: 'AS_FOUND' | 'AS_LEFT';
  dataAmostragem: string;
  pontoAmostragem: string;
  software: string;
  versao: string;
  statusAprovacao: 'Pendente' | 'Aprovado' | 'Rejeitado';
  dataAprovacao?: string;
  aprovadoPor?: string;
  
  // Propriedades de referência
  propriedadesReferencia: {
    densidadeOleo: number;      // kg/m³
    densidadeGas: number;       // kg/m³
    densidadeAgua: number;      // kg/m³
    rgo: number;                // Razão Gás-Óleo (Sm³/Sm³)
    condutividadeAgua: number;  // mS/cm
    salinidade: number;         // mg/L NaCl
    fatorEncolhimento: number;  // Bo
    viscosidadeOleo?: number;   // cP
    viscosidadeGas?: number;    // cP
  };
  
  // Composição molar
  composicaoMolar: ComposicaoMolarComponente[];
  
  // Fatores Peneloux (correção de volume)
  fatoresPeneloux: {
    gas: number;
    oleo: number;
  };
  
  // Envelope de fases
  envelopeFases?: {
    pressaoCritica: number;
    temperaturaCritica: number;
    pressaoBolha: number;
    pressaoOrvalho: number;
  };
}

// ============================================================================
// TIPOS DE RESUMO E AGREGAÇÃO
// ============================================================================

// Resumo de monitoramento (semanal/mensal)
export interface MonitoramentoResumo {
  id: string;
  periodo: 'diario' | 'semanal' | 'mensal';
  dataInicio: string;
  dataFim: string;
  meterId?: string;
  meterTag?: string;
  
  // Estatísticas
  diasComDados: number;
  diasSemDados: number;
  
  // Desvio HC
  mediaDesvioHC: number;
  maxDesvioHC: number;
  minDesvioHC: number;
  diasHCOK: number;
  diasHCAlerta: number;
  diasHCFalha: number;
  
  // Desvio Total
  mediaDesvioTotal: number;
  maxDesvioTotal: number;
  minDesvioTotal: number;
  diasTotalOK: number;
  diasTotalAlerta: number;
  diasTotalFalha: number;
  
  // K-Factors
  kOilMedio: number;
  kOilMin: number;
  kOilMax: number;
  kGasMedio: number;
  kGasMin: number;
  kGasMax: number;
  kWaterMedio: number;
  kWaterMin: number;
  kWaterMax: number;
  
  // Dias consecutivos (máximo no período)
  maxDiasConsecutivosDesvio: number;
  
  // Conformidade
  taxaConformidadeHC: number;   // %
  taxaConformidadeTotal: number; // %
}

// Totalização 24h para calibração
export interface Totalizacao24h {
  id: string;
  calibrationEventId: string;
  dataInicio: string;
  dataFim: string;
  
  // Dados horários
  dadosHorarios: {
    hora: number;       // 0-23
    timestamp: string;
    massaOleoMPFM: number;
    massaGasMPFM: number;
    massaAguaMPFM: number;
    massaOleoRef: number;
    massaGasRef: number;
    massaAguaRef: number;
  }[];
  
  // Totais
  totalMassaOleoMPFM: number;
  totalMassaGasMPFM: number;
  totalMassaAguaMPFM: number;
  totalMassaOleoRef: number;
  totalMassaGasRef: number;
  totalMassaAguaRef: number;
  
  // K-Factors calculados
  kOilCalculado: number;
  kGasCalculado: number;
  kWaterCalculado: number;
  
  // Desvios
  desvioOleo: number;
  desvioGas: number;
  desvioAgua: number;
  
  // Validação
  duracaoEfetivaHoras: number;
  isValid: boolean;
  motivoInvalidacao?: string;
}
