import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Meter, CalibrationEvent, Alert, TotalizerRow, MolarComposition } from '@/types'
import type { MonitoringDataRow } from '@/data/monitoring'
import { 
  calculateMassBalance, 
  generateCalibrationEventId,
  generateUniqueId,
} from '@/services/calculations'

// ============================================================================
// TIPOS DO ESTADO
// ============================================================================

export type ActiveModule = 'monitoring' | 'calibration' | 'compliance'

export type CalibrationFormData = {
  // Step 01 - Registro
  eventId: string
  status: string
  resultado: string
  operador: string
  serviceOrder: string
  responsavelCalibracao: string
  preenchidoPor: string
  dataEmissao: string
  unidade: string
  baciaCampo: string
  localizacao: string
  referenciaMet: string
  tagMPFM: string
  serialNumber: string
  fabricante: string
  modelo: string
  tamanho: string
  razaoBeta: string
  modoMedicao: string
  sistema: string
  versaoSoftwareMedidor: string
  versaoFPM207: string
  versaoFCS320: string
  versaoPVTsim: string
  naturezaAtividade: string
  idEventoDesvio: string
  inicioEstabilizacao: string
  inicioTotalizacao: string
  fimTotalizacao: string
  duracaoEfetiva: number
  observacoesIniciais: string
  comentariosGerais: string

  // Step 02 - PVT
  pvtReportId: string
  dataAmostragem: string
  pontoAmostragem: string
  softwareModelagem: string
  versaoModelo: string
  statusAprovacao: string
  dataAprovacao: string
  comentariosPVT: string
  densidadeOleo: number
  densidadeGas: number
  densidadeAgua: number
  gor: number
  bsw: number
  fatorEncolhimento: number
  composicao: MolarComposition[]
  penelouxGas: number
  penelouxOil: number
  pvtLoadedFCS320: boolean
  pvtLoadedFPM207: boolean
  gammaRestarted: boolean
  pressureVerified: boolean
  temperatureVerified: boolean

  // Step 03 - Totalizadores
  totalizadores: TotalizerRow[]

  // Step 04 - K-Factors
  kMin: number
  kMax: number
  limiteHC: number
  limiteTotal: number
  massas: {
    oleo: { mpfm: number; ref: number }
    gas: { mpfm: number; ref: number }
    agua: { mpfm: number; ref: number }
  }
  kFactors: {
    kOil: number
    kGas: number
    kWater: number
    kOilStatus: 'Dentro' | 'Fora'
    kGasStatus: 'Dentro' | 'Fora'
    kWaterStatus: 'Dentro' | 'Fora'
  }

  // Step 05 - Balanço
  balancoTopOil: number
  balancoTopGas: number
  balancoGasLift: number
  balancoDesvio: number

  // Step 06 - Monitoramento Pós
  monitoramentoPosData: Array<{
    data: string
    duracao: number
    mpfmOil: number
    mpfmGas: number
    mpfmTotal: number
    refTotal: number
    desvio: number
    alarmes: string
  }>

  // Step 07 - Alarmes
  alarmes: Array<{
    dataHora: string
    tag: string
    codigo: string
    descricao: string
    gravidade: 'Info' | 'Warning' | 'Critical'
    acaoTomada: string
  }>
}

export interface AppState {
  // User
  user: {
    id: string
    name: string
    email: string
    role: 'Admin' | 'Operador' | 'Visualizador'
  }

  // UI State
  activeModule: ActiveModule
  sidebarCollapsed: boolean
  showNewEventModal: boolean
  showImportModal: boolean
  showExportModal: boolean
  showMeterModal: boolean
  showAlertModal: boolean
  editingMeter: Meter | null

  // Meters
  meters: Meter[]
  selectedMeter: Meter | null

  // Monitoring
  monitoringData: MonitoringDataRow[]

  // Calibration
  calibrationEvents: CalibrationEvent[]
  selectedEvent: CalibrationEvent | null
  calibrationFormData: CalibrationFormData | null

  // Alerts
  alerts: Alert[]

  // Filters
  monitoringFilters: {
    startDate: string
    endDate: string
    meterId: string
    status: string
  }
  calibrationFilters: {
    status: string
    type: string
    meterId: string
    responsible: string
  }
}

