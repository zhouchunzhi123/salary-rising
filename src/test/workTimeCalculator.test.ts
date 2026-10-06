import { describe, expect, it } from 'vitest'
import type { WorkSchedule } from '@/types'
import { buildTimeline, paidMsAt, validateSchedule } from '@/utils/workTimeCalculator'
import { countWorkdays } from '@/utils/time'
import { DEFAULT_SCHEDULE } from '@/utils/storage'

const MONDAY = new Date(2026, 9, 5) // 2026-10-05 周一

describe('工作时间轴 workTimeCalculator', () => {
  it('默认 09:00–18:00、午休 1 小时 → 每天工作 28800 秒（8 小时）', () => {
    const tl = buildTimeline(MONDAY, DEFAULT_SCHEDULE)
    expect(tl.totalWorkSeconds).toBe(28800)
    expect(tl.segments).toHaveLength(2)
    expect(tl.lunch).not.toBeNull()
  })

  it('不启用午休时 09:00–18:00 为 9 小时', () => {
    const s: WorkSchedule = { ...DEFAULT_SCHEDULE, lunchEnabled: false }
    expect(buildTimeline(MONDAY, s).totalWorkSeconds).toBe(9 * 3600)
    expect(buildTimeline(MONDAY, s).segments).toHaveLength(1)
  })

  it('跨夜班 22:00–次日 06:00 为 8 小时', () => {
    const s: WorkSchedule = {
      ...DEFAULT_SCHEDULE,
      startTime: '22:00',
      endTime: '06:00',
      overnight: true,
      lunchEnabled: false,
    }
    const tl = buildTimeline(MONDAY, s)
    expect(tl.totalWorkSeconds).toBe(8 * 3600)
    expect(tl.segments[0].end.getTime() - tl.segments[0].start.getTime()).toBe(8 * 3600 * 1000)
  })

  it('跨夜班的凌晨午休 02:00–03:00 被正确扣减', () => {
    const s: WorkSchedule = {
      startTime: '22:00',
      endTime: '06:00',
      overnight: true,
      lunchEnabled: true,
      lunchStart: '02:00',
      lunchEnd: '03:00',
      workdays: [1, 2, 3, 4, 5],
    }
    expect(buildTimeline(MONDAY, s).totalWorkSeconds).toBe(7 * 3600)
  })

  it('2026 年 10 月（周一到周五）共有 22 个工作日', () => {
    expect(countWorkdays(2026, 9, [1, 2, 3, 4, 5])).toBe(22)
  })

  it('2026-10-10 是周六，不计入工作日', () => {
    expect(countWorkdays(2026, 9, [1, 2, 3, 4, 5])).toBe(22)
    expect(new Date(2026, 9, 10).getDay()).toBe(6)
  })

  it('paidMsAt：上午 10:00 已计薪 1 小时', () => {
    const tl = buildTimeline(MONDAY, DEFAULT_SCHEDULE)
    const at10 = new Date(2026, 9, 5, 10, 0, 0).getTime()
    expect(paidMsAt(tl, at10) / 1000).toBe(3600)
  })

  it('paidMsAt：午休 12:30 计薪停在 3 小时，不继续增长', () => {
    const tl = buildTimeline(MONDAY, DEFAULT_SCHEDULE)
    const at1230 = new Date(2026, 9, 5, 12, 30, 0).getTime()
    expect(paidMsAt(tl, at1230) / 1000).toBe(3 * 3600)
  })

  it('paidMsAt：14:00 为上午 3h + 下午 1h = 4h', () => {
    const tl = buildTimeline(MONDAY, DEFAULT_SCHEDULE)
    const at14 = new Date(2026, 9, 5, 14, 0, 0).getTime()
    expect(paidMsAt(tl, at14) / 1000).toBe(4 * 3600)
  })
})

describe('作息校验 validateSchedule', () => {
  it('下班早于上班且未勾选跨夜 → 报错', () => {
    const issues = validateSchedule({ ...DEFAULT_SCHEDULE, startTime: '18:00', endTime: '09:00' })
    expect(issues.some((i) => i.field === 'endTime')).toBe(true)
  })

  it('没有选择任何工作日 → 报错', () => {
    const issues = validateSchedule({ ...DEFAULT_SCHEDULE, workdays: [] })
    expect(issues.some((i) => i.field === 'workdays')).toBe(true)
  })

  it('午休结束早于开始 → 报错', () => {
    const issues = validateSchedule({
      ...DEFAULT_SCHEDULE,
      lunchStart: '13:00',
      lunchEnd: '12:00',
    })
    expect(issues.some((i) => i.field === 'lunch')).toBe(true)
  })

  it('午休不在工作时间内 → 报错', () => {
    const issues = validateSchedule({
      ...DEFAULT_SCHEDULE,
      lunchStart: '18:30',
      lunchEnd: '19:00',
    })
    expect(issues.some((i) => i.field === 'lunch')).toBe(true)
  })

  it('默认作息零错误', () => {
    expect(validateSchedule(DEFAULT_SCHEDULE)).toHaveLength(0)
  })
})
