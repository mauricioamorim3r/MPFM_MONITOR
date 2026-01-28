/**
 * Hook para inicializar a aplicação
 * Carrega apenas os medidores pré-configurados (sem dados de produção mockados)
 * Os dados de produção devem ser importados via PDF pelo usuário
 */

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { realMeters, realCalibrationPVT } from '@/data/realData'

export function useInitializeRealData() {
  const meters = useAppStore((state) => state.meters)
  const initialized = useRef(false)

  useEffect(() => {
    // Só executa uma vez
    if (initialized.current) return
    initialized.current = true

    // Inicializa medidores se estiver vazio
    if (meters.length === 0) {
      console.log('[MPFM] Inicializando medidores do FPSO Bacalhau...')
      realMeters.forEach((meter) => {
        // Usa set direto para não gerar alertas na inicialização
        useAppStore.setState((state) => ({
          meters: [...state.meters, { ...meter, id: `meter-${meter.tag}` }],
        }))
      })
    }

    // NÃO carrega dados de monitoramento mockados
    // O usuário deve importar os PDFs diariamente
    console.log('[MPFM] Inicialização concluída! Importe PDFs para popular dados de produção.')
  }, [meters.length])
}

// Dados de calibração PVT para uso no workflow
export function useCalibrationPVTData() {
  return realCalibrationPVT
}
