import { describe, expect, it } from 'vitest'
import type { SalarySettings } from '@/types'
import { dailyPayFor, perSecondRateFor } from '@/utils/salaryCalculator'
import { DEFAULT_SCHEDULE } from '@/utils/storage'

const MONDAY = new Date(2026, 9, 5) // 2026-10-05 周一，当月 22 个工作日

const base = (patch: Partial<SalarySettings>): SalarySettings => ({
  salaryType: 'monthly',
  salary: 15000,
  schedule: DEFAULT_SCHEDULE,
  ...patch,
})

describe('月薪计算', () => {
  it('月薪 15000 / 22 个工作日 ≈ 681.82 元/天', () => {
    expect(dailyPayFor(MONDAY, base({}))).toBeCloseTo(15000 / 22, 6)
  })

  it('秒薪 = 日薪 / 28800 ≈ 0.0236742，保留完整精度', () => {
    const perSecond = perSecondRateFor(MONDAY, base({}))
    expect(perSecond).toBeCloseTo(15000 / 22 / 28800, 10)
    // 展示层取 4 位小数
    expect(perSecond.toFixed(4)).toBe('0.0237')
  })

  it('干满一整天累计收入恰好等于日薪', () => {
    const perSecond = perSecondRateFor(MONDAY, base({}))
    expect(perSecond * 28800).toBeCloseTo(15000 / 22, 6)
  })
})

describe('年薪计算', () => {
  it('年薪 180000 等价于月薪 15000', () => {
    const yearly = dailyPayFor(MONDAY, base({ salaryType: 'yearly', salary: 180000 }))
    const monthly = dailyPayFor(MONDAY, base({ salaryType: 'monthly', salary: 15000 }))
    expect(yearly).toBeCloseTo(monthly, 10)
  })
})

describe('日薪计算', () => {
  it('日薪 500 元直接生效', () => {
    expect(dailyPayFor(MONDAY, base({ salaryType: 'daily', salary: 500 }))).toBe(500)
    expect(perSecondRateFor(MONDAY, base({ salaryType: 'daily', salary: 500 }))).toBeCloseTo(
      500 / 28800,
      10,
    )
  })
})

describe('时薪计算', () => {
  it('时薪 50 元 × 8 小时 = 日薪 400 元（午休不计薪）', () => {
    expect(dailyPayFor(MONDAY, base({ salaryType: 'hourly', salary: 50 }))).toBeCloseTo(400, 10)
    expect(perSecondRateFor(MONDAY, base({ salaryType: 'hourly', salary: 50 }))).toBeCloseTo(
      50 / 3600,
      10,
    )
  })
})

describe('异常输入安全处理', () => {
  it('工资为 0 / 负数 / NaN 时返回 0，绝不出现 NaN 或 Infinity', () => {
    for (const salary of [0, -1, Number.NaN]) {
      const snap = perSecondRateFor(MONDAY, base({ salary }))
      expect(Number.isFinite(snap)).toBe(true)
      expect(snap).toBe(0)
    }
  })

  it('非法作息（工作 0 秒）返回 0 而不是 Infinity', () => {
    const bad = {
      ...DEFAULT_SCHEDULE,
      overnight: false,
      startTime: '10:00',
      endTime: '10:00',
    }
    const v = perSecondRateFor(MONDAY, base({ schedule: bad }))
    expect(Number.isFinite(v)).toBe(true)
    expect(v).toBe(0)
  })
})
