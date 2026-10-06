import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, Calendar, CalendarDays, CalendarRange, Clock, Moon, Trash2 } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useRecords } from '@/hooks/useRecords'
import { StatTile } from '@/components/StatTile'
import { SegmentedControl } from '@/components/form/SegmentedControl'
import { aggregateStats, getDaySnapshot, recentDailyRecords } from '@/utils/earningsEngine'
import { clearRecords } from '@/utils/storage'
import { currencySymbol } from '@/utils/currencies'
import { dateKey, pad2, WEEKDAY_LABELS } from '@/utils/time'
import { formatMoney } from '@/utils/format'

interface ChartDatum {
  label: string
  fullLabel: string
  earned: number
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDatum }> }) {
  const { settings } = useSettings()
  const cs = currencySymbol(settings.currency)
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border border-line/70 bg-card px-3 py-2 text-xs shadow-soft">
      <div className="font-semibold text-ink">{d.fullLabel}</div>
      <div className="tnum mt-0.5 font-bold text-money">{cs}{formatMoney(d.earned)}</div>
    </div>
  )
}

export default function HistoryPage() {
  const { settings } = useSettings()
  const cs = currencySymbol(settings.currency)
  const { records, refresh } = useRecords()
  const [range, setRange] = useState<'7' | '30'>('7')

  // 每秒刷新一次，让“今天”这根柱子在工作中也会涨
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const now = new Date()
  const todayKey = dateKey(now)
  const todaySnapshot = getDaySnapshot(now, settings)
  const liveToday =
    todaySnapshot.status === 'working' || todaySnapshot.status === 'lunch'
      ? todaySnapshot.earned
      : todaySnapshot.status === 'after'
        ? todaySnapshot.dailyPay
        : undefined

  const days = Number(range)
  const chartData: ChartDatum[] = useMemo(() => {
    return recentDailyRecords(records, now, days).map((r) => {
      const [y, m, d] = r.date.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const earned =
        r.date === todayKey && liveToday !== undefined
          ? Math.max(r.earned, liveToday)
          : r.earned
      return {
        label: `${pad2(m)}/${pad2(d)}`,
        fullLabel: `${y}年${m}月${d}日 ${WEEKDAY_LABELS[date.getDay()]}`,
        earned: Math.round(earned * 100) / 100,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, range, liveToday])

  const stats = useMemo(
    () => aggregateStats(records, now, liveToday),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, liveToday, todayKey],
  )

  const sortedList = useMemo(() => {
    const map = new Map(Object.entries(records))
    if (liveToday !== undefined) {
      const old = map.get(todayKey)
      map.set(todayKey, {
        date: todayKey,
        earned: Math.max(liveToday, old?.earned ?? 0),
        seconds: old?.seconds ?? 0,
        updatedAt: Date.now(),
      })
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30)
  }, [records, liveToday, todayKey])

  const handleClear = () => {
    if (window.confirm('确定清空全部工资记录吗？工资设置会保留，此操作不可恢复。')) {
      clearRecords()
      refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-extrabold">我的工资记录</h1>
          <p className="mt-0.5 text-xs text-faint">看着柱状图涨起来，也是一种治愈。</p>
        </div>
        {sortedList.length > 0 && (
          <button onClick={handleClear} className="btn-ghost px-3 py-2 text-xs text-danger" aria-label="清空记录">
            <Trash2 size={14} />
            清空
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={<Clock size={14} />} label="今天" value={`${cs}${formatMoney(stats.today)}`} />
        <StatTile icon={<Moon size={14} />} label="昨天" value={`${cs}${formatMoney(stats.yesterday)}`} />
        <StatTile icon={<CalendarDays size={14} />} label="本周" value={`${cs}${formatMoney(stats.week)}`} />
        <StatTile icon={<CalendarRange size={14} />} label="本月" value={`${cs}${formatMoney(stats.month)}`} />
        <StatTile icon={<Calendar size={14} />} label="今年" value={`${cs}${formatMoney(stats.year)}`} />
      </div>

      <section className="card space-y-3 p-4">
        <SegmentedControl
          size="sm"
          options={[
            { value: '7', label: '近 7 天' },
            { value: '30', label: '近 30 天' },
          ]}
          value={range}
          onChange={setRange}
        />
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--c-line))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--c-faint))' }}
                axisLine={{ stroke: 'hsl(var(--c-line))' }}
                tickLine={false}
                interval={days === 7 ? 0 : 4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--c-faint))' }}
                tickFormatter={(v: number) => (v >= 10000 ? `${v / 10000}万` : String(v))}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--c-primary) / 0.08)' }} />
              <Bar dataKey="earned" fill="hsl(var(--c-primary))" radius={[6, 6, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card divide-y divide-line/60">
        {sortedList.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <BarChart3 size={28} />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">还没有工资记录</p>
            <p className="mt-1 text-xs text-faint">完成一个工作日的计薪后，这里就会出现记录。</p>
            <Link to={settings.onboarded ? '/earn' : '/settings'} className="btn-primary mx-auto mt-4">
              {settings.onboarded ? '去赚钱' : '先设置工资'}
            </Link>
          </div>
        ) : (
          sortedList.map((r) => {
            const [y, m, d] = r.date.split('-').map(Number)
            const date = new Date(y, m - 1, d)
            const label =
              r.date === todayKey
                ? '今天'
                : (() => {
                    const yd = new Date(now)
                    yd.setDate(yd.getDate() - 1)
                    return r.date === dateKey(yd) ? '昨天' : WEEKDAY_LABELS[date.getDay()]
                  })()
            return (
              <div key={r.date} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {label}
                    {label === '今天' || label === '昨天' ? '' : ` ${m}/${d}`}
                  </div>
                  <div className="text-[11px] text-faint">{r.date}</div>
                </div>
                <div className="tnum text-sm font-bold text-money">{cs}{formatMoney(r.earned)}</div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
