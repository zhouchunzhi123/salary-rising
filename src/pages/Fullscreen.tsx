import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronLeft, Coffee, Clock, Maximize, Moon, TrendingUp } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useEarnings } from '@/hooks/useEarnings'
import { Money } from '@/components/Money'
import { ProgressBar } from '@/components/ProgressBar'
import { buildTimeline } from '@/utils/workTimeCalculator'
import { currencySymbol } from '@/utils/currencies'
import { dateKey, formatClockHM, formatHMS } from '@/utils/time'
import { formatMoney } from '@/utils/format'

/** 沉浸式全屏赚钱页：隐藏所有菜单，适合第二块显示器 / 手机放桌面 */
export default function FullscreenPage() {
  const { settings } = useSettings()
  const cs = currencySymbol(settings.currency)
  const { snapshot: snap } = useEarnings(settings)
  const [entered, setEntered] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)

  // 进入页面后自动隐藏顶部控制条；点击屏幕可唤出
  useEffect(() => {
    if (!controlsVisible) return
    const id = window.setTimeout(() => setControlsVisible(false), 3000)
    return () => window.clearTimeout(id)
  }, [controlsVisible])

  /**
   * 进入沉浸式全屏。
   * 关键：先 setEntered(true) 收起引导层，再发全屏请求（fire-and-forget）。
   * 不能 await requestFullscreen —— 在 iframe / 受限环境下其 Promise 可能挂起，
   * 导致引导层永远不消失。
   */
  const enterFullscreen = useCallback(() => {
    setEntered(true)
    setControlsVisible(false)
    const el = document.documentElement
    if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => {
        /* 浏览器禁止全屏时静默降级为沉浸式页面 */
      })
    }
  }, [])

  const timeline = useMemo(
    () => buildTimeline(snap.anchorDate, settings.schedule),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey(snap.anchorDate), settings.schedule],
  )

  if (!settings.onboarded) return <Navigate to="/settings" replace />

  const counting = snap.status === 'working' || snap.status === 'lunch'
  const startLabel = timeline.segments.length
    ? formatClockHM(timeline.segments[0].start)
    : '--:--'
  const endLabel = timeline.segments.length
    ? formatClockHM(timeline.segments[timeline.segments.length - 1].end)
    : '--:--'

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden px-6 py-10"
      onClick={() => setControlsVisible((v) => !v)}
    >
      {/* 顶部控制（点击屏幕唤起） */}
      <div
        className={`flex w-full max-w-2xl items-center justify-between transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (document.fullscreenElement) void document.exitFullscreen()
            history.back()
          }}
          className="btn-ghost px-3 py-2"
          aria-label="返回"
        >
          <ChevronLeft size={18} />
          返回
        </button>
        <span className="text-sm font-bold text-sub">我的工资正在涨</span>
      </div>

      {/* 中央金额 */}
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        {counting || snap.status === 'after' ? (
          <>
            <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-faint">
              {snap.status === 'lunch' ? (
                <><Coffee size={13} className="text-warning" /> 午休中</>
              ) : snap.status === 'after' ? (
                <><TrendingUp size={13} className="text-primary" /> 今日结算</>
              ) : (
                <><TrendingUp size={13} className="text-success" /> 赚钱中</>
              )}
            </div>
            <div className="text-xs font-medium text-faint">今天已经赚了</div>
            <div className="min-w-[10em] text-center leading-none">
              <Money
                value={snap.status === 'after' ? snap.dailyPay : snap.earned}
                className="text-[clamp(3.5rem,18vw,10rem)] leading-none"
              />
            </div>
            <div className="tnum mt-5 text-base font-bold text-success">
              {snap.status === 'lunch'
                ? `午休暂停 · ${formatHMS(snap.nextEventSeconds)} 后继续`
                : snap.status === 'after'
                  ? `每秒 ${cs}${formatMoney(snap.perSecond, 4)}`
                  : `+${cs}${formatMoney(snap.perSecond, 4)} / 秒`}
            </div>
          </>
        ) : (
          <>
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary-soft text-primary animate-float">
              {snap.status === 'rest' ? <Moon size={40} /> : <Clock size={40} />}
            </div>
            <div className="mt-4 text-2xl font-extrabold text-ink">
              {snap.status === 'rest' ? '今天不上班' : '还没开工'}
            </div>
            <div className="tnum mt-2 text-lg font-bold text-money">
              {snap.status === 'before' ? formatHMS(snap.nextEventSeconds) : '好好休息'}
            </div>
          </>
        )}
      </div>

      {/* 底部进度 */}
      <div className="w-full max-w-2xl space-y-2">
        <ProgressBar progress={snap.progress} />
        <div className="tnum flex items-center justify-between text-sm font-semibold text-sub">
          <span>{startLabel}</span>
          <span className="text-base text-primary">
            {counting ? `距下班 ${formatHMS(snap.clockRemainingSeconds, 1)}` : `${(snap.progress * 100).toFixed(0)}%`}
          </span>
          <span>{endLabel}</span>
        </div>
      </div>

      {/* 首次进入引导 */}
      {!entered && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-bg/85 px-6 backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-soft text-primary">
              <Maximize size={32} />
            </div>
            <div className="mt-3 text-xl font-extrabold text-ink">进入全屏赚钱模式</div>
            <p className="mt-1 max-w-xs text-sm text-faint">
              隐藏所有菜单，只剩持续增长的工资。适合电脑副屏、手机放桌面。
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              void enterFullscreen()
            }}
            className="btn-primary px-7 py-4 text-base"
          >
            <Maximize size={18} />
            进入全屏
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEntered(true)
            }}
            className="text-xs text-faint underline-offset-2 hover:underline"
          >
            暂不全屏，先沉浸式看看
          </button>
        </div>
      )}
    </div>
  )
}
