import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronRight, Monitor, PiggyBank } from 'lucide-react'
import type { Currency, SalaryType, WorkSchedule } from '@/types'
import { useSettings } from '@/hooks/useSettings'
import { SegmentedControl } from '@/components/form/SegmentedControl'
import { Toggle } from '@/components/form/Toggle'
import { WeekdayPicker } from '@/components/form/WeekdayPicker'
import { validateSchedule } from '@/utils/workTimeCalculator'
import { dailyPayFor, perSecondRateFor } from '@/utils/salaryCalculator'
import { CURRENCY_LIST, currencySymbol } from '@/utils/currencies'
import { sanitizeMoneyInput } from '@/utils/input'
import { dateKey } from '@/utils/time'
import { formatMoney } from '@/utils/format'
import { cn } from '@/utils/cn'
import { isTauri, toggleWidgetWindow, enableAutostart, disableAutostart, isAutostartEnabled } from '@/utils/tauri'

const SALARY_OPTIONS: { value: SalaryType; label: string }[] = [
  { value: 'monthly', label: '月薪' },
  { value: 'yearly', label: '年薪' },
  { value: 'daily', label: '日薪' },
  { value: 'hourly', label: '时薪' },
]

/** 不同工资类型下的快捷金额，量级与该类型匹配 */
const QUICK_SALARIES: Record<SalaryType, number[]> = {
  monthly: [8000, 15000, 20000, 30000],
  yearly: [120000, 180000, 240000, 360000],
  daily: [300, 600, 900, 1200],
  hourly: [50, 100, 150, 200],
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const navigate = useNavigate()

  const [salaryType, setSalaryType] = useState<SalaryType>(settings.salaryType)
  const [currency, setCurrency] = useState<Currency>(settings.currency)
  const [salaryText, setSalaryText] = useState(
    settings.salary > 0 ? String(settings.salary) : '',
  )
  const [sched, setSched] = useState<WorkSchedule>(() => ({ ...settings.schedule }))
  const [savingsEnabled, setSavingsEnabled] = useState(settings.savings.enabled)
  const [savingsGoalText, setSavingsGoalText] = useState(
    settings.savings.goal > 0 ? String(settings.savings.goal) : '',
  )
  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [widgetError, setWidgetError] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  // 读取开机启动状态（仅在 Tauri 环境）
  useMemo(() => {
    if (isTauri) {
      isAutostartEnabled().then(setAutostartEnabled).catch(() => {})
    }
  }, [])

  const patchSched = (patch: Partial<WorkSchedule>) =>
    setSched((prev) => ({ ...prev, ...patch }))

  /** 实时预览秒薪（配置非法时静默不展示） */
  const preview = useMemo(() => {
    const salary = Number(salaryText)
    if (!Number.isFinite(salary) || salary <= 0) return null
    const candidate = { salaryType, salary, schedule: sched }
    if (validateSchedule(sched).length > 0) return null
    try {
      const perSecond = perSecondRateFor(new Date(), candidate)
      const daily = dailyPayFor(new Date(), candidate)
      if (!Number.isFinite(perSecond) || perSecond <= 0) return null
      return { perSecond, daily }
    } catch {
      return null
    }
  }, [salaryText, salaryType, sched])

  const handleSubmit = () => {
    const nextErrors: string[] = []
    const trimmed = salaryText.trim()

    if (!trimmed) {
      nextErrors.push('工资不能为空，填了它才会涨呀～')
    } else {
      const salary = Number(trimmed)
      if (!Number.isFinite(salary)) nextErrors.push('工资需要是数字')
      else if (salary <= 0) nextErrors.push('工资必须大于 0，打白工的事我们不干')
      else if (salary > 1_000_000_000) nextErrors.push('这个工资数字大得有点离谱了，认真一点嘛～')
    }

    nextErrors.push(...validateSchedule(sched).map((i) => i.message))

    // 存钱计划校验（仅开启时必填）
    let savingsGoal = 0
    let savingsStartDate = settings.savings.startDate
    if (savingsEnabled) {
      const g = Number(savingsGoalText.trim())
      if (!savingsGoalText.trim()) nextErrors.push('开启了存钱计划，目标金额要填一下哦')
      else if (!Number.isFinite(g) || g <= 0) nextErrors.push('存钱目标必须大于 0')
      else {
        savingsGoal = g
        // 首次开启或重新开启时，把今天设为存钱起始日
        if (!savingsStartDate || !settings.savings.enabled) {
          savingsStartDate = dateKey(new Date())
        }
      }
    } else {
      // 关闭时清空起始日
      savingsStartDate = ''
    }

    setErrors(nextErrors)
    if (nextErrors.length > 0) {
      document.getElementById('settings-errors')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    updateSettings({
      salaryType,
      salary: Number(trimmed),
      currency,
      schedule: sched,
      savings: { enabled: savingsEnabled, goal: savingsGoal, startDate: savingsStartDate },
      onboarded: true,
    })
    navigate('/earn')
  }

  const inputByType =
    salaryType === 'hourly'
      ? '/ 小时'
      : salaryType === 'daily'
        ? '/ 天'
        : salaryType === 'yearly'
          ? '/ 年'
          : '/ 月'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">设置我的工资</h1>
        <p className="mt-0.5 text-xs text-faint">三步搞定，之后随时可以改。</p>
      </div>

      {/* 工资 */}
      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-contrast">1</span>
          我的工资
        </div>
        <SegmentedControl options={SALARY_OPTIONS} value={salaryType} onChange={setSalaryType} />

        <div className="input flex h-16 items-center gap-2 overflow-hidden p-0">
          <span className="shrink-0 pl-4 text-xl font-bold text-primary">
            {currencySymbol(currency)}
          </span>
          <input
            className="min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none placeholder:text-faint"
            inputMode="decimal"
            placeholder={String(QUICK_SALARIES[salaryType][1])}
            value={salaryText}
            onChange={(e) => setSalaryText(sanitizeMoneyInput(e.target.value))}
          />
          <span className="shrink-0 pr-4 text-xs text-faint">
            {inputByType}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_SALARIES[salaryType].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSalaryText(String(v))}
              className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-primary-soft hover:text-primary"
            >
              {currencySymbol(currency)}{v.toLocaleString('zh-CN')}
            </button>
          ))}
        </div>

        {/* 货币选择 */}
        <div>
          <div className="mb-2 text-xs text-faint">货币</div>
          <div className="flex flex-wrap gap-2">
            {CURRENCY_LIST.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setCurrency(c.code)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                  currency === c.code
                    ? 'border-primary bg-primary text-primary-contrast shadow-soft'
                    : 'border-line/70 bg-card text-sub hover:border-primary/40 hover:text-ink',
                )}
              >
                <span className="mr-1">{c.symbol}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 工作时间 */}
      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-contrast">2</span>
          工作时间
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs text-faint">上班时间</span>
            <input
              type="time"
              className="input tnum"
              value={sched.startTime}
              onChange={(e) => patchSched({ startTime: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-faint">下班时间</span>
            <input
              type="time"
              className="input tnum"
              value={sched.endTime}
              onChange={(e) => patchSched({ endTime: e.target.value })}
            />
          </label>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
          <div>
            <div className="text-sm font-semibold">跨午夜下班（夜班）</div>
            <div className="text-[11px] text-faint">比如 22:00 上班、次日 06:00 下班</div>
          </div>
          <Toggle
            checked={sched.overnight}
            onChange={(v) => patchSched({ overnight: v })}
            label="跨午夜下班"
          />
        </div>

        <div className="rounded-2xl border border-line/70 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">午休时间</div>
            <Toggle
              checked={sched.lunchEnabled}
              onChange={(v) => patchSched({ lunchEnabled: v })}
              label="启用午休"
            />
          </div>
          {sched.lunchEnabled && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                type="time"
                className="input tnum"
                value={sched.lunchStart}
                onChange={(e) => patchSched({ lunchStart: e.target.value })}
              />
              <input
                type="time"
                className="input tnum"
                value={sched.lunchEnd}
                onChange={(e) => patchSched({ lunchEnd: e.target.value })}
              />
            </div>
          )}
          <p className="mt-2 text-[11px] text-faint">午休时段工资暂停增长（不计时薪）。</p>
        </div>
      </section>

      {/* 工作日 */}
      <section className="card space-y-3 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-contrast">3</span>
          工作日
        </div>
        <WeekdayPicker value={sched.workdays} onChange={(days) => patchSched({ workdays: days })} />
        <p className="text-[11px] text-faint">
          月薪会按当月实际工作日数折算日薪，绝不是简单除以 30 天。
        </p>
      </section>

      {/* 存钱计划 */}
      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-contrast">4</span>
          <PiggyBank size={16} className="text-primary" />
          存钱计划
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
          <div>
            <div className="text-sm font-semibold">开启存钱计划</div>
            <div className="text-[11px] text-faint">设定目标金额，看距离目标还差几天</div>
          </div>
          <Toggle checked={savingsEnabled} onChange={setSavingsEnabled} label="开启存钱计划" />
        </div>
        {savingsEnabled && (
          <div>
            <label className="mb-1.5 block text-xs text-faint" htmlFor="savings-goal">
              想存多少钱
            </label>
            <div className="input flex h-14 items-center gap-2 overflow-hidden p-0">
              <span className="shrink-0 pl-4 text-lg font-bold text-primary">
                {currencySymbol(currency)}
              </span>
              <input
                id="savings-goal"
                className="min-w-0 flex-1 bg-transparent text-xl font-bold outline-none placeholder:text-faint"
                inputMode="decimal"
                placeholder="50000"
                value={savingsGoalText}
                onChange={(e) => setSavingsGoalText(sanitizeMoneyInput(e.target.value))}
              />
            </div>
            <p className="mt-2 text-[11px] text-faint">
              开启后，底部导航的「会议」会变成「存钱」，可查看目标进度与倒计时天数。
            </p>
          </div>
        )}
      </section>

      {/* Windows 桌面小组件 */}
      {isTauri && (
        <section className="card space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-contrast">5</span>
            <Monitor size={16} className="text-primary" />
            Windows 桌面小组件
          </div>
          <p className="text-xs text-faint">
            把实时工资显示变成一个桌面悬浮小窗口，长期放在屏幕边缘，随时看到自己的工资在涨。
          </p>
          <button
            type="button"
            onClick={async () => {
              setWidgetError(null)
              try {
                await toggleWidgetWindow()
              } catch (e) {
                setWidgetError(e instanceof Error ? e.message : String(e))
              }
            }}
            className="btn-soft w-full py-3 text-sm"
          >
            <Monitor size={16} />
            打开桌面小组件
          </button>
          {widgetError && (
            <div className="flex items-start gap-2 rounded-xl bg-danger/5 px-3 py-2 text-xs text-danger">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{widgetError}</span>
            </div>
          )}
          <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
            <div>
              <div className="text-sm font-semibold">开机自动启动</div>
              <div className="text-[11px] text-faint">Windows 启动时自动运行</div>
            </div>
            <Toggle
              checked={autostartEnabled}
              onChange={(v) => {
                setAutostartEnabled(v)
                if (v) enableAutostart().catch(() => {})
                else disableAutostart().catch(() => {})
              }}
              label="开机自动启动"
            />
          </div>
        </section>
      )}

      {/* 错误提示 */}
      {errors.length > 0 && (
        <div id="settings-errors" className="card space-y-2 border-danger/30 bg-danger/5 p-4">
          {errors.map((msg) => (
            <div key={msg} className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* 实时预览 */}
      <div
        className={cn(
          'card flex items-center justify-between p-4 text-sm transition-opacity',
          preview ? 'opacity-100' : 'opacity-40',
        )}
      >
        <div>
          <div className="text-xs text-faint">按此设置</div>
          <div className="font-semibold">
            每秒约赚 <span className="text-money">{currencySymbol(currency)}{formatMoney(preview?.perSecond ?? 0, 4)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-faint">一个工作日</div>
          <div className="tnum font-semibold">{currencySymbol(currency)}{formatMoney(preview?.daily ?? 0)}</div>
        </div>
      </div>

      <button type="button" onClick={handleSubmit} className="btn-primary w-full py-4 text-base">
        开始赚钱
        <ChevronRight size={19} />
      </button>

      {/* 联系作者 */}
      <section className="card p-5 text-center">
        <div className="text-sm font-bold text-ink">联系作者</div>
        <p className="mt-1 text-xs text-faint">
          使用中遇到问题、有新想法或建议，欢迎扫码加我微信
        </p>
        <img
          src={`${import.meta.env.BASE_URL}wechat-qr.jpg`}
          alt="作者微信二维码"
          className="mx-auto mt-4 w-48 max-w-full rounded-2xl border border-line/70"
          loading="lazy"
        />
        <div className="mt-3 text-xs font-semibold text-sub">微信：夏天</div>
        <p className="mt-1 text-[11px] text-faint">
          备注「工资跳动」，我会尽快回复你
        </p>
      </section>
    </div>
  )
}
