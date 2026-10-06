/**
 * 上线前边界测试 —— 覆盖工资计算、时间边界、周末、跨天、闰年、异常输入。
 * 仅用于审计，确认无问题后可保留或删除。
 */
import { describe, it, expect } from 'vitest'
import type { SalarySettings, WorkSchedule } from '@/types'
import { dailyPayFor, workdaysInMonth } from '@/utils/salaryCalculator'
import { buildTimeline, validateSchedule } from '@/utils/workTimeCalculator'
import { getDaySnapshot, resolveAnchorDate } from '@/utils/earningsEngine'
import { countWorkdays } from '@/utils/time'

const baseSched: WorkSchedule = {
  startTime: '09:00',
  endTime: '18:00',
  overnight: false,
  lunchEnabled: true,
  lunchStart: '12:00',
  lunchEnd: '13:00',
  workdays: [1, 2, 3, 4, 5],
}

function at(dateStr: string, time: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const min = parts[1] ?? 0
  const sec = parts[2] ?? 0
  return new Date(y, m - 1, d, h, min, sec, 0)
}

function mk(type: SalarySettings['salaryType'], salary: number, sched = baseSched): SalarySettings {
  return { salaryType: type, salary, schedule: sched }
}

describe('工资类型换算', () => {
  const oct2026 = new Date(2026, 9, 15) // 2026-10-15
  const workdays = workdaysInMonth(oct2026, baseSched.workdays)

  it('月薪 15000 → 日薪 = 15000 / 当月工作日', () => {
    const daily = dailyPayFor(oct2026, mk('monthly', 15000))
    expect(daily).toBeCloseTo(15000 / workdays, 6)
    expect(workdays).toBeGreaterThan(0)
  })

  it('年薪 180000 → 日薪 = (180000/12) / 当月工作日', () => {
    const daily = dailyPayFor(oct2026, mk('yearly', 180000))
    expect(daily).toBeCloseTo((180000 / 12) / workdays, 6)
  })

  it('日薪 500 → 日薪 = 500', () => {
    expect(dailyPayFor(oct2026, mk('daily', 500))).toBe(500)
  })

  it('时薪 × 当日实际工时（扣午休）', () => {
    const daily = dailyPayFor(oct2026, mk('hourly', 62.5))
    const tl = buildTimeline(oct2026, baseSched)
    const hours = tl.totalWorkSeconds / 3600
    expect(daily).toBeCloseTo(62.5 * hours, 6)
    expect(hours).toBeCloseTo(8, 1) // 9-18 扣 1h 午休 = 8h
  })

  it('月薪与年薪在同月薪下日薪一致', () => {
    const m = dailyPayFor(oct2026, mk('monthly', 15000))
    const y = dailyPayFor(oct2026, mk('yearly', 180000))
    expect(m).toBeCloseTo(y, 6)
  })
})

describe('工作日统计', () => {
  it('2026年10月 周一到周五 = 22 天', () => {
    expect(countWorkdays(2026, 9, [1, 2, 3, 4, 5])).toBe(22)
  })
  it('2026年2月 非闰年 = 28 天，周一到周五 = 20 天', () => {
    expect(countWorkdays(2026, 1, [1, 2, 3, 4, 5])).toBe(20)
  })
  it('2024年2月 闰年 = 29 天', () => {
    expect(new Date(2024, 2, 0).getDate()).toBe(29)
  })
  it('空工作日数组 = 0', () => {
    expect(countWorkdays(2026, 9, [])).toBe(0)
  })
})

describe('时间边界（上班前/午休/下班后）', () => {
  const sal = mk('monthly', 15000)

  it('08:59 before，已赚 0', () => {
    const s = getDaySnapshot(at('2026-10-15', '08:59'), sal)
    expect(s.status).toBe('before')
    expect(s.earned).toBe(0)
    expect(s.nextEventSeconds).toBeGreaterThan(0)
  })

  it('09:00 刚上班，working，已赚约 0', () => {
    const s = getDaySnapshot(at('2026-10-15', '09:00'), sal)
    expect(s.status).toBe('working')
    expect(s.earned).toBeLessThan(0.01)
  })

  it('09:01 working，已赚 > 0', () => {
    const s = getDaySnapshot(at('2026-10-15', '09:01'), sal)
    expect(s.status).toBe('working')
    expect(s.earned).toBeGreaterThan(0)
  })

  it('11:59 working，未到午休', () => {
    const s = getDaySnapshot(at('2026-10-15', '11:59'), sal)
    expect(s.status).toBe('working')
  })

  it('12:00 进入午休，status=lunch', () => {
    const s = getDaySnapshot(at('2026-10-15', '12:00'), sal)
    expect(s.status).toBe('lunch')
  })

  it('12:30 午休中，earned 不增长', () => {
    const s1 = getDaySnapshot(at('2026-10-15', '12:00'), sal)
    const s2 = getDaySnapshot(at('2026-10-15', '12:30'), sal)
    expect(s2.status).toBe('lunch')
    expect(s2.earned).toBeCloseTo(s1.earned, 6)
  })

  it('13:00 午休结束，恢复 working', () => {
    const s = getDaySnapshot(at('2026-10-15', '13:00'), sal)
    expect(s.status).toBe('working')
  })

  it('17:59 working', () => {
    expect(getDaySnapshot(at('2026-10-15', '17:59'), sal).status).toBe('working')
  })

  it('18:00 下班，status=after，earned = dailyPay', () => {
    const s = getDaySnapshot(at('2026-10-15', '18:00'), sal)
    expect(s.status).toBe('after')
    expect(s.earned).toBeCloseTo(s.dailyPay, 4)
  })

  it('18:01 after，earned 不再增长', () => {
    const s1 = getDaySnapshot(at('2026-10-15', '18:00'), sal)
    const s2 = getDaySnapshot(at('2026-10-15', '18:01'), sal)
    expect(s2.status).toBe('after')
    expect(s2.earned).toBeCloseTo(s1.earned, 6)
  })
})

