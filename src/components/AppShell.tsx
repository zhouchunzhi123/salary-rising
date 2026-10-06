import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, Palette, PiggyBank, Settings as SettingsIcon, TrendingUp } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useTheme, THEME_OPTIONS } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'

const NAV_ITEMS = [
  { to: '/earn', label: '赚钱', icon: TrendingUp },
  { to: '/history', label: '记录', icon: BarChart3 },
  { to: '/savings', label: '存钱', icon: PiggyBank },
  { to: '/settings', label: '设置', icon: SettingsIcon },
]

export function AppShell() {
  const { settings, updateSettings } = useSettings()
  useTheme(settings.theme)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/50 bg-bg/75 backdrop-blur-xl safe-top">
        <div className="mx-auto flex h-14 max-w-xl md:max-w-2xl lg:max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="工资跳动" className="h-8 w-8 rounded-xl shadow-glow" />
            <span className="text-[15px] font-bold tracking-tight text-gradient-money font-display">工资跳动</span>
          </Link>
          <div className="relative">
            <button
              type="button"
              aria-label="切换主题"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-xl text-sub transition-colors hover:bg-surface hover:text-ink"
            >
              <Palette size={19} />
            </button>
            {menuOpen && (
              <>
                <button
                  aria-label="关闭主题菜单"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="animate-pop-in absolute right-0 top-11 z-50 w-40 overflow-hidden rounded-2xl border border-line/60 bg-card p-1.5 shadow-soft">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        updateSettings({ theme: opt.value })
                        setMenuOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                        settings.theme === opt.value
                          ? 'bg-primary-soft font-semibold text-primary'
                          : 'text-sub hover:bg-surface',
                      )}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: opt.color }}
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl md:max-w-2xl lg:max-w-3xl px-4 pb-28 pt-5">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/50 bg-card/90 backdrop-blur-xl safe-bottom">
        <div className="mx-auto grid max-w-xl md:max-w-2xl lg:max-w-3xl grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.to)
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'group relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-faint hover:text-sub',
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 h-1 w-8 rounded-full transition-all duration-300',
                    active ? 'bg-primary opacity-100 scale-100' : 'bg-primary opacity-0 scale-50',
                  )}
                />
                <Icon
                  size={21}
                  strokeWidth={active ? 2.6 : 2}
                  className={cn('transition-transform duration-200', active && 'scale-105')}
                />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
