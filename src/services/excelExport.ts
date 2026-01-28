/**
 * Serviço de Exportação Excel - MPFM Monitor
 * Exporta dados no formato do modelo Modelo_Registro de Monitoramento_MPFM.xlsx
 */

import * as XLSX from 'xlsx'
import type { MonitoringDataRow } from '@/data/monitoring'
import type { CalibrationEvent } from '@/types'

// ============================================================================
// EXPORTAÇÃO DE MONITORAMENTO DIÁRIO
// ============================================================================

export function downloadMonitoringExcelTemplate(data: MonitoringDataRow[]) {
  const wb = XLSX.utils.book_new()
  
  // ============ ABA 1: RESUMO ============
  const resumoData = [
    ['MPFM Monitor - Registro de Monitoramento Diário'],
    [''],
    ['Unidade:', 'FPSO Bacalhau'],
    ['Operador:', 'Equinor Brasil Energia Ltda.'],
    ['Período:', `${data[0]?.date || '-'} a ${data[data.length - 1]?.date || '-'}`],
    ['Total de Registros:', data.length],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
    [''],
    ['RESUMO ESTATÍSTICO'],
    [''],
  ]
  
  // Calcular estatísticas
  if (data.length > 0) {
    const stats = calculateStats(data)
    resumoData.push(
      ['Variável', 'Mínimo', 'Máximo', 'Média', 'Último Valor'],
      ['Balanço HC (%)', stats.hcBalTS.min.toFixed(2), stats.hcBalTS.max.toFixed(2), stats.hcBalTS.avg.toFixed(2), stats.hcBalTS.last.toFixed(2)],
      ['Balanço Total (%)', stats.totalBalTS.min.toFixed(2), stats.totalBalTS.max.toFixed(2), stats.totalBalTS.avg.toFixed(2), stats.totalBalTS.last.toFixed(2)],
      ['HC Subsea (t)', stats.subHC.min.toFixed(2), stats.subHC.max.toFixed(2), stats.subHC.avg.toFixed(2), stats.subHC.last.toFixed(2)],
      ['HC Topside (t)', stats.topHC.min.toFixed(2), stats.topHC.max.toFixed(2), stats.topHC.avg.toFixed(2), stats.topHC.last.toFixed(2)],
      ['HC Separador (t)', stats.sepHC.min.toFixed(2), stats.sepHC.max.toFixed(2), stats.sepHC.avg.toFixed(2), stats.sepHC.last.toFixed(2)],
    )
  }
  
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
  wsResumo['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')
  
  // ============ ABA 2: MONITORAMENTO DIÁRIO ============
  const monitoringHeaders = [
    'Data',
    'Óleo Sub (t)', 'Gás Sub (t)', 'Água Sub (t)', 'HC Sub (t)',
    'Óleo Top (t)', 'Gás Top (t)', 'Água Top (t)', 'HC Top (t)',
    'Óleo Sep (t)', 'Gás Sep (t)', 'Água Sep (t)', 'HC Sep (t)',
    'Balanço HC (%)', 'Balanço Total (%)',
    'Status HC', 'Status Total',
    'Ação', 
    'Dias Consec. Sub-Sep', 'Dias Consec. Top-Sep', 'Dias Consec. Top-Sub'
  ]
  
  const monitoringRows = data.map(row => [
    row.date,
    row.subOil || 0, row.subGas || 0, row.subWater || 0, row.subHC || 0,
    row.topOil || 0, row.topGas || 0, row.topWater || 0, row.topHC || 0,
    row.sepOil || 0, row.sepGas || 0, row.sepWater || 0, row.sepHC || 0,
    row.hcBalTS || 0, row.totalBalTS || 0,
    row.hcStatus || '-', row.totalStatus || '-',
    row.action || '-',
    row.subVsTS || 0, row.topVsTS || 0, row.topVsSub || 0
  ])
  
  const wsMonitoring = XLSX.utils.aoa_to_sheet([monitoringHeaders, ...monitoringRows])
  wsMonitoring['!cols'] = [
    { wch: 12 }, // Data
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // Subsea
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // Topside
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // Separator
    { wch: 12 }, { wch: 14 }, // Balanços
    { wch: 10 }, { wch: 12 }, // Status
    { wch: 12 }, // Ação
    { wch: 18 }, { wch: 18 }, { wch: 18 }, // Dias consecutivos
  ]
  XLSX.utils.book_append_sheet(wb, wsMonitoring, 'Monitoramento Diário')
  
  // ============ ABA 3: SUBSEA ============
  const subseaHeaders = ['Data', 'Medidor', 'Óleo (t)', 'Gás (t)', 'Água (t)', 'HC (t)', 'Total (t)']
  const subseaRows = data.map(row => [
    row.date,
    'Subsea MPFM',
    row.subOil || 0,
    row.subGas || 0,
    row.subWater || 0,
    row.subHC || 0,
    (row.subHC || 0) + (row.subWater || 0)
  ])
  const wsSubsea = XLSX.utils.aoa_to_sheet([subseaHeaders, ...subseaRows])
  XLSX.utils.book_append_sheet(wb, wsSubsea, 'Subsea')
  
  // ============ ABA 4: TOPSIDE ============
  const topsideHeaders = ['Data', 'Medidor', 'Óleo (t)', 'Gás (t)', 'Água (t)', 'HC (t)', 'Total (t)']
  const topsideRows = data.map(row => [
    row.date,
    'Topside MPFM',
    row.topOil || 0,
    row.topGas || 0,
    row.topWater || 0,
    row.topHC || 0,
    (row.topHC || 0) + (row.topWater || 0)
  ])
  const wsTopside = XLSX.utils.aoa_to_sheet([topsideHeaders, ...topsideRows])
  XLSX.utils.book_append_sheet(wb, wsTopside, 'Topside')
  
  // ============ ABA 5: SEPARADOR ============
  const separatorHeaders = ['Data', 'Referência', 'Óleo (t)', 'Gás (t)', 'Água (t)', 'HC (t)', 'Total (t)']
  const separatorRows = data.map(row => [
    row.date,
    'Test Separator',
    row.sepOil || 0,
    row.sepGas || 0,
    row.sepWater || 0,
    row.sepHC || 0,
    (row.sepHC || 0) + (row.sepWater || 0)
  ])
  const wsSeparator = XLSX.utils.aoa_to_sheet([separatorHeaders, ...separatorRows])
  XLSX.utils.book_append_sheet(wb, wsSeparator, 'Separador')
  
  // ============ ABA 6: BALANÇOS ============
  const balanceHeaders = [
    'Data',
    'HC Subsea (t)', 'HC Topside (t)', 'HC Separator (t)',
    'Balanço Sub-Sep (%)', 'Balanço Top-Sep (%)', 'Balanço Top-Sub (%)',
    'Status HC', 'Ação'
  ]
  const balanceRows = data.map(row => {
    const hcBalSS = row.sepHC > 0 ? ((row.subHC - row.sepHC) / row.sepHC * 100) : 0
    const hcBalTopSub = row.subHC > 0 ? ((row.topHC - row.subHC) / row.subHC * 100) : 0
    return [
      row.date,
      row.subHC || 0,
      row.topHC || 0,
      row.sepHC || 0,
      hcBalSS.toFixed(2),
      (row.hcBalTS || 0).toFixed(2),
      hcBalTopSub.toFixed(2),
      row.hcStatus || '-',
      row.action || '-'
    ]
  })
  const wsBalance = XLSX.utils.aoa_to_sheet([balanceHeaders, ...balanceRows])
  XLSX.utils.book_append_sheet(wb, wsBalance, 'Balanços')
  
  // Gerar e baixar
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  
  const filename = `MPFM_Monitoramento_${new Date().toISOString().split('T')[0]}.xlsx`
  downloadBlob(blob, filename)
}

