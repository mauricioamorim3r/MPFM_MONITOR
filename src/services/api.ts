/**
 * Serviço de API - MPFM Monitor
 * Preparado para integração com backend real
 * Atualmente usa localStorage como fallback
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp?: string
}

/**
 * Cliente HTTP genérico
 */
async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Se estiver em modo mock, retorna dados do localStorage
  if (USE_MOCK) {
    return mockApiCall<T>(endpoint, options)
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data, timestamp: new Date().toISOString() }
  } catch (error) {
    console.error(`[API] Error calling ${endpoint}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Mock API para desenvolvimento local
 */
async function mockApiCall<T>(
  endpoint: string,
  options: RequestInit
): Promise<ApiResponse<T>> {
  // Simula latência de rede
  await new Promise((resolve) => setTimeout(resolve, 100))

  const method = options.method || 'GET'
  const storageKey = `mpfm_${endpoint.replace(/\//g, '_')}`

  console.log(`[API Mock] ${method} ${endpoint}`)

  if (method === 'GET') {
    const data = localStorage.getItem(storageKey)
    return {
      success: true,
      data: data ? JSON.parse(data) : null,
      timestamp: new Date().toISOString(),
    }
  }

  if (method === 'POST' || method === 'PUT') {
    const body = options.body ? JSON.parse(options.body as string) : {}
    localStorage.setItem(storageKey, JSON.stringify(body))
    return {
      success: true,
      data: body as T,
      message: 'Salvo com sucesso',
      timestamp: new Date().toISOString(),
    }
  }

  if (method === 'DELETE') {
    localStorage.removeItem(storageKey)
    return {
      success: true,
      message: 'Removido com sucesso',
      timestamp: new Date().toISOString(),
    }
  }

  return { success: false, error: 'Método não suportado' }
}

// ============================================================================
// ENDPOINTS ESPECÍFICOS
// ============================================================================

import type { Meter, CalibrationEvent, MassBalance, Alert } from '@/types'

/**
 * Configuração para backend real
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

/**
 * Cliente para backend FastAPI
 */
async function backendClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data, timestamp: new Date().toISOString() }
  } catch (error) {
    console.error(`[Backend] Error calling ${endpoint}:`, error)
    // Fallback para API mock se backend não disponível
    if (USE_MOCK) {
      console.log('[Backend] Fallback para mock API')
      return mockApiCall<T>(endpoint, options)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro de conexão com backend',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Medidores
 */
export const metersApi = {
  getAll: () => apiClient<Meter[]>('/meters'),
  getById: (id: string) => apiClient<Meter>(`/meters/${id}`),
  create: (meter: Omit<Meter, 'id'>) =>
    apiClient<Meter>('/meters', {
      method: 'POST',
      body: JSON.stringify(meter),
    }),
  update: (id: string, meter: Partial<Meter>) =>
    apiClient<Meter>(`/meters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(meter),
    }),
  delete: (id: string) =>
    apiClient<void>(`/meters/${id}`, { method: 'DELETE' }),
}

/**
 * Eventos de Calibração
 */
export const calibrationApi = {
  getAll: () => apiClient<CalibrationEvent[]>('/calibration/events'),
  getById: (id: string) => apiClient<CalibrationEvent>(`/calibration/events/${id}`),
  create: (event: Omit<CalibrationEvent, 'id'>) =>
    apiClient<CalibrationEvent>('/calibration/events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),
  update: (id: string, event: Partial<CalibrationEvent>) =>
    apiClient<CalibrationEvent>(`/calibration/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    }),
  finalize: (id: string, result: 'Aprovado' | 'Reprovado') =>
    apiClient<CalibrationEvent>(`/calibration/events/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify({ result }),
    }),
}

/**
 * Dados de Monitoramento
 */
export const monitoringApi = {
  getDaily: (startDate: string, endDate: string) =>
    apiClient<MassBalance[]>(
      `/monitoring/daily?start=${startDate}&end=${endDate}`
    ),
  importPDF: async (file: File): Promise<ApiResponse<MassBalance[]>> => {
    if (USE_MOCK) {
      // Mock: retorna dados de exemplo
      console.log('[API Mock] Importando PDF:', file.name)
      return {
        success: true,
        data: [],
        message: `PDF ${file.name} processado (mock)`,
        timestamp: new Date().toISOString(),
      }
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/monitoring/import`, {
        method: 'POST',
        body: formData,
      })
      return await response.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao importar',
      }
    }
  },
}

/**
 * Alertas
 */
export const alertsApi = {
  getAll: () => apiClient<Alert[]>('/alerts'),
  markAsRead: (id: string) =>
    apiClient<Alert>(`/alerts/${id}/read`, { method: 'POST' }),
  dismiss: (id: string) =>
    apiClient<void>(`/alerts/${id}`, { method: 'DELETE' }),
}

// ============================================================================
// ENDPOINTS BACKEND FASTAPI
// ============================================================================

