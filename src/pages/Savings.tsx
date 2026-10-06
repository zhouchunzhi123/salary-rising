import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, PiggyBank, Target, TrendingUp } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useRecords } from '@/hooks/useRecords'
import { useEarnings } from '@/hooks/useEarnings'
import { dailyPayFor } from '@/utils/salaryCalculator'
import { currencySymbol } from '@/utils/currencies'
import { dateKey, DAY_MS, parseDateKey, startOfDay } from '@/utils/time'
import { formatMoney } from '@/utils/format'

/**
 * 存钱计划页面。
 *
 * 已存金额 = 从「开启存钱计划那天」起到今天，所有工作日的累计收入：
 * - 历史日：取 localStorage 里的每日结算记录
 * - 今天：取实时快照的已赚金额（工作中持续增长）
 *
 * 还差 = max(0, 目标 - 已存)
 * 预计还需天数 = ceil(还差 / 每日工资)
 */
export default function SavingsPage() {
  const { settings } = useSettings()
  const { records } = useRecords()
  const { snapshot: snap } = useEarnings(settings)
  const cs = currencySymbol(settings.currency)
  const now = new Date()

  const goal = settings.savings.goal
  const startDate = settings.savings.startDate
  const todayKey = dateKey(now)

  // 从起始日到今天的已存总额
  const saved = useMemo(() => {
    if (!startDate) return 0
    const startMs = startOfDay(parseDateKey(startDate)).getTime()
    const todayMs = startOfDay(now).getTime()
    let total = 0
    for (const [key, rec] of Object.entries(records)) {
      const d = startOfDay(parseDateKey(key)).getTime()
      if (d >= startMs && d <= todayMs) {
        total += rec.earned
      }
    }
    // 今天用实时值覆盖记录（如果今天在范围内且在计薪）
    if (startDate && todayKey >= startDate) {
      const old = records[todayKey]?.earned ?? 0
      const live =
        snap.status === 'working' || snap.status === 'lunch'
          ? snap.earned
          : snap.status === 'after'
            ? snap.dailyPay
            : 0
      total += Math.max(live, old) - old
    }
    return Math.max(0, total)
  }, [records, startDate, todayKey, snap.earned, snap.dailyPay, snap.status, now])

  const remaining = Math.max(0, goal - saved)
  const dailyPay = useMemo(() => dailyPayFor(now, settings), [now, settings])
  const progress = goal > 0 ? Math.min(1, saved / goal) : 0

  const daysNeeded = dailyPay > 0 ? Math.ceil(remaining / dailyPay) : Infinity
  const targetDate = useMemo(() => {
    if (!Number.isFinite(daysNeeded) || daysNeeded <= 0) return null
    const d = new Date(now)
    d.setTime(d.getTime() + daysNeeded * DAY_MS)
    return d
  }, [daysNeeded, now])

  const canSave = settings.savings.enabled && goal > 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <PiggyBank size={22} className="text-primary" />
          存钱计划
        </h1>
        <p className="mt-0.5 text-xs text-faint">
          {startDate ? `自 ${startDate} 起开始攒钱` : '设定目标，从今天开始记录每一分进账。'}
        </p>
      </div>

      {!canSave ? (
        <div className="card space-y-4 p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface text-sub">
            <PiggyBank size={24} />
          </div>
          <div className="font-bold text-ink">还没开启存钱计划</div>
          <p className="text-sm text-faint">
            去「设置」里开启存钱计划，并设定一个目标金额，就能看到距离目标还差几天。
          </p>
          <Link to="/settings" className="btn-primary mx-auto">
            <Target size={17} />
            去设置存钱目标
          </Link>
        </div>
      ) : (
        <>
          {/* 目标进度大卡 */}
          <div className="card relative overflow-hidden p-6 text-center">
            <div className="text-xs font-medium text-faint">存钱目标</div>
            <div className="tnum my-1 font-display text-[clamp(2.2rem,10vw,4rem)] font-extrabold leading-none text-gradient-money">
              {cs}{formatMoney(goal)}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="chip tnum">
                <TrendingUp size={12} className="text-success" /> 已存 {cs}
                {formatMoney(saved)}
              </span>
              <span className="chip tnum">还差 {cs}{formatMoney(remaining)}</span>
            </div>

            <div className="mt-5">
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-primary/10">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                  style={{
                    width: `${progress * 100}%`,
                    backgroundImage:
                      'linear-gradient(90deg, hsl(var(--c-money)), hsl(var(--c-primary)))',
                  }}
                />
              </div>
              <div className="tnum mt-1.5 text-xs text-faint">
                进度 {(progress * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* 倒计时 */}
          <div className="card p-6 text-center">
            {remaining <= 0 ? (
              <>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success animate-float">
                  <Target size={28} />
                </div>
                <div className="mt-3 text-lg font-extrabold text-ink">目标已达成 🎉</div>
                <p className="mt-1 text-sm text-faint">
                  你已经存够了 {cs}
                  {formatMoney(goal)}，可以考虑设立下一个目标啦。
                </p>
              </>
            ) : dailyPay <= 0 ? (
              <div className="text-sm text-faint">
                当前工资配置无法计算每日收入，请先在设置中确认工资与作息。
              </div>
            ) : (
              <>
                <div className="text-xs font-medium text-faint">按照当前赚钱速度，距离目标还有</div>
                <div className="tnum my-1 font-display text-6xl font-extrabold leading-none text-primary">
                  {daysNeeded}
                </div>
                <div className="text-sm font-semibold text-sub">天</div>
                {targetDate && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-sub">
                    <Calendar size={13} />
                    预计 {targetDate.getFullYear()}年{targetDate.getMonth() + 1}月
                    {targetDate.getDate()}日 达成
                  </div>
                )}
                <div className="mt-4 text-[11px] leading-relaxed text-faint">
                  估算口径：每日工资 {cs}
                  {formatMoney(dailyPay)}（按当前工资与当月工作日折算），
                  还需存 {cs}
                  {formatMoney(remaining)} ÷ 每日工资 ≈ {daysNeeded} 个工作日。
                </div>
              </>
            )}
          </div>

          <Link to="/settings" className="btn-ghost w-full">
            <Target size={16} />
            修改存钱目标
          </Link>
        </>
      )}
    </div>
  )
}