// ============================================================================
// EXPORTAÇÃO DE CALIBRAÇÃO/AVALIAÇÃO DE DESEMPENHO
// ============================================================================

export interface CalibrationFormData {
  unidade?: string
  operador?: string
  densidadeOleo?: number
  densidadeGas?: number
  densidadeAgua?: number
  gor?: number
  bsw?: number
  pvtReportId?: string
  kFactors?: {
    oleo: { k: number; status: string }
    gas: { k: number; status: string }
    agua: { k: number; status: string }
  }
  massas?: {
    oleo: { mpfm: number; ref: number }
    gas: { mpfm: number; ref: number }
    agua: { mpfm: number; ref: number }
  }
  totalizadores?: Array<{
    startTime: string
    endTime: string
    deltaHours?: number
    mpfmOil?: number
    mpfmGas?: number
    mpfmWater?: number
    refOil?: number
    refGas?: number
    refWater?: number
  }>
}

export function downloadCalibrationExcel(
  event: CalibrationEvent,
  formData: CalibrationFormData
) {
  const wb = XLSX.utils.book_new()
  
  // ============ ABA 1: IDENTIFICAÇÃO ============
  const identData = [
    ['REGISTRO DE AVALIAÇÃO DE DESEMPENHO - MPFM'],
    [''],
    ['ID do Evento:', event.id],
    ['Medidor:', `${event.meterTag} - ${event.meterName}`],
    ['Tipo:', event.type],
    ['Status:', event.status],
    ['Resultado:', event.result || '-'],
    ['Data Início:', event.startDate],
    ['Data Fim:', event.endDate || '-'],
    ['Responsável:', event.responsible],
    ['Unidade:', formData.unidade || 'FPSO Bacalhau'],
    ['Operador:', formData.operador || 'Equinor Brasil Energia Ltda.'],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
  ]
  const wsIdent = XLSX.utils.aoa_to_sheet(identData)
  wsIdent['!cols'] = [{ wch: 15 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsIdent, 'Identificação')
  
  // ============ ABA 2: PVT ============
  const pvtData = [
    ['CONFIGURAÇÃO PVT'],
    [''],
    ['Parâmetro', 'Valor', 'Unidade'],
    ['Densidade Óleo', formData.densidadeOleo || '-', 'kg/m³'],
    ['Densidade Gás', formData.densidadeGas || '-', 'kg/m³'],
    ['Densidade Água', formData.densidadeAgua || '-', 'kg/m³'],
    ['GOR', formData.gor || '-', 'Sm³/Sm³'],
    ['BSW', formData.bsw || '-', '%'],
    ['Relatório PVT', formData.pvtReportId || '-', '-'],
  ]
  const wsPVT = XLSX.utils.aoa_to_sheet(pvtData)
  XLSX.utils.book_append_sheet(wb, wsPVT, 'PVT')
  
  // ============ ABA 3: K-FACTORS ============
  const kFactors = formData.kFactors || { 
    oleo: { k: 1, status: '-' }, 
    gas: { k: 1, status: '-' }, 
    agua: { k: 1, status: '-' } 
  }
  const kData = [
    ['K-FACTORS CALCULADOS'],
    [''],
    ['Fase', 'K-Factor', 'Limite Mín', 'Limite Máx', 'Status'],
    ['Óleo', kFactors.oleo.k, 0.8, 1.2, kFactors.oleo.status],
    ['Gás', kFactors.gas.k, 0.8, 1.2, kFactors.gas.status],
    ['Água', kFactors.agua.k, 0.8, 1.2, kFactors.agua.status],
    [''],
    ['Fórmula: K = Massa_Referência / Massa_MPFM'],
    ['Conforme ANP 44/2015 - Limites: 0.80 ≤ K ≤ 1.20'],
  ]
  const wsK = XLSX.utils.aoa_to_sheet(kData)
  XLSX.utils.book_append_sheet(wb, wsK, 'K-Factors')
  
  // ============ ABA 4: BALANÇO DE MASSA ============
  const massas = formData.massas || { 
    oleo: { mpfm: 0, ref: 0 }, 
    gas: { mpfm: 0, ref: 0 }, 
    agua: { mpfm: 0, ref: 0 } 
  }
  
  const calcDesvio = (mpfm: number, ref: number) => 
    ref === 0 ? 0 : ((mpfm - ref) / ref) * 100
  
  const massData = [
    ['BALANÇO DE MASSA'],
    [''],
    ['Fase', 'MPFM (kg)', 'Referência (kg)', 'Delta (kg)', 'Desvio (%)', 'Limite', 'Status'],
    [
      'Óleo',
      massas.oleo.mpfm,
      massas.oleo.ref,
      massas.oleo.mpfm - massas.oleo.ref,
      calcDesvio(massas.oleo.mpfm, massas.oleo.ref).toFixed(2),
      '±10%',
      Math.abs(calcDesvio(massas.oleo.mpfm, massas.oleo.ref)) <= 10 ? 'OK' : 'FORA'
    ],
    [
      'Gás',
      massas.gas.mpfm,
      massas.gas.ref,
      massas.gas.mpfm - massas.gas.ref,
      calcDesvio(massas.gas.mpfm, massas.gas.ref).toFixed(2),
      '±10%',
      Math.abs(calcDesvio(massas.gas.mpfm, massas.gas.ref)) <= 10 ? 'OK' : 'FORA'
    ],
    [
      'HC Total',
      massas.oleo.mpfm + massas.gas.mpfm,
      massas.oleo.ref + massas.gas.ref,
      (massas.oleo.mpfm + massas.gas.mpfm) - (massas.oleo.ref + massas.gas.ref),
      calcDesvio(massas.oleo.mpfm + massas.gas.mpfm, massas.oleo.ref + massas.gas.ref).toFixed(2),
      '±10%',
      Math.abs(calcDesvio(massas.oleo.mpfm + massas.gas.mpfm, massas.oleo.ref + massas.gas.ref)) <= 10 ? 'OK' : 'FORA'
    ],
  ]
  const wsMass = XLSX.utils.aoa_to_sheet(massData)
  XLSX.utils.book_append_sheet(wb, wsMass, 'Balanço de Massa')
  
  // ============ ABA 5: TOTALIZADORES ============
  if (formData.totalizadores && formData.totalizadores.length > 0) {
    const totHeaders = [
      'Início', 'Fim', 'Duração (h)',
      'MPFM Óleo', 'MPFM Gás', 'MPFM Água',
      'Ref Óleo', 'Ref Gás', 'Ref Água'
    ]
    const totRows = formData.totalizadores.map(t => [
      t.startTime,
      t.endTime,
      t.deltaHours || 0,
      t.mpfmOil || 0,
      t.mpfmGas || 0,
      t.mpfmWater || 0,
      t.refOil || 0,
      t.refGas || 0,
      t.refWater || 0
    ])
    const wsTot = XLSX.utils.aoa_to_sheet([
      ['TOTALIZADORES'],
      [''],
      totHeaders,
      ...totRows
    ])
    XLSX.utils.book_append_sheet(wb, wsTot, 'Totalizadores')
  }
  
  // Gerar e baixar
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  
  const filename = `${event.id}_Avaliacao_Desempenho.xlsx`
  downloadBlob(blob, filename)
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function calculateStats(data: MonitoringDataRow[]) {
  const getStats = (key: keyof MonitoringDataRow) => {
    const values = data
      .map(d => d[key] as number)
      .filter(v => v !== undefined && v !== null && !isNaN(v))
    
    if (values.length === 0) return { min: 0, max: 0, avg: 0, last: 0 }
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      last: values[values.length - 1],
    }
  }
  
  return {
    hcBalTS: getStats('hcBalTS'),
    totalBalTS: getStats('totalBalTS'),
    subHC: getStats('subHC'),
    topHC: getStats('topHC'),
    sepHC: getStats('sepHC'),
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default {
  downloadMonitoringExcelTemplate,
  downloadCalibrationExcel,
}
