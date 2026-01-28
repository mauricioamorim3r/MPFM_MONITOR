/**
 * Serviço de exportação e importação de dados
 */

import type { Meter, CalibrationEvent, Alert } from '@/types'
import type { MonitoringDataRow } from '@/data/monitoring'

// ============================================================================
// EXPORTAÇÃO CSV
// ============================================================================

/**
 * Converte array de objetos para CSV
 */
export function objectsToCSV<T>(
  data: T[],
  columns?: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return ''

  // Se colunas não especificadas, usar todas as chaves do primeiro objeto
  const cols = columns || (Object.keys(data[0] as object) as (keyof T)[]).map((key) => ({
    key,
    header: String(key),
  }))

  // Header
  const header = cols.map((c) => `"${c.header}"`).join(',')

  // Rows
  const rows = data.map((row) =>
    cols
      .map((c) => {
        const value = row[c.key]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
        return String(value)
      })
      .join(',')
  )

  return [header, ...rows].join('\n')
}

/**
 * Faz download de arquivo
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exporta dados de monitoramento para CSV
 */
export function exportMonitoringDataToCSV(data: MonitoringDataRow[]): void {
  const columns: { key: keyof MonitoringDataRow; header: string }[] = [
    { key: 'date', header: 'Data' },
    { key: 'subOil', header: 'Subsea Óleo (t)' },
    { key: 'subGas', header: 'Subsea Gás (t)' },
    { key: 'subHC', header: 'Subsea HC (t)' },
    { key: 'topOil', header: 'Topside Óleo (t)' },
    { key: 'topGas', header: 'Topside Gás (t)' },
    { key: 'topHC', header: 'Topside HC (t)' },
    { key: 'sepOil', header: 'Separador Óleo (t)' },
    { key: 'sepGas', header: 'Separador Gás (t)' },
    { key: 'sepHC', header: 'Separador HC (t)' },
    { key: 'hcBalTS', header: 'Balanço HC (%)' },
    { key: 'totalBalTS', header: 'Balanço Total (%)' },
    { key: 'hcStatus', header: 'Status HC' },
    { key: 'action', header: 'Ação' },
  ]

  const csv = objectsToCSV(data, columns)
  const date = new Date().toISOString().split('T')[0]
  downloadFile(csv, `monitoramento_mpfm_${date}.csv`, 'text/csv;charset=utf-8')
}

/**
 * Exporta medidores para CSV
 */
export function exportMetersToCSV(data: Meter[]): void {
  const columns: { key: keyof Meter; header: string }[] = [
    { key: 'tag', header: 'TAG' },
    { key: 'name', header: 'Nome' },
    { key: 'location', header: 'Localização' },
    { key: 'status', header: 'Status' },
    { key: 'manufacturer', header: 'Fabricante' },
    { key: 'model', header: 'Modelo' },
    { key: 'serialNumber', header: 'Número de Série' },
    { key: 'lastCalibration', header: 'Última Calibração' },
    { key: 'kOil', header: 'K-Oil' },
    { key: 'kGas', header: 'K-Gas' },
    { key: 'kWater', header: 'K-Water' },
    { key: 'daysToCalibration', header: 'Dias para Calibração' },
  ]

  const csv = objectsToCSV(data, columns)
  const date = new Date().toISOString().split('T')[0]
  downloadFile(csv, `medidores_mpfm_${date}.csv`, 'text/csv;charset=utf-8')
}

/**
 * Exporta eventos de calibração para CSV
 */
export function exportCalibrationEventsToCSV(data: CalibrationEvent[]): void {
  const columns: { key: keyof CalibrationEvent; header: string }[] = [
    { key: 'id', header: 'ID Evento' },
    { key: 'meterTag', header: 'TAG Medidor' },
    { key: 'meterName', header: 'Nome Medidor' },
    { key: 'type', header: 'Tipo' },
    { key: 'status', header: 'Status' },
    { key: 'result', header: 'Resultado' },
    { key: 'startDate', header: 'Data Início' },
    { key: 'endDate', header: 'Data Fim' },
    { key: 'currentStep', header: 'Etapa Atual' },
    { key: 'progress', header: 'Progresso (%)' },
    { key: 'responsible', header: 'Responsável' },
  ]

  const csv = objectsToCSV(data, columns)
  const date = new Date().toISOString().split('T')[0]
  downloadFile(csv, `calibracoes_mpfm_${date}.csv`, 'text/csv;charset=utf-8')
}

