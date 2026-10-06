import { useEffect, useState } from 'react'
import type { ResolvedTheme, ThemeName } from '@/types'

function resolveTheme(theme: ThemeName): ResolvedTheme {
  if (theme !== 'system') return theme
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

/** 将设置中的主题应用到 <html data-theme>，并监听系统主题变化 */
export function useTheme(theme: ThemeName): ResolvedTheme {
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(theme))

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const r = resolveTheme(theme)
      root.setAttribute('data-theme', r)
      setResolved(r)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', THEME_COLOR[r])
    }
    apply()

    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      mql.addEventListener('change', apply)
      return () => mql.removeEventListener('change', apply)
    }
  }, [theme])

  return resolved
}

export const THEME_COLOR: Record<ResolvedTheme, string> = {
  pink: '#ff7aa8',
  light: '#5b5ce6',
  dark: '#f8649b',
  mint: '#25a56f',
  cyber: '#ff3dd8',
}

export const THEME_OPTIONS: { value: ThemeName; label: string; color: string }[] = [
  { value: 'system', label: '跟随系统', color: '#8b8b9b' },
  { value: 'pink', label: '少女粉', color: '#ff7aa8' },
  { value: 'light', label: '明亮', color: '#5b5ce6' },
  { value: 'dark', label: '深色', color: '#3a3a4a' },
  { value: 'mint', label: '治愈绿', color: '#25a56f' },
  { value: 'cyber', label: '赛博朋克', color: '#ff3dd8' },
]
