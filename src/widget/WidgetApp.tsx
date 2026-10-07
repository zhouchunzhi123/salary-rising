/**
 * 桌面悬浮工资小组件 —— 100% 复用现有工资计算逻辑。
 *
 * 核心原则：「时间决定工资，而不是动画决定工资。」
 * 每次 rAF 都通过 new Date() 重新计算 getDaySnapshot，
 * 因此锁屏/睡眠/关闭后重新打开，金额永远正确。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { useEarnings } from '@/hooks/useEarnings'
import { useTheme } from '@/hooks/useTheme'
import { ProgressBar } from '@/components/ProgressBar'
import { formatMoney } from '@/utils/format'
import { currencySymbol } from '@/utils/currencies'
import { formatHMS } from '@/utils/time'
import {
  isTauri,
  startDraggingWidget,
  openMainWindow,
  snapWidgetToEdge,
  setWidgetAlwaysOnTop,
  resizeWidget,
  getWidgetState,
  restoreWidgetPosition,
  toggleWidgetWindow,
} from '@/utils/tauri'

const WIDGET_STORAGE_KEY = 'salary-rise:v1:widget-state'

interface WidgetState {
  x: number
  y: number
  width: number
  height: number
  alwaysOnTop: boolean
  opacity: number
  autoHide: boolean
  minimal: boolean
  sizePreset: 'small' | 'medium' | 'large'
}

const DEFAULT_WIDGET_STATE: WidgetState = {
  x: 0, y: 0,
  width: 300, height: 160,
  alwaysOnTop: true,
  opacity: 0.9,
  autoHide: false,
  minimal: false,
  sizePreset: 'medium',
}

const SIZE_PRESETS: Record<string, { w: number; h: number }> = {
  small: { w: 220, h: 100 },
  medium: { w: 300, h: 160 },
  large: { w: 400, h: 220 },
}

function loadWidgetState(): WidgetState {
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY)
    if (raw) return { ...DEFAULT_WIDGET_STATE, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_WIDGET_STATE
}

function saveWidgetState(state: Partial<WidgetState>) {
  try {
    const prev = loadWidgetState()
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify({ ...prev, ...state }))
  } catch { /* ignore */ }
}

