/**
 * Serviço de armazenamento local para persistência de dados
 */

const STORAGE_KEYS = {
  METERS: 'mpfm_meters',
  MONITORING_DATA: 'mpfm_monitoring_data',
  CALIBRATION_EVENTS: 'mpfm_calibration_events',
  ALERTS: 'mpfm_alerts',
  USER_SETTINGS: 'mpfm_user_settings',
} as const

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

// Generic storage functions
export function getStorageItem<T>(key: StorageKey, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error)
    return defaultValue
  }
}

export function setStorageItem<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error)
  }
}

export function removeStorageItem(key: StorageKey): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error)
  }
}

// Specific storage functions
export const storage = {
  meters: {
    get: <T>(defaultValue: T) => getStorageItem(STORAGE_KEYS.METERS, defaultValue),
    set: <T>(value: T) => setStorageItem(STORAGE_KEYS.METERS, value),
    clear: () => removeStorageItem(STORAGE_KEYS.METERS),
  },
  monitoringData: {
    get: <T>(defaultValue: T) => getStorageItem(STORAGE_KEYS.MONITORING_DATA, defaultValue),
    set: <T>(value: T) => setStorageItem(STORAGE_KEYS.MONITORING_DATA, value),
    clear: () => removeStorageItem(STORAGE_KEYS.MONITORING_DATA),
  },
  calibrationEvents: {
    get: <T>(defaultValue: T) => getStorageItem(STORAGE_KEYS.CALIBRATION_EVENTS, defaultValue),
    set: <T>(value: T) => setStorageItem(STORAGE_KEYS.CALIBRATION_EVENTS, value),
    clear: () => removeStorageItem(STORAGE_KEYS.CALIBRATION_EVENTS),
  },
  alerts: {
    get: <T>(defaultValue: T) => getStorageItem(STORAGE_KEYS.ALERTS, defaultValue),
    set: <T>(value: T) => setStorageItem(STORAGE_KEYS.ALERTS, value),
    clear: () => removeStorageItem(STORAGE_KEYS.ALERTS),
  },
  userSettings: {
    get: <T>(defaultValue: T) => getStorageItem(STORAGE_KEYS.USER_SETTINGS, defaultValue),
    set: <T>(value: T) => setStorageItem(STORAGE_KEYS.USER_SETTINGS, value),
    clear: () => removeStorageItem(STORAGE_KEYS.USER_SETTINGS),
  },
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })
  },
}

export { STORAGE_KEYS }