export interface AppActions {
  // UI Actions
  setActiveModule: (module: ActiveModule) => void
  toggleSidebar: () => void
  setShowNewEventModal: (show: boolean) => void
  setShowImportModal: (show: boolean) => void
  setShowExportModal: (show: boolean) => void
  setShowMeterModal: (show: boolean) => void
  setShowAlertModal: (show: boolean) => void
  setEditingMeter: (meter: Meter | null) => void

  // Meter Actions
  setSelectedMeter: (meter: Meter | null) => void
  addMeter: (meter: Omit<Meter, 'id'>) => void
  updateMeter: (id: string, updates: Partial<Meter>) => void
  deleteMeter: (id: string) => void

  // Monitoring Actions
  addMonitoringData: (data: Omit<MonitoringDataRow, 'id'>) => void
  updateMonitoringData: (id: string, updates: Partial<MonitoringDataRow>) => void
  deleteMonitoringData: (id: string) => void
  importMonitoringData: (data: MonitoringDataRow[]) => void
  recalculateBalances: () => void

  // Calibration Actions
  setSelectedEvent: (event: CalibrationEvent | null) => void
  addCalibrationEvent: (meter: Meter, type: string) => CalibrationEvent
  updateCalibrationEvent: (id: string, updates: Partial<CalibrationEvent>) => void
  deleteCalibrationEvent: (id: string) => void
  setCalibrationFormData: (data: CalibrationFormData | null) => void
  updateCalibrationFormData: (updates: Partial<CalibrationFormData>) => void
  completeCalibrationStep: (eventId: string, step: number) => void
  finalizeCalibration: (eventId: string, result: 'Aprovado' | 'Reprovado') => void

  // Alert Actions
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void
  markAlertAsRead: (alertId: string) => void
  markAllAlertsAsRead: () => void
  deleteAlert: (alertId: string) => void
  clearAllAlerts: () => void

  // Filter Actions
  setMonitoringFilters: (filters: Partial<AppState['monitoringFilters']>) => void
  setCalibrationFilters: (filters: Partial<AppState['calibrationFilters']>) => void

  // Data Actions
  resetToDefaults: () => void
  clearAllData: () => void

  // Computed
  getUnreadAlertsCount: () => number
  getActiveMetersCount: () => number
  getFilteredMonitoringData: () => MonitoringDataRow[]
  getFilteredCalibrationEvents: () => CalibrationEvent[]
}

// ============================================================================
// ESTADO INICIAL
// ============================================================================

const getInitialState = (): AppState => ({
  user: {
    id: 'user-1',
    name: 'Mauricio Amorim',
    email: 'mauricio.amorim@equinor.com',
    role: 'Admin',
  },

  activeModule: 'monitoring',
  sidebarCollapsed: false,
  showNewEventModal: false,
  showImportModal: false,
  showExportModal: false,
  showMeterModal: false,
  showAlertModal: false,
  editingMeter: null,

  meters: [],
  selectedMeter: null,

  monitoringData: [],

  calibrationEvents: [],
  selectedEvent: null,
  calibrationFormData: null,

  alerts: [],

  monitoringFilters: {
    startDate: '',
    endDate: '',
    meterId: '',
    status: '',
  },
  calibrationFilters: {
    status: '',
    type: '',
    meterId: '',
    responsible: '',
  },
})