describe('周末', () => {
  const sat = at('2026-10-17', '10:00') // 周六
  const sun = at('2026-10-18', '10:00') // 周日
  const sal = mk('monthly', 15000)

  it('周六 status=rest，earned=0', () => {
    const s = getDaySnapshot(sat, sal)
    expect(s.status).toBe('rest')
    expect(s.earned).toBe(0)
  })
  it('周日 status=rest', () => {
    expect(getDaySnapshot(sun, sal).status).toBe('rest')
  })
  it('工作日正常', () => {
    expect(getDaySnapshot(at('2026-10-15', '10:00'), sal).status).toBe('working')
  })
})

describe('实时金额 = 时间推导（核心原则）', () => {
  const sal = mk('monthly', 15000)
  const t0 = at('2026-10-15', '10:00')
  const t1 = at('2026-10-15', '10:00:10') // 10 秒后

  it('10 秒差值 ≈ 秒薪 × 10', () => {
    const s0 = getDaySnapshot(t0, sal)
    const s1 = getDaySnapshot(t1, sal)
    const diff = s1.earned - s0.earned
    const expected = s0.perSecond * 10
    expect(diff).toBeCloseTo(expected, 4)
  })
})

describe('异常输入不崩溃', () => {
  it('工资 0 → 日薪 0，秒薪 0，无 NaN/Infinity', () => {
    const s = getDaySnapshot(at('2026-10-15', '10:00'), mk('monthly', 0))
    expect(Number.isFinite(s.dailyPay)).toBe(true)
    expect(Number.isFinite(s.perSecond)).toBe(true)
    expect(s.earned).toBe(0)
  })

  it('工资负数 → 0', () => {
    const s = getDaySnapshot(at('2026-10-15', '10:00'), mk('monthly', -100))
    expect(s.dailyPay).toBe(0)
    expect(s.perSecond).toBe(0)
  })

  it('超大工资 → 有限值', () => {
    const s = getDaySnapshot(at('2026-10-15', '10:00'), mk('monthly', 999999999))
    expect(Number.isFinite(s.earned)).toBe(true)
  })
})

describe('工作时间异常校验', () => {
  it('上班 = 下班 → 报错', () => {
    const s = { ...baseSched, startTime: '09:00', endTime: '09:00' }
    expect(validateSchedule(s).length).toBeGreaterThan(0)
  })
  it('下班早于上班 → 报错', () => {
    const s = { ...baseSched, startTime: '18:00', endTime: '09:00' }
    expect(validateSchedule(s).length).toBeGreaterThan(0)
  })
  it('午休开始 > 午休结束 → 报错', () => {
    const s = { ...baseSched, lunchStart: '13:00', lunchEnd: '12:00' }
    expect(validateSchedule(s).length).toBeGreaterThan(0)
  })
  it('午休超出工作时间 → 报错', () => {
    const s = { ...baseSched, lunchStart: '08:00', lunchEnd: '09:00' }
    expect(validateSchedule(s).length).toBeGreaterThan(0)
  })
  it('无工作日 → 报错', () => {
    const s = { ...baseSched, workdays: [] }
    expect(validateSchedule(s).length).toBeGreaterThan(0)
  })
  it('合法配置 → 无报错', () => {
    expect(validateSchedule(baseSched)).toEqual([])
  })
})

describe('跨午夜（夜班）', () => {
  const night: WorkSchedule = {
    startTime: '22:00',
    endTime: '06:00',
    overnight: true,
    lunchEnabled: false,
    lunchStart: '00:00',
    lunchEnd: '00:00',
    workdays: [1, 2, 3, 4, 5],
  }
  const sal = mk('monthly', 15000, night)

  it('22:00 上班 working', () => {
    expect(getDaySnapshot(at('2026-10-15', '22:00'), sal).status).toBe('working')
  })
  it('次日 03:00 仍 working（归属前一天）', () => {
    const s = getDaySnapshot(at('2026-10-16', '03:00'), sal)
    expect(s.status).toBe('working')
  })
  it('次日 06:00 下班 after', () => {
    const s = getDaySnapshot(at('2026-10-16', '06:00'), sal)
    expect(s.status).toBe('after')
  })
  it('anchorDate 在凌晨时指向前一天', () => {
    const anchor = resolveAnchorDate(at('2026-10-16', '03:00'), night)
    expect(anchor.getDate()).toBe(15)
  })
})
