import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number with locale
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// Format percentage
export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, decimals)}%`
}

// Format date
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (format === 'long') {
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }
  
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Format datetime
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${formatDate(d)} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

// Calculate balance percentage
export function calculateBalance(mpfm: number, ref: number): number {
  if (ref === 0) return 0
  return ((mpfm - ref) / ref) * 100
}

// Get balance status based on limits
export function getBalanceStatus(
  value: number, 
  warningLimit: number, 
  errorLimit: number
): 'OK' | 'ALERT' | 'FAIL' {
  const absValue = Math.abs(value)
  if (absValue >= errorLimit) return 'FAIL'
  if (absValue >= warningLimit) return 'ALERT'
  return 'OK'
}

// Get K-Factor status
export function getKFactorStatus(k: number, min = 0.8, max = 1.2): 'Dentro' | 'Fora' {
  return k >= min && k <= max ? 'Dentro' : 'Fora'
}

// Get action based on balance and consecutive days
export function getAction(
  hcBalance: number,
  totalBalance: number,
  consecutiveDays: number,
  hcLimit = 10,
  totalLimit = 7,
  daysLimit = 10
): 'MONITORAR' | 'INVESTIGAR' {
  if (
    Math.abs(hcBalance) >= hcLimit ||
    Math.abs(totalBalance) >= totalLimit ||
    consecutiveDays >= daysLimit
  ) {
    return 'INVESTIGAR'
  }
  return 'MONITORAR'
}

// Get color class for balance value
export function getBalanceColorClass(value: number, warningLimit = 7, errorLimit = 10): string {
  const absValue = Math.abs(value)
  if (absValue >= errorLimit) return 'text-red-400'
  if (absValue >= warningLimit) return 'text-amber-400'
  return 'text-emerald-400'
}

// Get background color class for status
export function getStatusBgClass(status: 'OK' | 'ALERT' | 'FAIL' | string): string {
  switch (status) {
    case 'OK':
    case 'success':
    case 'Dentro':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'ALERT':
    case 'warning':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'FAIL':
    case 'error':
    case 'Fora':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    default:
      return 'bg-zinc-700 text-zinc-300'
  }
}

// Calculate duration in hours between two dates
export function calculateDuration(start: string | Date, end: string | Date): number {
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
}

// Calculate K-Factor
export function calculateKFactor(refMass: number, mpfmMass: number): number {
  if (mpfmMass === 0) return 0
  return refMass / mpfmMass
}

// Normalize molar composition to 100%
export function normalizeMolarComposition(
  composition: { component: string; molPercent: number }[]
): { component: string; molPercent: number; normalizedMolPercent: number }[] {
  const total = composition.reduce((sum, c) => sum + c.molPercent, 0)
  return composition.map(c => ({
    ...c,
    normalizedMolPercent: total > 0 ? (c.molPercent / total) * 100 : 0,
  }))
}

// Generate event ID
export function generateEventId(
  meterTag: string,
  type: string,
  date: Date = new Date()
): string {
  const typeCode = type.substring(0, 3).toUpperCase()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `CAL-${meterTag.replace(/-/g, '_')}-${typeCode}-${month}-${year}`
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Sleep function for async operations
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Download file
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Parse CSV
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || ''
      return obj
    }, {} as Record<string, string>)
  })
}
