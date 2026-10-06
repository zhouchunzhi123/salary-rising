import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Coffee,
  Eye,
  Fish,
  Maximize2,
  Moon,
  PiggyBank,
  Play,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useEarnings } from '@/hooks/useEarnings'
import { useRecords } from '@/hooks/useRecords'
import { Money } from '@/components/Money'
import { ProgressBar } from '@/components/ProgressBar'
import { CoinRain } from '@/components/CoinRain'
import { ToastStack } from '@/components/ToastStack'
import { StatTile } from '@/components/StatTile'
import { ShareModal } from '@/components/ShareModal'
import { StealthSheet } from '@/components/StealthSheet'
import { aggregateStats } from '@/utils/earningsEngine'
import { buildTimeline } from '@/utils/workTimeCalculator'
import { SALARY_TYPE_LABELS } from '@/utils/salaryCalculator'
import {
  dateKey,
  formatChineseDuration,
  formatClockHM,
  formatHMS,
} from '@/utils/time'
import { currencySymbol } from '@/utils/currencies'
import { formatMoney } from '@/utils/format'

export default function EarningPage() {
  const { settings } = useSettings()
  const cs = currencySymbol(settings.currency)
  const navigate = useNavigate()
  const { snapshot: snap, milestone, setEarlyStart } = useEarnings(settings)
  const { records } = useRecords()
  const [slacking, setSlacking] = useState(false)
  const [stealth, setStealth] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const liveToday =
    snap.status === 'working' || snap.status === 'lunch'
      ? snap.earned
      : snap.status === 'after'
        ? snap.dailyPay
        : undefined
  const stats = useMemo(
    () => aggregateStats(records, snap.now, liveToday),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, dateKey(snap.now), snap.status, snap.earned, snap.dailyPay],
  )

  const timeline = useMemo(
    () => buildTimeline(snap.anchorDate, settings.schedule),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey(snap.anchorDate), settings.schedule],
  )
  const startLabel = timeline.segments.length
    ? formatClockHM(timeline.segments[0].start)
    : '--:--'
  const endLabel = timeline.segments.length
    ? formatClockHM(timeline.segments[timeline.segments.length - 1].end)
    : '--:--'

  if (!settings.onboarded) return <Navigate to="/settings" replace />

  const shareData = {
    typeLabel: SALARY_TYPE_LABELS[settings.salaryType],
    salary: settings.salary,
    earned: snap.earned,
    perSecond: snap.perSecond,
    symbol: cs,
    remainingLabel:
      snap.status === 'after'
        ? '已下班'
        : snap.status === 'rest'
          ? '今天不上班'
          : formatHMS(snap.clockRemainingSeconds),
  }

  return (
    <div className="space-y-4">
      {milestone && (
        <>
          <CoinRain />
          <ToastStack toasts={[{ id: 1, text: milestone.text }]} />
        </>
      )}

      {/* ---------- 配置异常 ---------- */}
      {snap.status === 'invalid' && (
        <div className="card space-y-4 p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-warning/10 text-warning">
            <AlertTriangle size={24} />
          </div>
          <div className="font-bold text-ink">作息配置有点问题</div>
          <p className="text-sm text-sub">{snap.invalidReason ?? '请检查工作时间设置'}</p>
          <Link to="/settings" className="btn-primary mx-auto">
            <SettingsIcon size={17} />
            去修改设置
          </Link>
        </div>
      )}

      {/* ---------- 周末休息 ---------- */}
      {snap.status === 'rest' && (
        <>
          <StatusHero
            icon={<Moon size={18} />}
            title="今天不上班"
            subtitle="工资虽不涨，但快乐在涨。好好休息。"
          />
          <div className="card animate-fade-up p-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-soft text-primary animate-float">
              <Moon size={30} />
            </div>
            <div className="mt-4 text-lg font-bold text-ink">休息日不谈工作</div>
            <p className="mt-1 text-sm text-faint">
              本周已经赚到 <span className="tnum font-bold text-money">{cs}{formatMoney(stats.week)}</span>
              ，犒劳一下自己吧。
            </p>
          </div>
          <RestStats stats={stats} />
          <RestActions />
        </>
      )}

      {/* ---------- 还没开工 ---------- */}
      {snap.status === 'before' && (
        <>
          <StatusHero
            icon={<Clock size={18} />}
            title="还没开工"
            subtitle="钱还没开始涨，做好准备。"
          />
          <div className="card animate-fade-up p-6 text-center">
            <div className="text-xs font-medium text-faint">距离赚钱还有</div>
            <div className="tnum my-2 font-display text-5xl font-extrabold leading-none text-gradient-money">
              {formatHMS(snap.nextEventSeconds)}
            </div>
            <div className="text-sm text-sub">
              {startLabel} 准时开工，今天预计能赚
            </div>
            <div className="tnum mt-1 text-xl font-bold text-ink">
              {cs}{formatMoney(snap.dailyPay)}
            </div>
          </div>
          <button onClick={setEarlyStart} className="btn-primary w-full py-4 text-base">
            <Play size={18} />
            提前开始（现在就开始计薪）
          </button>
          <p className="text-center text-[11px] text-faint">
            每秒工资 <span className="tnum">{cs}{formatMoney(snap.perSecond, 4)}</span>，设置以 {startLabel} 为正式上班时间
          </p>
        </>
      )}

      {/* ---------- 工作中 / 午休 ---------- */}
      {(snap.status === 'working' || snap.status === 'lunch') && (
        <>
          <StatusHero
            icon={snap.status === 'lunch' ? <Coffee size={18} /> : <TrendingUp size={18} />}
            title={snap.status === 'lunch' ? '午休时间' : '正在赚钱'}
            subtitle={
              snap.status === 'lunch' ? '休息一下，下午继续赚钱。' : '你的钱正在持续进账。'
            }
          />

          <div className="card animate-fade-up relative overflow-hidden p-6 text-center">
            <div className="text-xs font-medium text-faint">今天已经赚了</div>
            <div className="my-1 flex justify-center">
              <div className="min-w-[9em] text-center leading-none">
                <Money
                  value={snap.earned}
                  className="text-[clamp(3rem,14.5vw,6.2rem)]"
                />
              </div>
            </div>
            <div
              className={`badge mx-auto ${
                snap.status === 'lunch' ? 'badge-warning' : 'badge-success'
              }`}
            >
              <span className="badge-dot" />
              {snap.status === 'lunch'
                ? `午休暂停 · ${formatHMS(snap.nextEventSeconds)} 后继续`
                : `+${cs}${formatMoney(snap.perSecond, 4)} / 秒`}
            </div>
          </div>

          <div className="card space-y-3 p-5">
            <ProgressBar progress={snap.progress} />
            <div className="tnum flex justify-between text-[11px] text-faint">
              <span>{startLabel}</span>
              <span className="font-bold text-primary">{(snap.progress * 100).toFixed(1)}%</span>
              <span>{endLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl bg-surface p-3">
                <div className="flex items-center gap-1 text-[11px] text-faint">
                  <Clock size={12} /> 已工作
                </div>
                <div className="tnum mt-0.5 text-sm font-bold text-ink">
                  {formatChineseDuration(snap.clockElapsedSeconds)}
                </div>
              </div>
              <div className="rounded-2xl bg-surface p-3 text-right">
                <div className="text-[11px] text-faint">距离下班</div>
                <div className="tnum mt-0.5 text-sm font-bold text-ink">
                  {formatHMS(snap.clockRemainingSeconds, 1)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button className="btn-soft px-2" onClick={() => navigate('/fullscreen')}>
              <Maximize2 size={16} />
              全屏
            </button>
            <button className="btn-soft px-2" onClick={() => setShareOpen(true)}>
              <Share2 size={16} />
              分享
            </button>
            <button
              className="btn-soft px-2"
              onClick={() => setSlacking((v) => !v)}
              aria-expanded={slacking}
            >
              <Fish size={16} />
              摸鱼
            </button>
          </div>

          {slacking && (
            <section className="card animate-fade-up space-y-4 p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Fish size={16} className="text-primary" />
                  摸鱼模式
                </span>
                <button
                  onClick={() => setSlacking(false)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:bg-surface"
                  aria-label="收起摸鱼模式"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 rounded-2xl bg-surface p-4 text-sm text-sub">
                <p>
                  你今天已经认真工作了{' '}
                  <span className="font-bold text-ink">
                    {formatChineseDuration(snap.earnedSeconds)}
                  </span>{' '}
                  （不含午休）
                </p>
                <p>
                  工资已经累计：{' '}
                  <span className="tnum font-bold text-money">{cs}{formatMoney(snap.earned)}</span>
                </p>
              </div>
              <button
                onClick={() => setStealth(true)}
                className="btn w-full bg-danger text-white shadow-soft"
              >
                <Eye size={16} />
                老板来了，一键伪装
              </button>
            </section>
          )}
        </>
      )}

      {/* ---------- 下班结算 ---------- */}
      {snap.status === 'after' && (
        <>
          <StatusHero
            icon={<Sparkles size={18} />}
            title="今天打工结束"
            subtitle="辛苦啦，来看看今天的战果。"
          />
          <div className="card animate-fade-up p-7 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-success/10 text-success animate-float">
              <Sparkles size={30} />
            </div>
            <div className="mt-3 text-xs text-faint">今天赚到</div>
            <div className="my-1 flex justify-center">
              <div className="min-w-[9em] text-center leading-none">
                <Money value={snap.dailyPay} className="text-[clamp(2.8rem,13vw,5.6rem)]" />
              </div>
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <span className="chip">
                <Clock size={12} /> 工作 {formatChineseDuration(snap.totalSeconds)}
              </span>
              <span className="chip tnum">每秒 {cs}{formatMoney(snap.perSecond, 4)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={<CalendarDays size={14} />} label="本周累计" value={`${cs}${formatMoney(stats.week)}`} />
            <StatTile icon={<CalendarRange size={14} />} label="本月累计" value={`${cs}${formatMoney(stats.month)}`} />
            <StatTile icon={<Calendar size={14} />} label="今年累计" value={`${cs}${formatMoney(stats.year)}`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShareOpen(true)} className="btn-ghost">
              <Share2 size={16} />
              分享战果
            </button>
            <Link to="/history" className="btn-ghost">
              <BarChart3 size={16} />
              工资记录
            </Link>
          </div>
          <Link to="/" className="btn-primary w-full py-4 text-base">
            明天继续赚钱
            <ArrowRight size={18} />
          </Link>
        </>
      )}

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} data={shareData} />
      {stealth && <StealthSheet onClose={() => setStealth(false)} />}
    </div>
  )
}

function StatusHero({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="animate-fade-up text-center">
      <div className="inline-flex items-center gap-1.5 text-base font-extrabold text-ink">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="mt-1 text-xs text-faint">{subtitle}</div>
    </div>
  )
}

function RestStats({
  stats,
}: {
  stats: ReturnType<typeof aggregateStats>
}) {
  const { settings } = useSettings()
  const cs = currencySymbol(settings.currency)
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile icon={<Moon size={14} />} label="昨天赚到" value={`${cs}${formatMoney(stats.yesterday)}`} />
      <StatTile icon={<CalendarDays size={14} />} label="本周累计" value={`${cs}${formatMoney(stats.week)}`} />
      <StatTile icon={<CalendarRange size={14} />} label="本月累计" value={`${cs}${formatMoney(stats.month)}`} />
      <StatTile icon={<Calendar size={14} />} label="今年累计" value={`${cs}${formatMoney(stats.year)}`} />
    </div>
  )
}

function RestActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link to="/history" className="btn-ghost">
        <BarChart3 size={16} />
        工资记录
      </Link>
      <Link to="/savings" className="btn-ghost">
        <PiggyBank size={16} />
        存钱计划
      </Link>
    </div>
  )
}