// ============================================================================
// IMPORTAÇÃO CSV
// ============================================================================

/**
 * Parse CSV string para array de strings (simples)
 */
export function parseCSV(csvString: string): string[][] {
  const lines = csvString.trim().split('\n')
  return lines.map((line) => parseCSVLine(line))
}

/**
 * Parse uma linha CSV considerando aspas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Lê arquivo e retorna conteúdo como texto
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsText(file)
  })
}

/**
 * Importa dados de monitoramento de CSV
 */
export async function importMonitoringDataFromCSV(
  file: File
): Promise<Partial<MonitoringDataRow>[]> {
  const content = await readFileAsText(file)
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const columnMapping: Record<string, string> = {
    'Data': 'date',
    'Subsea Óleo (t)': 'subOil',
    'Subsea Gás (t)': 'subGas',
    'Subsea HC (t)': 'subHC',
    'Topside Óleo (t)': 'topOil',
    'Topside Gás (t)': 'topGas',
    'Topside HC (t)': 'topHC',
    'Separador Óleo (t)': 'sepOil',
    'Separador Gás (t)': 'sepGas',
    'Separador HC (t)': 'sepHC',
    'Balanço HC (%)': 'hcBalTS',
    'Balanço Total (%)': 'totalBalTS',
    'Status HC': 'hcStatus',
    'Ação': 'action',
  }

  const data: Partial<MonitoringDataRow>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string | number> = {}

    headers.forEach((header, index) => {
      const key = columnMapping[header] || header
      const value = values[index] || ''
      const numValue = parseFloat(value)
      row[key] = !isNaN(numValue) && value.trim() !== '' ? numValue : value
    })

    data.push(row as Partial<MonitoringDataRow>)
  }

  return data
}

// ============================================================================
// EXPORTAÇÃO JSON
// ============================================================================

interface ExportData {
  version: string
  exportDate: string
  meters?: Meter[]
  monitoringData?: MonitoringDataRow[]
  calibrationEvents?: CalibrationEvent[]
  alerts?: Alert[]
}

/**
 * Exporta dados para JSON
 */
export function exportAllDataToJSON(
  data: Partial<ExportData>,
  filename?: string
): void {
  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    ...data,
  }

  const json = JSON.stringify(exportData, null, 2)
  const date = new Date().toISOString().split('T')[0]
  downloadFile(json, `${filename || 'mpfm_backup'}_${date}.json`, 'application/json')
}

/**
 * Importa dados de JSON
 */
export async function importDataFromJSON(file: File): Promise<ExportData> {
  const content = await readFileAsText(file)
  return JSON.parse(content) as ExportData
}

// ============================================================================
// RELATÓRIOS
// ============================================================================

/**
 * Gera relatório de calibração em formato texto
 */
export function generateCalibrationReport(event: CalibrationEvent): string {
  const now = new Date().toLocaleString('pt-BR')
  
  return `
================================================================================
                    RELATÓRIO DE AVALIAÇÃO DE DESEMPENHO MPFM
                           CONFORME RANP 44/2015
================================================================================

ID do Evento: ${event.id}
Data de Emissão: ${now}

DADOS DO MEDIDOR
--------------------------------------------------------------------------------
TAG: ${event.meterTag}
Nome: ${event.meterName}
Tipo de Avaliação: ${event.type}

STATUS DA AVALIAÇÃO
--------------------------------------------------------------------------------
Status: ${event.status}
Resultado: ${event.result || 'Pendente'}
Etapa Atual: ${event.currentStep}/7
Progresso: ${event.progress}%

PERÍODO
--------------------------------------------------------------------------------
Data de Início: ${event.startDate}
Data de Término: ${event.endDate || 'Em andamento'}

RESPONSÁVEL
--------------------------------------------------------------------------------
${event.responsible}

================================================================================
                           FIM DO RELATÓRIO
================================================================================
`
}

/**
 * Exporta relatório de calibração
 */
export function exportCalibrationReport(event: CalibrationEvent): void {
  const report = generateCalibrationReport(event)
  const date = new Date().toISOString().split('T')[0]
  downloadFile(report, `relatorio_${event.id}_${date}.txt`, 'text/plain;charset=utf-8')
}
