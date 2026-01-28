/**
 * Hook useKFactorTracker - MPFM Monitor
 * Facilita o uso do KFactorTracker em componentes React
 */

import { useCallback } from 'react'
import { 
  kFactorTracker, 
  type MeterKFactorStatus,
  type KFactorReading,
  type KFactorHistory 
} from '@/services/kFactorTracker'

export function useKFactorTracker() {
  const addReading = useCallback((
    meterId: string,
    meterTag: string,
    kOil: number,
    kGas: number,
    kWater: number,
    source: KFactorReading['source'] = 'calculated'
  ): KFactorReading => {
    return kFactorTracker.addReading(meterId, meterTag, kOil, kGas, kWater, source)
  }, [])

  const getConsecutiveDays = useCallback((meterId: string): number => {
    return kFactorTracker.getConsecutiveDaysOutOfRange(meterId)
  }, [])

  const needsCalibration = useCallback((meterId: string, lastCalibrationDate?: string) => {
    return kFactorTracker.needsCalibration(meterId, lastCalibrationDate)
  }, [])

  const getMeterStatus = useCallback((
    meterId: string,
    meterTag: string,
    meterName: string,
    currentKFactors: { oil: number; gas: number; water: number },
    lastCalibrationDate?: string
  ): MeterKFactorStatus => {
    return kFactorTracker.getMeterStatus(
      meterId,
      meterTag,
      meterName,
      currentKFactors,
      lastCalibrationDate
    )
  }, [])

  const getHistory = useCallback((meterId: string): KFactorHistory | undefined => {
    return kFactorTracker.getHistory(meterId)
  }, [])

  const recordCalibration = useCallback((
    meterId: string,
    kOil: number,
    kGas: number,
    kWater: number
  ): void => {
    kFactorTracker.recordCalibration(meterId, kOil, kGas, kWater)
  }, [])

  return {
    addReading,
    getConsecutiveDays,
    needsCalibration,
    getMeterStatus,
    getHistory,
    recordCalibration,
  }
}

export default useKFactorTracker