// ============================================================================
// STORE
// ============================================================================

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      // ========================================================================
      // UI ACTIONS
      // ========================================================================
      setActiveModule: (module) => set({ activeModule: module, selectedEvent: null }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setShowNewEventModal: (show) => set({ showNewEventModal: show }),
      setShowImportModal: (show) => set({ showImportModal: show }),
      setShowExportModal: (show) => set({ showExportModal: show }),
      setShowMeterModal: (show) => set({ showMeterModal: show }),
      setShowAlertModal: (show) => set({ showAlertModal: show }),
      setEditingMeter: (meter) => set({ editingMeter: meter, showMeterModal: !!meter }),

      // ========================================================================
      // METER ACTIONS
      // ========================================================================
      setSelectedMeter: (meter) => set({ selectedMeter: meter }),

      addMeter: (meterData) => {
        const meter: Meter = {
          ...meterData,
          id: generateUniqueId('meter'),
        }
        set((state) => ({ meters: [...state.meters, meter] }))
        
        get().addAlert({
          type: 'success',
          severity: 'info',
          message: `Medidor ${meter.tag} adicionado com sucesso`,
          meterId: meter.id,
          meterTag: meter.tag,
        })
      },

      updateMeter: (id, updates) => {
        set((state) => ({
          meters: state.meters.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }))
      },

      deleteMeter: (id) => {
        const meter = get().meters.find((m) => m.id === id)
        set((state) => ({
          meters: state.meters.filter((m) => m.id !== id),
          selectedMeter: state.selectedMeter?.id === id ? null : state.selectedMeter,
        }))
        
        if (meter) {
          get().addAlert({
            type: 'warning',
            severity: 'warning',
            message: `Medidor ${meter.tag} removido`,
          })
        }
      },

      // ========================================================================
      // MONITORING ACTIONS
      // ========================================================================
      addMonitoringData: (dataWithoutId) => {
        const data: MonitoringDataRow = {
          ...dataWithoutId,
          id: generateUniqueId('mon'),
        }
        set((state) => ({ monitoringData: [...state.monitoringData, data] }))
      },

      updateMonitoringData: (id, updates) => {
        set((state) => ({
          monitoringData: state.monitoringData.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        }))
      },

      deleteMonitoringData: (id) => {
        set((state) => ({
          monitoringData: state.monitoringData.filter((d) => d.id !== id),
        }))
      },

      importMonitoringData: (data) => {
        const dataWithIds = data.map((d) => ({
          ...d,
          id: d.id || generateUniqueId('mon'),
        }))
        set((state) => ({
          monitoringData: [...state.monitoringData, ...dataWithIds],
        }))
        
        get().addAlert({
          type: 'success',
          severity: 'info',
          message: `${data.length} registros de monitoramento importados`,
        })
      },

      recalculateBalances: () => {
        set((state) => ({
          monitoringData: state.monitoringData.map((row) => {
            const balance = calculateMassBalance(
              { oil: row.topOil, gas: row.topGas, water: row.topWater || 0 },
              { oil: row.sepOil, gas: row.sepGas, water: row.sepWater || 0 }
            )
            return {
              ...row,
              hcBalancePercent: balance.hcBalance,
              totalBalancePercent: balance.totalBalance,
              hcStatus: balance.hcStatus,
              totalStatus: balance.totalStatus,
              action: balance.action,
            }
          }),
        }))
      },

      // ========================================================================
      // CALIBRATION ACTIONS
      // ========================================================================
      setSelectedEvent: (event) => set({ selectedEvent: event }),

      addCalibrationEvent: (meter, type) => {
        const now = new Date()
        const eventId = generateCalibrationEventId(meter.tag, type, now)
        
        const event: CalibrationEvent = {
          id: eventId,
          meterId: meter.id,
          meterTag: meter.tag,
          meterName: meter.name,
          type: type as CalibrationEvent['type'],
          status: 'Em Andamento',
          startDate: now.toISOString().split('T')[0],
          currentStep: 1,
          progress: 0,
          responsible: get().user.name,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }

        set((state) => ({
          calibrationEvents: [...state.calibrationEvents, event],
          showNewEventModal: false,
        }))

        get().addAlert({
          type: 'info',
          severity: 'info',
          message: `Avaliação ${eventId} iniciada para ${meter.tag}`,
          meterId: meter.id,
          meterTag: meter.tag,
        })

        return event
      },

      updateCalibrationEvent: (id, updates) => {
        set((state) => ({
          calibrationEvents: state.calibrationEvents.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
          selectedEvent:
            state.selectedEvent?.id === id
              ? { ...state.selectedEvent, ...updates, updatedAt: new Date().toISOString() }
              : state.selectedEvent,
        }))
      },

      deleteCalibrationEvent: (id) => {
        set((state) => ({
          calibrationEvents: state.calibrationEvents.filter((e) => e.id !== id),
          selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
        }))
      },

      setCalibrationFormData: (data) => set({ calibrationFormData: data }),

      updateCalibrationFormData: (updates) => {
        set((state) => ({
          calibrationFormData: state.calibrationFormData
            ? { ...state.calibrationFormData, ...updates }
            : null,
        }))
      },

      completeCalibrationStep: (eventId, step) => {
        const progress = Math.round((step / 7) * 100)
        get().updateCalibrationEvent(eventId, {
          currentStep: Math.min(step + 1, 7),
          progress,
          status: step >= 7 ? 'Concluída' : 'Em Andamento',
        })
      },

      finalizeCalibration: (eventId, result) => {
        const now = new Date()
        get().updateCalibrationEvent(eventId, {
          status: 'Concluída',
          result,
          progress: 100,
          currentStep: 7,
          endDate: now.toISOString().split('T')[0],
        })

        const event = get().calibrationEvents.find((e) => e.id === eventId)
        if (event) {
          if (result === 'Aprovado' && get().calibrationFormData?.kFactors) {
            const { kFactors } = get().calibrationFormData!
            get().updateMeter(event.meterId, {
              kOil: kFactors.kOil,
              kGas: kFactors.kGas,
              kWater: kFactors.kWater,
              lastCalibration: now.toISOString().split('T')[0],
              daysToCalibration: 365,
            })
          }

          get().addAlert({
            type: result === 'Aprovado' ? 'success' : 'error',
            severity: result === 'Aprovado' ? 'info' : 'critical',
            message: `Calibração ${eventId} finalizada: ${result}`,
            meterId: event.meterId,
            meterTag: event.meterTag,
          })
        }
      },

      // ========================================================================
      // ALERT ACTIONS
      // ========================================================================
      addAlert: (alertData) => {
        const alert: Alert = {
          ...alertData,
          id: generateUniqueId('alert'),
          timestamp: new Date().toISOString(),
          read: false,
        }
        set((state) => ({ alerts: [alert, ...state.alerts] }))
      },

      markAlertAsRead: (alertId) => {
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
        }))
      },

      markAllAlertsAsRead: () => {
        set((state) => ({
          alerts: state.alerts.map((a) => ({ ...a, read: true })),
        }))
      },

      deleteAlert: (alertId) => {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== alertId),
        }))
      },

      clearAllAlerts: () => set({ alerts: [] }),

      // ========================================================================
      // FILTER ACTIONS
      // ========================================================================
      setMonitoringFilters: (filters) => {
        set((state) => ({
          monitoringFilters: { ...state.monitoringFilters, ...filters },
        }))
      },

      setCalibrationFilters: (filters) => {
        set((state) => ({
          calibrationFilters: { ...state.calibrationFilters, ...filters },
        }))
      },

      // ========================================================================
      // DATA ACTIONS
      // ========================================================================
      resetToDefaults: () => {
        set(getInitialState())
      },

      clearAllData: () => {
        set({
          meters: [],
          monitoringData: [],
          calibrationEvents: [],
          alerts: [],
          selectedMeter: null,
          selectedEvent: null,
          calibrationFormData: null,
        })
      },

      // ========================================================================
      // COMPUTED
      // ========================================================================
      getUnreadAlertsCount: () => get().alerts.filter((a) => !a.read).length,

      getActiveMetersCount: () => get().meters.filter((m) => m.status === 'active').length,

      getFilteredMonitoringData: () => {
        const { monitoringData, monitoringFilters } = get()
        return monitoringData.filter((d) => {
          if (monitoringFilters.startDate && d.date < monitoringFilters.startDate) return false
          if (monitoringFilters.endDate && d.date > monitoringFilters.endDate) return false
          if (monitoringFilters.status && d.hcStatus !== monitoringFilters.status) return false
          return true
        })
      },

      getFilteredCalibrationEvents: () => {
        const { calibrationEvents, calibrationFilters } = get()
        return calibrationEvents.filter((e) => {
          if (calibrationFilters.status && e.status !== calibrationFilters.status) return false
          if (calibrationFilters.type && e.type !== calibrationFilters.type) return false
          if (calibrationFilters.meterId && e.meterId !== calibrationFilters.meterId) return false
          if (
            calibrationFilters.responsible &&
            !e.responsible.toLowerCase().includes(calibrationFilters.responsible.toLowerCase())
          )
            return false
          return true
        })
      },
    }),
    {
      name: 'mpfm-monitor-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        meters: state.meters,
        monitoringData: state.monitoringData,
        calibrationEvents: state.calibrationEvents,
        alerts: state.alerts,
        user: state.user,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)

// ============================================================================
// HOOKS AUXILIARES
// ============================================================================

export const useMeters = () => useAppStore((state) => state.meters)
export const useMonitoringData = () => useAppStore((state) => state.monitoringData)
export const useCalibrationEvents = () => useAppStore((state) => state.calibrationEvents)
export const useAlerts = () => useAppStore((state) => state.alerts)
export const useUser = () => useAppStore((state) => state.user)
