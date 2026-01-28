/**
 * Gerador de Relatórios - MPFM Monitor
 * Gera relatórios em PDF e Excel conforme ANP 44/2015
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { CalibrationEvent } from '@/types'

export interface ReportConfig {
  title: string
  subtitle?: string
  author: string
  date: string
  companyName?: string
  unitName?: string
}

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

// Interface local para dados de monitoramento
export interface MonitoringDataRow {
  date: string
  meterTag: string
  mpfmOil?: number
  mpfmGas?: number
  mpfmWater?: number
  refOil?: number
  refGas?: number
  refWater?: number
  desvioHC?: number
  desvioTotal?: number
  status?: string
}

// ============================================================================
// RELATÓRIO DE CALIBRAÇÃO (RAD) - PDF
// ============================================================================

export function generateCalibrationPDF(
  event: CalibrationEvent,
  formData: CalibrationFormData,
  _config: ReportConfig
): Blob {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Cores
  const primaryColor: [number, number, number] = [59, 130, 246] // blue-500
  const headerBg: [number, number, number] = [39, 39, 42] // zinc-800

  // ============ CABEÇALHO ============
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageWidth, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('RELATÓRIO DE AVALIAÇÃO DE DESEMPENHO', pageWidth / 2, 12, {
    align: 'center',
  })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`MPFM - ${event.meterTag} | ${event.meterName}`, pageWidth / 2, 20, {
    align: 'center',
  })
  doc.text(`ID: ${event.id}`, pageWidth / 2, 26, { align: 'center' })

  // ============ INFORMAÇÕES GERAIS ============
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1. IDENTIFICAÇÃO', 14, 40)

  autoTable(doc, {
    startY: 45,
    head: [['Campo', 'Valor']],
    body: [
      ['Unidade', formData.unidade || 'FPSO Bacalhau'],
      ['Operador', formData.operador || 'Equinor Brasil Energia Ltda.'],
      ['Medidor', `${event.meterName} (${event.meterTag})`],
      ['Tipo de Avaliação', event.type],
      ['Data Início', event.startDate],
      ['Data Fim', event.endDate || '-'],
      ['Responsável', event.responsible],
      ['Status', event.status],
      ['Resultado', event.result || '-'],
    ],
    theme: 'striped',
    headStyles: { fillColor: headerBg },
    styles: { fontSize: 9 },
  })

  // ============ DADOS PVT ============
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('2. CONFIGURAÇÃO PVT', 14, currentY)

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Parâmetro', 'Valor', 'Unidade']],
    body: [
      ['Densidade Óleo', String(formData.densidadeOleo || '-'), 'kg/m³'],
      ['Densidade Gás', String(formData.densidadeGas || '-'), 'kg/m³'],
      ['Densidade Água', String(formData.densidadeAgua || '-'), 'kg/m³'],
      ['GOR', String(formData.gor || '-'), 'Sm³/Sm³'],
      ['BSW', String(formData.bsw || '-'), '%'],
      ['Relatório PVT', formData.pvtReportId || '-', '-'],
    ],
    theme: 'striped',
    headStyles: { fillColor: headerBg },
    styles: { fontSize: 9 },
  })

  // ============ K-FACTORS ============
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('3. RESULTADOS K-FACTORS', 14, currentY)

  const kFactors = formData.kFactors || { 
    oleo: { k: 1, status: '-' }, 
    gas: { k: 1, status: '-' }, 
    agua: { k: 1, status: '-' } 
  }

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Fase', 'K-Factor', 'Limite', 'Status']],
    body: [
      ['Óleo', kFactors.oleo.k.toFixed(4), '0.80 - 1.20', kFactors.oleo.status],
      ['Gás', kFactors.gas.k.toFixed(4), '0.80 - 1.20', kFactors.gas.status],
      ['Água', kFactors.agua.k.toFixed(4), '0.80 - 1.20', kFactors.agua.status],
    ],
    theme: 'striped',
    headStyles: { fillColor: headerBg },
    styles: { fontSize: 9 },
    didParseCell: (data) => {
      // Colorir status
      if (data.column.index === 3 && data.section === 'body') {
        const status = data.cell.raw as string
        if (status === 'Dentro' || status === 'OK') {
          data.cell.styles.textColor = [16, 185, 129] // emerald-500
        } else if (status === 'Fora') {
          data.cell.styles.textColor = [239, 68, 68] // red-500
        }
      }
    },
  })

  // ============ BALANÇO DE MASSA ============
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('4. BALANÇO DE MASSA', 14, currentY)

  const massas = formData.massas || { 
    oleo: { mpfm: 0, ref: 0 }, 
    gas: { mpfm: 0, ref: 0 }, 
    agua: { mpfm: 0, ref: 0 } 
  }

  const calcDesvio = (mpfm: number, ref: number): string => {
    if (ref === 0) return '0.00'
    return (((mpfm - ref) / ref) * 100).toFixed(2)
  }

  const getStatus = (mpfm: number, ref: number, limit: number): string => {
    return Math.abs(parseFloat(calcDesvio(mpfm, ref))) <= limit ? 'OK' : 'FORA'
  }

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Fase', 'MPFM (kg)', 'Referência (kg)', 'Desvio (%)', 'Limite', 'Status']],
    body: [
      [
        'Óleo',
        massas.oleo.mpfm.toFixed(2),
        massas.oleo.ref.toFixed(2),
        calcDesvio(massas.oleo.mpfm, massas.oleo.ref),
        '±10%',
        getStatus(massas.oleo.mpfm, massas.oleo.ref, 10),
      ],
      [
        'Gás',
        massas.gas.mpfm.toFixed(2),
        massas.gas.ref.toFixed(2),
        calcDesvio(massas.gas.mpfm, massas.gas.ref),
        '±10%',
        getStatus(massas.gas.mpfm, massas.gas.ref, 10),
      ],
      [
        'HC Total',
        (massas.oleo.mpfm + massas.gas.mpfm).toFixed(2),
        (massas.oleo.ref + massas.gas.ref).toFixed(2),
        calcDesvio(massas.oleo.mpfm + massas.gas.mpfm, massas.oleo.ref + massas.gas.ref),
        '±10%',
        getStatus(massas.oleo.mpfm + massas.gas.mpfm, massas.oleo.ref + massas.gas.ref, 10),
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: headerBg },
    styles: { fontSize: 9 },
  })

  // ============ RODAPÉ ============
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} | MPFM Monitor v1.0 | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  return doc.output('blob')
}

// ============================================================================
// EXPORTAR MONITORAMENTO - EXCEL
// ============================================================================

export function generateMonitoringExcel(
  data: MonitoringDataRow[],
  config: ReportConfig
): Blob {
  // Preparar dados para a planilha principal
  const monitoringData = data.map((row) => ({
    Data: row.date,
    Medidor: row.meterTag,
    'Óleo MPFM (m³/d)': row.mpfmOil || 0,
    'Gás MPFM (MSm³/d)': row.mpfmGas || 0,
    'Água MPFM (m³/d)': row.mpfmWater || 0,
    'Óleo Ref (m³/d)': row.refOil || 0,
    'Gás Ref (MSm³/d)': row.refGas || 0,
    'Água Ref (m³/d)': row.refWater || 0,
    'Desvio HC (%)': row.desvioHC || 0,
    'Desvio Total (%)': row.desvioTotal || 0,
    Status: row.status || '-',
  }))

  // Criar workbook
  const wb = XLSX.utils.book_new()

  // Planilha de dados
  const wsData = XLSX.utils.json_to_sheet(monitoringData)
  XLSX.utils.book_append_sheet(wb, wsData, 'Monitoramento Diário')

  // Planilha de resumo
  const summaryData = [
    { Campo: 'Relatório', Valor: config.title },
    { Campo: 'Unidade', Valor: config.unitName || 'FPSO Bacalhau' },
    { Campo: 'Período', Valor: `${data[0]?.date || '-'} a ${data[data.length - 1]?.date || '-'}` },
    { Campo: 'Total de Registros', Valor: data.length },
    { Campo: 'Gerado em', Valor: new Date().toLocaleString('pt-BR') },
    { Campo: 'Gerado por', Valor: config.author },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo')

  // Gerar arquivo
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ============================================================================
// EXPORTAR CALIBRAÇÃO - EXCEL
// ============================================================================

export function generateCalibrationExcel(
  event: CalibrationEvent,
  formData: CalibrationFormData,
  _config: ReportConfig
): Blob {
  const wb = XLSX.utils.book_new()

  // Planilha de Identificação
  const identData = [
    { Campo: 'ID do Evento', Valor: event.id },
    { Campo: 'Medidor', Valor: `${event.meterTag} - ${event.meterName}` },
    { Campo: 'Tipo', Valor: event.type },
    { Campo: 'Status', Valor: event.status },
    { Campo: 'Resultado', Valor: event.result || '-' },
    { Campo: 'Data Início', Valor: event.startDate },
    { Campo: 'Data Fim', Valor: event.endDate || '-' },
    { Campo: 'Responsável', Valor: event.responsible },
    { Campo: 'Unidade', Valor: formData.unidade || 'FPSO Bacalhau' },
    { Campo: 'Operador', Valor: formData.operador || 'Equinor Brasil Energia Ltda.' },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(identData), 'Identificação')

  // Planilha de K-Factors
  const kFactors = formData.kFactors || { 
    oleo: { k: 1, status: '-' }, 
    gas: { k: 1, status: '-' }, 
    agua: { k: 1, status: '-' } 
  }
  const kData = [
    { Fase: 'Óleo', 'K-Factor': kFactors.oleo.k, 'Limite Mín': 0.8, 'Limite Máx': 1.2, Status: kFactors.oleo.status },
    { Fase: 'Gás', 'K-Factor': kFactors.gas.k, 'Limite Mín': 0.8, 'Limite Máx': 1.2, Status: kFactors.gas.status },
    { Fase: 'Água', 'K-Factor': kFactors.agua.k, 'Limite Mín': 0.8, 'Limite Máx': 1.2, Status: kFactors.agua.status },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kData), 'K-Factors')

  // Planilha de Massas
  const massas = formData.massas || { 
    oleo: { mpfm: 0, ref: 0 }, 
    gas: { mpfm: 0, ref: 0 }, 
    agua: { mpfm: 0, ref: 0 } 
  }
  const calcDesvio = (mpfm: number, ref: number) => ref === 0 ? 0 : ((mpfm - ref) / ref) * 100
  const massData = [
    { Fase: 'Óleo', 'MPFM (kg)': massas.oleo.mpfm, 'Ref (kg)': massas.oleo.ref, 'Desvio (%)': calcDesvio(massas.oleo.mpfm, massas.oleo.ref) },
    { Fase: 'Gás', 'MPFM (kg)': massas.gas.mpfm, 'Ref (kg)': massas.gas.ref, 'Desvio (%)': calcDesvio(massas.gas.mpfm, massas.gas.ref) },
    { Fase: 'Água', 'MPFM (kg)': massas.agua.mpfm, 'Ref (kg)': massas.agua.ref, 'Desvio (%)': calcDesvio(massas.agua.mpfm, massas.agua.ref) },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(massData), 'Balanço de Massa')

  // Totalizadores
  if (formData.totalizadores && formData.totalizadores.length > 0) {
    const totData = formData.totalizadores.map((t) => ({
      'Início': t.startTime,
      'Fim': t.endTime,
      'Duração (h)': t.deltaHours || 0,
      'MPFM Óleo': t.mpfmOil || 0,
      'MPFM Gás': t.mpfmGas || 0,
      'MPFM Água': t.mpfmWater || 0,
      'Ref Óleo': t.refOil || 0,
      'Ref Gás': t.refGas || 0,
      'Ref Água': t.refWater || 0,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totData), 'Totalizadores')
  }

  // Gerar arquivo
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Faz download de um Blob como arquivo
 */
