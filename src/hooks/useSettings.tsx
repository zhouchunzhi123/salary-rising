import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppSettings } from '@/types'
import { loadSettings, saveSettings } from '@/utils/storage'

interface SettingsContextValue {
  settings: AppSettings
  /** 合并更新设置并自动持久化 */
  updateSettings: (patch: Partial<AppSettings>) => void
  replaceSettings: (next: AppSettings) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const replaceSettings = useCallback((next: AppSettings) => {
    setSettings(next)
  }, [])

  const value = useMemo(
    () => ({ settings, updateSettings, replaceSettings }),
    [settings, updateSettings, replaceSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings 必须在 <SettingsProvider> 内使用')
  return ctx
}
