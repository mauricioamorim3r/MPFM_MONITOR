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

/**
 * Exportar API unificada
 */
export const api = {
  meters: metersApi,
  calibration: calibrationApi,
  monitoring: monitoringApi,
  alerts: alertsApi,
}

export default api