export function downloadBlob(blob: Blob, filename: string): void {
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
 * Gera e baixa relatório de calibração em PDF
 */
export function downloadCalibrationPDF(
  event: CalibrationEvent,
  formData: CalibrationFormData,
  author: string
): void {
  const blob = generateCalibrationPDF(event, formData, {
    title: `RAD - ${event.id}`,
    author,
    date: new Date().toISOString().split('T')[0],
    unitName: 'FPSO Bacalhau',
    companyName: 'Equinor Brasil Energia Ltda.',
  })
  downloadBlob(blob, `${event.id}_RAD.pdf`)
}

/**
 * Gera e baixa relatório de calibração em Excel
 */
export function downloadCalibrationExcel(
  event: CalibrationEvent,
  formData: CalibrationFormData,
  author: string
): void {
  const blob = generateCalibrationExcel(event, formData, {
    title: `RAD - ${event.id}`,
    author,
    date: new Date().toISOString().split('T')[0],
    unitName: 'FPSO Bacalhau',
    companyName: 'Equinor Brasil Energia Ltda.',
  })
  downloadBlob(blob, `${event.id}_RAD.xlsx`)
}

/**
 * Gera e baixa dados de monitoramento em Excel
 */
export function downloadMonitoringExcel(
  data: MonitoringDataRow[],
  author: string,
  filename?: string
): void {
  const blob = generateMonitoringExcel(data, {
    title: 'Monitoramento Diário MPFM',
    author,
    date: new Date().toISOString().split('T')[0],
    unitName: 'FPSO Bacalhau',
    companyName: 'Equinor Brasil Energia Ltda.',
  })
  downloadBlob(blob, filename || `Monitoramento_MPFM_${new Date().toISOString().split('T')[0]}.xlsx`)
}