export default function WidgetApp() {
  const { settings } = useSettings()
  useTheme(settings.theme)
  const cs = currencySymbol(settings.currency)
  const { snapshot: snap } = useEarnings(settings)

  const [state, setState] = useState<WidgetState>(loadWidgetState)
  const [hovered, setHovered] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // 菜单展开时临时放大窗口所需的原始尺寸备份
  const preMenuSizeRef = useRef<{ width: number; height: number } | null>(null)

  // ── 初始化：恢复窗口位置 / 尺寸 / 置顶 / 透明度 ──
  useEffect(() => {
    if (!isTauri) return
    const init = async () => {
      const s = loadWidgetState()
      // 如果已有保存的位置，恢复它
      if (s.x !== 0 || s.y !== 0) {
        await restoreWidgetPosition(s.x, s.y, s.width, s.height)
      } else {
        await resizeWidget(s.width, s.height)
      }
      await setWidgetAlwaysOnTop(s.alwaysOnTop)
    }
    init()
  }, [])

  // ── 透明度同步到 CSS ──
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--widget-opacity', String(state.opacity))
    }
  }, [state.opacity])

  // ── 自动隐藏：鼠标离开 5 秒后缩小 ──
  useEffect(() => {
    if (!state.autoHide) return
    let timer: ReturnType<typeof setTimeout>
    const onLeave = () => {
      timer = setTimeout(() => setHovered(false), 5000)
    }
    const onEnter = () => {
      clearTimeout(timer)
      setHovered(true)
    }
    const el = containerRef.current
    if (el) {
      el.addEventListener('mouseleave', onLeave)
      el.addEventListener('mouseenter', onEnter)
    }
    return () => {
      clearTimeout(timer)
      if (el) {
        el.removeEventListener('mouseleave', onLeave)
        el.removeEventListener('mouseenter', onEnter)
      }
    }
  }, [state.autoHide])

  // ── 拖动 ──
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isTauri) return
    // 只有点击非交互区域才启动拖动
    const target = e.target as HTMLElement
    if (target.closest('button, [data-no-drag]')) return
    dragRef.current = true
    setDragging(true)
    startDraggingWidget()
  }, [])

  const onPointerUp = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = false
      setDragging(false)
      snapWidgetToEdge()
      // 保存位置
      if (isTauri) {
        getWidgetState().then((s) => {
          if (s) saveWidgetState({ x: s.x, y: s.y })
        })
      }
    }
  }, [])

  // ── 右键菜单 ──
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // 备份当前窗口尺寸，菜单关闭时恢复
    if (isTauri) {
      preMenuSizeRef.current = { width: state.width, height: state.height }
    }
    setContextMenu({ x: e.clientX, y: e.clientY, show: true })
  }, [state.width, state.height])

  // 菜单渲染后，测量菜单并放大窗口以容纳完整菜单
  useEffect(() => {
    if (!contextMenu.show) return
    const fit = async () => {
      const el = menuRef.current
      if (!el || !isTauri) return
      // 等一帧让菜单布局完成
      await new Promise((r) => requestAnimationFrame(() => r(0)))
      const menuW = el.offsetWidth
      const menuH = el.offsetHeight
      const needW = Math.ceil(contextMenu.x + menuW + 12)
      const needH = Math.ceil(contextMenu.y + menuH + 12)
      const curW = state.width
      const curH = state.height
      if (needW > curW || needH > curH) {
        await resizeWidget(Math.max(curW, needW), Math.max(curH, needH))
      }
    }
    fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMenu.show])

  useEffect(() => {
    if (!contextMenu.show) return
    const hide = () => setContextMenu((p) => ({ ...p, show: false }))
    setTimeout(() => document.addEventListener('click', hide, { once: true }), 50)
    return () => {
      document.removeEventListener('click', hide)
      // 菜单关闭后恢复原始窗口尺寸
      if (isTauri && preMenuSizeRef.current) {
        const { width, height } = preMenuSizeRef.current
        preMenuSizeRef.current = null
        resizeWidget(width, height).catch(() => {})
      }
    }
  }, [contextMenu.show])

  // ── 双击打开主窗口 ──
  const onDoubleClick = useCallback(() => {
    if (isTauri) openMainWindow()
  }, [])

  // ── 切换设置（使用函数式更新避免 useCallback 闭包过期） ──
  const toggleAlwaysOnTop = useCallback(() => {
    setState((p) => {
      const next = !p.alwaysOnTop
      saveWidgetState({ alwaysOnTop: next })
      if (isTauri) setWidgetAlwaysOnTop(next)
      return { ...p, alwaysOnTop: next }
    })
  }, [])

  const toggleAutoHide = useCallback(() => {
    setState((p) => {
      const next = !p.autoHide
      saveWidgetState({ autoHide: next })
      return { ...p, autoHide: next }
    })
  }, [])

  const toggleMinimal = useCallback(() => {
    setState((p) => {
      const next = !p.minimal
      saveWidgetState({ minimal: next })
      return { ...p, minimal: next }
    })
  }, [])

  const setOpacity = useCallback((opacity: number) => {
    setState((p) => ({ ...p, opacity }))
    saveWidgetState({ opacity })
  }, [])

  const setSize = useCallback((preset: 'small' | 'medium' | 'large') => {
    const size = SIZE_PRESETS[preset]
    setState((p) => ({ ...p, sizePreset: preset, width: size.w, height: size.h }))
    saveWidgetState({ sizePreset: preset, width: size.w, height: size.h })
    if (isTauri) resizeWidget(size.w, size.h)
    // 若在右键菜单中切换尺寸，更新备份尺寸，避免菜单关闭时恢复成旧尺寸
    if (preMenuSizeRef.current) {
      preMenuSizeRef.current = { width: size.w, height: size.h }
    }
  }, [])

  // ── 渲染 ──
  const isCollapsed = state.autoHide && !hovered && !dragging && !contextMenu.show

  const content = useMemo(() => {
    if (state.minimal) {
      return (
        <div className="flex flex-col items-center justify-center gap-0.5 relative w-full h-full">
          <div className="tnum font-display text-xl font-extrabold text-gradient-money leading-none">
            {cs}{formatMoney(snap.earned)}
          </div>
          {snap.status === 'working' && (
            <div className="tnum text-[10px] text-faint leading-none">
              +{cs}{formatMoney(snap.perSecond, 4)}/s
            </div>
          )}
          <button
            onClick={toggleMinimal}
            className="absolute top-1 right-1 grid h-4 w-4 place-items-center rounded text-[10px] text-faint hover:text-sub transition-colors"
            title="退出极简模式"
            data-no-drag
          >
            ✕
          </button>
        </div>
      )
    }

    if (isCollapsed) {
      return (
        <div className="flex items-center justify-center">
          <div className="tnum font-display text-2xl font-extrabold text-gradient-money leading-none">
            {cs}{formatMoney(snap.earned)}
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-1.5">
        {/* 标题栏（可拖动区域） */}
        <div className="flex items-center justify-between select-none" data-no-drag>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-sub">
            <span>💰</span>
            <span>我的工资在涨</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleAlwaysOnTop}
              className={`grid h-5 w-5 place-items-center rounded-md text-[10px] transition-colors ${state.alwaysOnTop ? 'bg-primary-soft text-primary' : 'text-faint hover:text-sub'}`}
              title={state.alwaysOnTop ? '取消置顶' : '始终置顶'}
            >
              📌
            </button>
            <button
              onClick={toggleMinimal}
              className={`grid h-5 w-5 place-items-center rounded-md text-[10px] transition-colors ${state.minimal ? 'bg-primary-soft text-primary' : 'text-faint hover:text-sub'}`}
              title="极简模式"
            >
              ⬜
            </button>
            <button
              onClick={() => { if (isTauri) openMainWindow() }}
              className="grid h-5 w-5 place-items-center rounded-md text-[10px] text-faint hover:text-sub transition-colors"
              title="打开主窗口"
            >
              🔗
            </button>
          </div>
        </div>

        {/* 金额 */}
        <div className="flex flex-col items-center justify-center gap-0.5">
          <div className="tnum font-display text-3xl font-extrabold text-gradient-money leading-none">
            {cs}{formatMoney(snap.earned)}
          </div>
          {snap.status === 'working' && (
            <div className="badge badge-success text-[10px] py-0.5 px-2">
              <span className="badge-dot" />
              +{cs}{formatMoney(snap.perSecond, 4)} / 秒
            </div>
          )}
          {snap.status === 'lunch' && (
            <div className="badge badge-warning text-[10px] py-0.5 px-2">
              <span className="badge-dot" />
              午休中
            </div>
          )}
          {snap.status === 'before' && (
            <div className="text-[10px] text-faint">
              距离开工 {formatHMS(snap.nextEventSeconds)}
            </div>
          )}
          {snap.status === 'after' && (
            <div className="text-[10px] text-faint">已下班</div>
          )}
          {snap.status === 'rest' && (
            <div className="text-[10px] text-faint">今天不上班</div>
          )}
        </div>

        {/* 进度条 */}
        {snap.status === 'working' || snap.status === 'lunch' ? (
          <div className="space-y-1">
            <ProgressBar progress={snap.progress} className="h-1.5" shimmer={false} />
            <div className="flex justify-between text-[10px] text-faint tnum">
              <span>距离下班</span>
              <span>{formatHMS(snap.clockRemainingSeconds, 0)}</span>
            </div>
          </div>
        ) : null}
      </div>
    )
  }, [state, snap, cs, isCollapsed, toggleAlwaysOnTop, toggleMinimal])

  return (
    <div
      ref={containerRef}
      className="widget-root"
      style={{
        opacity: state.opacity,
        '--widget-opacity': state.opacity,
      } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => { if (state.autoHide) setHovered(true) }}
      onMouseLeave={() => { if (state.autoHide) setHovered(false) }}
    >
      <div className={`widget-card ${isCollapsed ? 'widget-collapsed' : ''}`}>
        {content}
      </div>

      {/* 右键菜单 */}
      {contextMenu.show && (
        <div
          ref={menuRef}
          className="widget-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          data-no-drag
        >
          <button onClick={toggleAlwaysOnTop}>
            {state.alwaysOnTop ? '📌 取消置顶' : '📌 始终置顶'}
          </button>
          <button onClick={toggleMinimal}>
            {state.minimal ? '⬜ 退出极简' : '⬜ 极简模式'}
          </button>
          <button onClick={toggleAutoHide}>
            {state.autoHide ? '👁 取消自动隐藏' : '👁 自动隐藏'}
          </button>
          <div className="widget-divider" />
          <div className="widget-menu-group">
            <span className="text-faint text-[10px] px-2">透明度</span>
            {[0.3, 0.5, 0.7, 0.9, 1].map((v) => (
              <button key={v} onClick={() => setOpacity(v)} className={state.opacity === v ? 'active' : ''}>
                {Math.round(v * 100)}%
              </button>
            ))}
          </div>
          <div className="widget-divider" />
          <div className="widget-menu-group">
            <span className="text-faint text-[10px] px-2">尺寸</span>
            {(['small', 'medium', 'large'] as const).map((preset) => (
              <button key={preset} onClick={() => setSize(preset)} className={state.sizePreset === preset ? 'active' : ''}>
                {preset === 'small' ? '小' : preset === 'medium' ? '中' : '大'}
              </button>
            ))}
          </div>
          <div className="widget-divider" />
          <button onClick={() => { if (isTauri) openMainWindow() }}>🔗 打开主窗口</button>
          <button onClick={() => { if (isTauri) toggleWidgetWindow() }}>❌ 退出小组件</button>
        </div>
      )}
    </div>
  )
}