export interface DailyMeasurement {
  date: string
  source: 'TOPSIDE' | 'SUBSEA' | 'SEPARATOR'
  asset_tag: string
  oil?: number
  gas?: number
  water?: number
  hc?: number
  total?: number
  bsw?: number
  k_oil?: number
  k_gas?: number
  k_water?: number
}

export interface ValidationResult {
  variable_code: string
  date_ref: string
  asset_tag: string
  excel_value?: number
  pdf_value?: number
  deviation_pct?: number
  classification: 'CONSISTENTE' | 'ACEITAVEL' | 'INCONSISTENTE' | 'FONTE_UNICA' | 'SEM_DADOS'
}

export interface BackendAlert {
  id: number
  timestamp: string
  meter_tag?: string
  category: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  acknowledged: boolean
  resolved: boolean
}

/**
 * API do Backend FastAPI
 */
export const backendApi = {
  // Status
  status: () => backendClient<{ status: string; database: string; alerts_active: number }>('/api/status'),
  health: () => backendClient<{ status: string }>('/api/health'),

  // Medições Diárias
  measurements: {
    list: (params?: { start_date?: string; end_date?: string; source?: string }) => {
      const query = new URLSearchParams()
      if (params?.start_date) query.set('start_date', params.start_date)
      if (params?.end_date) query.set('end_date', params.end_date)
      if (params?.source) query.set('source', params.source)
      return backendClient<DailyMeasurement[]>(`/api/measurements/daily?${query}`)
    },
    create: (measurement: DailyMeasurement) =>
      backendClient<{ success: boolean; id: number }>('/api/measurements/daily', {
        method: 'POST',
        body: JSON.stringify(measurement),
      }),
    summary: (start_date?: string, end_date?: string) => {
      const query = new URLSearchParams()
      if (start_date) query.set('start_date', start_date)
      if (end_date) query.set('end_date', end_date)
      return backendClient<Record<string, unknown>[]>(`/api/measurements/summary?${query}`)
    },
  },

  // Calibrações
  calibrations: {
    list: (asset_tag?: string) => {
      const query = asset_tag ? `?asset_tag=${asset_tag}` : ''
      return backendClient<Record<string, unknown>[]>(`/api/calibrations${query}`)
    },
    create: (calibration: Record<string, unknown>) =>
      backendClient<{ success: boolean; id: number }>('/api/calibrations', {
        method: 'POST',
        body: JSON.stringify(calibration),
      }),
  },

  // Alertas
  alerts: {
    list: (params?: { severity?: string; category?: string; resolved?: boolean }) => {
      const query = new URLSearchParams()
      if (params?.severity) query.set('severity', params.severity)
      if (params?.category) query.set('category', params.category)
      if (params?.resolved !== undefined) query.set('resolved', String(params.resolved))
      return backendClient<BackendAlert[]>(`/api/alerts?${query}`)
    },
    active: () => backendClient<BackendAlert[]>('/api/alerts/active'),
    create: (alert: Omit<BackendAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>) =>
      backendClient<{ success: boolean; id: number }>('/api/alerts', {
        method: 'POST',
        body: JSON.stringify(alert),
      }),
    acknowledge: (id: number, userId: string) =>
      backendClient<{ success: boolean }>(`/api/alerts/${id}/acknowledge?user_id=${userId}`, {
        method: 'PUT',
      }),
    resolve: (id: number, note?: string) =>
      backendClient<{ success: boolean }>(`/api/alerts/${id}/resolve${note ? `?note=${encodeURIComponent(note)}` : ''}`, {
        method: 'PUT',
      }),
  },

  // Validação Cruzada
  validation: {
    list: (params?: { start_date?: string; end_date?: string; classification?: string }) => {
      const query = new URLSearchParams()
      if (params?.start_date) query.set('start_date', params.start_date)
      if (params?.end_date) query.set('end_date', params.end_date)
      if (params?.classification) query.set('classification', params.classification)
      return backendClient<ValidationResult[]>(`/api/validation/cross?${query}`)
    },
    summary: (date_ref: string) =>
      backendClient<Record<string, unknown>>(`/api/validation/summary?date_ref=${date_ref}`),
  },

  // Upload
  upload: async (file: File, fileType?: string): Promise<ApiResponse<{ success: boolean; records_extracted: number }>> => {
    const formData = new FormData()
    formData.append('file', file)
    if (fileType) formData.append('file_type', fileType)

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao fazer upload',
      }
    }
  },

  // Exportação
  export: {
    dailyReport: (date_ref: string, format: 'json' | 'csv' | 'excel' = 'json') =>
      backendClient<Record<string, unknown>>(`/api/export/daily-report?date_ref=${date_ref}&format=${format}`),
  },
}

/**
 * Exportar API unificada
 */
export const api = {
  meters: metersApi,
  calibration: calibrationApi,
  monitoring: monitoringApi,
  alerts: alertsApi,
  backend: backendApi,
}

export default api
